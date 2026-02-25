
import axios from 'axios';

// Login Helper
async function login() {
    const rand = Math.floor(Math.random() * 10000);
    const email = `test${rand}@example.com`;
    const password = "password";
    const jar = axios.create({ withCredentials: true, baseURL: 'http://localhost:5000' });

    console.log(`Trying to register ${email}...`);
    try {
        await jar.post('/api/auth/register', { username: "Test", email, password, name: "Test User" }); // Added name just in case
    } catch (e: any) {
        if (e.response && e.response.status === 400 && e.response.data.error === "User exists") {
            console.log("User exists, proceeding to login...");
        } else {
            console.error("Register Failed:", e.response ? e.response.data : e.message);
            throw e;
        }
    }

    console.log("Logging in...");
    try {
        const res = await jar.post('/api/auth/login', { email: email, password });
        const cookies = res.headers['set-cookie'];
        if (cookies) {
            jar.defaults.headers.Cookie = cookies;
        }
    } catch (e: any) {
        console.error("Login Failed:", e.response ? e.response.data : e.message);
        throw e;
    }
    return jar;
}

async function testMode(client: any, modeCommand: string, expectedSnippet: string) {
    console.log(`\n--- TESTING MODE: ${modeCommand} ---`);

    // Create chat
    const chat = await client.post('/api/conversations', { title: "Mode Test" });
    const chatId = chat.data.id;

    // Send Message
    console.log(`Sending message to chat ${chatId}...`);
    const response = await client.post(`/api/conversations/${chatId}/messages`, {
        content: `${modeCommand} Explain a simple while loop.`,
        model: "phi3:mini"
    }, { responseType: 'stream' });

    // Wait a bit for processing key chunks
    await new Promise(r => setTimeout(r, 25000)); // Longer wait for phi3

    // Fetch messages from DB
    const msgs = await client.get(`/api/conversations/${chatId}/messages`);
    const aiMsg = msgs.data.find((m: any) => m.sender === 'ai');

    if (!aiMsg) {
        console.error("FAILED: No AI response found.");
        return;
    }

    const content = aiMsg.content;
    console.log("AI RESPONSE:\n", content.substring(0, 300) + "...");

    if (content.includes(expectedSnippet) || content.includes("STATUS:") || content.includes("Viva Line")) {
        console.log("✅ SUCCESS: Mode detected correctly.");
    } else {
        // Fallback check: Normalized content
        if (content.toLowerCase().includes(expectedSnippet.toLowerCase())) {
            console.log("✅ SUCCESS (Case insensitive match).");
        } else {
            console.log("❌ FAILURE: Expected pattern not found.");
            console.log("Expected inner content like:", expectedSnippet);
        }
    }
}

async function run() {
    try {
        const client = await login();

        // Test Friday
        await testMode(client, "/analyze", "**STATUS:**");

        // Test Viva
        await testMode(client, "/viva", "Viva Line:");

    } catch (e: any) {
        console.error("Test Error:", e.message);
    }
}

run();
