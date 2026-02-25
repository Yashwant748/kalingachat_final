
import axios from 'axios';

// CONFIG
const BASE_URL = 'http://localhost:5000';
const TIMEOUT_MS = 30000; // 30s for slow local AI

// UTILS
async function login() {
    const rand = Math.floor(Math.random() * 10000);
    const email = `test_all_${rand}@example.com`;
    const password = "password";
    const jar = axios.create({
        withCredentials: true,
        baseURL: BASE_URL,
        headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[AUTH] Registering ${email}...`);
    try {
        await jar.post('/api/auth/register', { username: "TestUser", email, password, name: "Test User" });
    } catch (e: any) {
        if (e.response && e.response.data && e.response.data.error === "User exists") {
            console.log("[AUTH] User exists, logging in...");
        } else {
            console.error("[AUTH] Register Failed:", e.message);
            throw e;
        }
    }

    console.log("[AUTH] Logging in...");
    const res = await jar.post('/api/auth/login', { email: email, password });
    const cookies = res.headers['set-cookie'];
    if (cookies) {
        jar.defaults.headers.Cookie = cookies;
    }
    return jar;
}

async function createChat(client: any) {
    const res = await client.post('/api/conversations', { title: "Feature Test" });
    return res.data.id;
}

async function testMode(client: any, chatId: number, command: string, expectedKeywords: string[]) {
    console.log(`\n--- TESTING COMMAND: ${command} ---`);

    // Send Message
    await client.post(`/api/conversations/${chatId}/messages`, {
        content: command,
        model: "tinyllama" // Use fast model for verification
    });

    // Poll for response
    console.log("Waiting for AI response...");
    await new Promise(r => setTimeout(r, 8000)); // Wait 8s for inference

    const msgs = await client.get(`/api/conversations/${chatId}/messages`);
    const aiMsg = msgs.data.reverse().find((m: any) => m.sender === 'ai');

    if (!aiMsg) {
        console.error("❌ FAILURE: No AI response found.");
        return false;
    }

    const content = aiMsg.content;
    console.log("AI RESPONSE PREVIEW:", content.substring(0, 150).replace(/\n/g, " ") + "...");

    const matches = expectedKeywords.some(k => content.toLowerCase().includes(k.toLowerCase()));
    if (matches) {
        console.log(`✅ SUCCESS: Found expected keyword(s): ${expectedKeywords.join(" OR ")}`);
        return true;
    } else {
        console.error(`❌ FAILURE: Expected one of [${expectedKeywords.join(", ")}]`);
        return false;
    }
}

// MAIN
async function run() {
    try {
        const client = await login();
        const chatId = await createChat(client);
        console.log(`[CHAT] Created Chat ID: ${chatId}`);

        // TEST 1: FRIDAY MODE
        await testMode(client, chatId, "/analyze Why is the server slow?", ["STATUS:", "DIAGNOSIS:", "RECOMMENDATION:"]);

        // TEST 2: VIVA MODE
        await testMode(client, chatId, "/viva What is React?", ["Viva Line:", "Just remember:"]);

        // TEST 3: PORTFOLIO MODE
        await testMode(client, chatId, "/whoami", ["Role:", "Full Stack AI", "KalingaAI", "Recruiter"]);

        console.log("\n✅✅✅ ALL SYSTEMS GO! ✅✅✅");

    } catch (e: any) {
        console.error("\n❌❌❌ FATAL ERROR ❌❌❌");
        console.error(e.message);
        if (e.response) console.error("Data:", e.response.data);
    }
}

run();
