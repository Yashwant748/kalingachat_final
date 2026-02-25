
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000/api';

async function testLiveFact(question: string, expectedPart: string) {
    console.log(`\n--- Testing: "${question}" ---`);
    try {
        const start = Date.now();
        const res = await axios.post(`${BASE_URL}/conversations/1/messages`, {
            content: question
        }, {
            headers: {
                // Simulate login if needed, or assuming dev environment allows it or simple bypass.
                // Actually routes.ts requires auth locally?? 
                // Wait, verify_improvements.ts is running outside browser context.
                // We need to bypass auth or use a test route.
                // But wait, the user instructions said "Do not remove features".
                // We can't easily bypass auth without a valid cookie.
                // BUT, routes.ts has a 'test/live-fact' route!
                // Let's use that for Live Facts logic verification.
            }
        });
        // Wait, 'test/live-fact' is a public route created in step 7 (line 158).
        // Reuse it? No, step 7 showed it was already there?
        // Let's check line 158 of routes.ts. Yes, it exists!
        // But for full end-to-end chat, we need authentication.

        // Let's rely on the UNIT TEST logic for Live Facts Service directly if we can,
        // OR better, since I am in "server" context essentially, I can import the service?
        // No, I should test via HTTP to be real.

        // Let's try to login first.
    } catch (e) {
        // console.error(e);
    }
}

// Let's write a script that imports the service directly to test logic quickly, 
// AND uses the /test/live-fact route which is public (lines 158 in routes.ts).
// "router.post('/test/live-fact'..."
// This is perfect for verifying the SERVICE logic.

async function runTests() {
    console.log("=== STARTING VERIFICATION ===");

    // 1. Live Fact Tests (Logic)
    const questions = [
        { q: "Who is the current President of India?", expect: "Droupadi Murmu" },
        { q: "Who is the current Prime Minister of India?", expect: "Narendra Modi" },
        { q: "Who is the Chief Minister of Chhattisgarh?", expect: "Vishnu Deo Sai" }
    ];

    for (const item of questions) {
        console.log(`\n[TEST] Question: ${item.q}`);
        const start = Date.now();
        try {
            const res = await axios.post(`${BASE_URL}/test/live-fact`, { query: item.q });
            const answer = res.data.answer;
            const duration = Date.now() - start;
            console.log(`[RESULT] Time: ${duration}ms`);
            console.log(`[OUTPUT] ${answer.substring(0, 150)}...`);

            if (answer.includes(item.expect)) {
                console.log("✅ PASS");
            } else {
                console.log(`❌ FAIL (Expected '${item.expect}')`);
            }
        } catch (e: any) {
            console.log(`❌ FAIL (Error: ${e.message})`);
        }
    }

    // 2. Cache Speed Test
    console.log(`\n[TEST] Caching Speed Test (repeating PM question)`);
    const q = "Who is the current Prime Minister of India?";
    try {
        const start1 = Date.now();
        await axios.post(`${BASE_URL}/test/live-fact`, { query: q });
        const time1 = Date.now() - start1;
        console.log(`1st Call: ${time1}ms`);

        const start2 = Date.now();
        await axios.post(`${BASE_URL}/test/live-fact`, { query: q });
        const time2 = Date.now() - start2;
        console.log(`2nd Call (Cached): ${time2}ms`);

        if (time2 < time1 / 2 || time2 < 500) {
            console.log("✅ PASS (Significant speedup)");
        } else {
            console.log("⚠️ WARNING (Cache might not be working or network overhead)");
        }
    } catch (e) { }


    // 3. RAG Test (End-to-End requires Auth)
    // We cannot easily test RAG without Auth.
    // However, we can create a temporary public route for RAG testing to be sure?
    // Or we simply check if 'ragService' imports correctly and test it directly in this script
    // by importing the service? 
    // Since this is a TS file, we can import `ragService`.
}

// Wrapper to run via tsx
// We will modify this to be a standalone TS script that imports the services directly 
// for RAG, as HTTP is harder without login.
// But for Live Facts, HTTP is fine via the test route.
// Let's actually just import everything and test internally to avoid server dependency issues
// (like if server is not running).
// Wait, I am an AI, I can assume the server IS running or I should start it.
// PRO TIP: Testing services directly is more robust for me right now.

import { liveFactsService } from './server/services/liveFacts';
import { ragService } from './server/rag';

async function internalTest() {
    console.log("=== INTERNAL SERVICE VERIFICATION ===");

    // A) LIVE FACTS
    const facts = [
        { q: "Who is the current President of India?", expect: "Droupadi Murmu" },
        { q: "Who is the current Prime Minister of India?", expect: "Narendra Modi" },
        { q: "Who is the Chief Minister of Chhattisgarh?", expect: "Vishnu Deo Sai" }
    ];

    for (const f of facts) {
        const start = Date.now();
        const ans = await liveFactsService.getFact(f.q);
        const time = Date.now() - start;
        console.log(`Q: ${f.q}`);
        console.log(`A: ${ans?.split('\n')[0]}...`); // Show first line
        console.log(`Time: ${time}ms`);
        if (ans && ans.includes(f.expect)) console.log("✅ PASS");
        else console.log(`❌ FAIL (Expected ${f.expect})`);
    }

    // B) CACHE CHECK
    console.log("\nChecking Cache...");
    const startC = Date.now();
    await liveFactsService.getFact("Who is the current Prime Minister of India?");
    const timeC = Date.now() - startC;
    console.log(`Cached Time: ${timeC}ms`);
    if (timeC < 100) console.log("✅ PASS (Instant)");
    else console.log("⚠️ SLOW CACHE?");

    // C) RAG TEST
    console.log("\nC) RAG TEST");
    // Create a dummy buffer
    const dummyText = "My secret number is 4321. The password is BLUE.";
    const buffer = Buffer.from(dummyText, 'utf-8');

    try {
        await ragService.addDocument(buffer, "test_secret.txt", "text/plain");
        console.log("Document added.");

        // Query specific
        const res = await ragService.search("What is the secret number?", 3);
        // Note: added threshold 0.4.

        if (res.length > 0 && res[0].chunk.text.includes("4321")) {
            console.log("✅ PASS: Retrieved 4321");
            console.log(`Snippet: ${res[0].chunk.text}`);
            console.log(`Similarity: ${res[0].similarity}`);
        } else {
            console.log("❌ FAIL: Did not retrieve secret number.");
            console.log(JSON.stringify(res, null, 2));
        }

        // Query garbage
        const res2 = await ragService.search("Who is the king of mars?", 3);
        if (res2.length === 0) {
            console.log("✅ PASS: Garbage query returned 0 results (Strictness works)");
        } else {
            console.log("⚠️ WARNING: Garbage query returned results (Strictness loose?)");
            console.log(JSON.stringify(res2, null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}

internalTest();
