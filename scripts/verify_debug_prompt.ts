
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function run() {
    const rand = Math.floor(Math.random() * 10000);
    const email = `debug_test_${rand}@example.com`;
    const password = "password";

    console.log(`[VERIFY] 1. Auth as ${email}...`);
    const client = axios.create({ baseURL: BASE_URL, withCredentials: true });

    try {
        await client.post('/api/auth/register', { email, password, name: "Debug User" });
    } catch (e: any) {
        if (e.response?.status !== 400) throw e;
    }

    const loginRes = await client.post('/api/auth/login', { email, password });
    if (loginRes.headers['set-cookie']) {
        client.defaults.headers.Cookie = loginRes.headers['set-cookie'];
    }

    // Create Chat
    const chat = await client.post('/api/conversations', { title: "Debug Chat" });
    const chatId = chat.data.id;

    // TEST 1: FRIDAY MODE (Strict Persona Check)
    console.log("\n[VERIFY] 2. Sending FRIDAY command...");
    await client.post(`/api/conversations/${chatId}/messages`, {
        content: "/analyze Why is this test running?",
        model: "tinyllama"
    });

    // Check Debug Endpoint
    console.log("[VERIFY] 3. Inspecting /api/debug/prompt...");
    const debugRes = await client.get('/api/debug/prompt');
    const promptData = debugRes.data;

    console.log("--- DEBUG DATA RECEIVED ---");
    console.log("Mode:", promptData.mode);
    console.log("System Prompt Snippet:\n", promptData.system.substring(0, 200) + "...");

    if (promptData.mode !== "FRIDAY") {
        console.error("❌ FAILURE: Mode should be FRIDAY, got:", promptData.mode);
        process.exit(1);
    }

    if (!promptData.system.includes("IDENTITY:\nYou are F.R.I.D.A.Y.")) {
        console.error("❌ FAILURE: System Prompt missing FRIDAY Identity.");
        process.exit(1);
    }

    // TEST 2: DEFAULT JARVIS (Strict Ordering Check)
    console.log("\n[VERIFY] 4. Sending Normal Query (Jarvis Mode)...");
    await client.post(`/api/conversations/${chatId}/messages`, {
        content: "Who are you?",
        model: "tinyllama"
    });

    const debugRes2 = await client.get('/api/debug/prompt');
    const promptData2 = debugRes2.data;

    console.log("--- DEBUG DATA RECEIVED ---");
    console.log("Mode:", promptData2.mode);
    console.log("System Prompt Snippet:\n", promptData2.system.substring(0, 200) + "...");

    // Verify Ordering: Identity -> Constraints
    const identityIndex = promptData2.system.indexOf("You are JARVIS");
    const constraintsIndex = promptData2.system.indexOf("CORE RULES:");

    if (identityIndex === -1 || constraintsIndex === -1) {
        console.error("❌ FAILURE: Missing Identity or Core Rules.");
        process.exit(1);
    }

    if (identityIndex < constraintsIndex) {
        console.log("✅ SUCCESS: Identity appears BEFORE Constraints.");
    } else {
        console.error("❌ FAILURE: Ordering is wrong (Identity must be first).");
        process.exit(1);
    }

    console.log("\n✅✅✅ GLOBAL PROMPT SYSTEM VERIFIED ✅✅✅");
}

run().catch(e => {
    console.error("❌ FATAL:", e.message);
    if (e.response) console.error("Response:", e.response.data);
});
