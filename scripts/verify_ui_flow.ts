
import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api',
    validateStatus: () => true // Don't throw on error
});

async function runVirtualDemo() {
    console.log("=== VIRTUAL UI DEMO START ===");

    // 1. Auth
    const email = `demo_${Date.now()}@test.com`;
    console.log(`\n1. Registering user: ${email}`);
    await API.post('/auth/register', { email, password: 'password', name: 'Demo User' });

    // Login to get session cookie
    const loginRes = await API.post('/auth/login', { email, password: 'password' });
    const cookie = loginRes.headers['set-cookie'];
    if (!cookie) {
        console.error("Login failed (No cookie)");
        return;
    }
    const headers = { Cookie: cookie };
    console.log("   Login Successful.");

    // 2. Create Conversation
    console.log("\n2. Creating New Chat...");
    const convRes = await API.post('/conversations', { title: 'LiveFact Demo' }, { headers });
    const convId = convRes.data.id;
    console.log(`   Conversation ID: ${convId}`);

    // 3. Test Live Fact (The tricky part)
    console.log("\n3. User: 'Who is CEO of OpenAI?' (Expecting LiveFact)...");
    // Note: Actual UI streams, but we'll read the full response body (which is newline delimited chunks)
    const f1 = await API.post(`/conversations/${convId}/messages`, {
        content: "Who is CEO of OpenAI?",
        model: "auto"
    }, { headers });

    // Parse Chunked Response
    const raw1 = f1.data;
    // Last line usually contains the final response JSON if logic allows, 
    // but our route sends: { userMessage... }\n{ response: text }

    const chunks1 = typeof raw1 === 'string' ? raw1.trim().split('\n') : [JSON.stringify(raw1)];
    const lastChunk1 = chunks1[chunks1.length - 1];
    try {
        const json1 = JSON.parse(lastChunk1);
        console.log(`   AI Response: "${json1.response}"`);

        if (json1.response.includes("Sam Altman") && json1.response.length < 100) {
            console.log("   ✅ SUCCESS: Correct Answer & Concise (LiveFact Mode)");
        } else {
            console.log("   ⚠️ PARTIAL/FAIL: Answer might be from LLM or timeout?");
        }
    } catch (e) {
        console.log("   Raw Output:", raw1);
    }

    // 4. Test Normal Chat
    console.log("\n4. User: 'Hello' (Expecting TinyLlama)...");
    const f2 = await API.post(`/conversations/${convId}/messages`, {
        content: "Hello",
        model: "auto"
    }, { headers });

    const raw2 = f2.data;
    const chunks2 = typeof raw2 === 'string' ? raw2.trim().split('\n') : [JSON.stringify(raw2)];
    const lastChunk2 = chunks2[chunks2.length - 1];
    try {
        const json2 = JSON.parse(lastChunk2);
        console.log(`   AI Response: "${json2.response}"`);
    } catch (e) {
        console.log("   Raw Output:", raw2);
    }

    console.log("\n=== VIRTUAL DEMO COMPLETE ===");
}

runVirtualDemo();
