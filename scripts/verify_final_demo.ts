
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const API_URL = 'http://localhost:5000/api';

async function runFinalDemo() {
    console.log('=== KalingaAI Final Demo Verification ===\n');

    // 1. Ensure RAG Test File Exists
    const txtPath = path.join(process.cwd(), 'rag_test.txt');
    if (!fs.existsSync(txtPath)) {
        fs.writeFileSync(txtPath, "This is a confidential test document for KalingaAI RAG verification.\nThe project code is KalingaChat-2025.\nThe secret number is 4321.\nDo not share this with unauthorized users.");
    }

    // 2. Upload RAG Document
    console.log('[TEST 1] RAG Mode: Uploading Document...');
    const form = new FormData();
    form.append('file', fs.readFileSync(txtPath), { filename: 'rag_test.txt', contentType: 'text/plain' });

    try {
        const uploadRes = await axios.post(`${API_URL}/rag/upload`, form, { headers: { ...form.getHeaders() } });
        console.log(`✅ Upload Success: ${uploadRes.data.message}`);
    } catch (e: any) {
        console.error('❌ Upload Failed:', e.message);
        process.exit(1);
    }

    // 3. Query RAG (Verify Secret Code)
    console.log('\n[TEST 1.1] RAG Mode: Asking for Secret Code...');
    try {
        const query = "Tell me the secret number in the document";
        const ragRes = await axios.post(`${API_URL}/rag/query`, { query });
        const topChunk = ragRes.data[0]?.chunk?.text || "";
        console.log(`Retrieved Context: "${topChunk.trim()}"`);

        if (topChunk.includes('4321')) {
            console.log('✅ PASS: Retrieved secret number 4321');
        } else {
            console.error('❌ FAIL: Did not retrieve secret number');
        }
    } catch (e: any) { console.error('RAG Query Error:', e.message); }

    // 4. Test Live Facts Logic (Mirrors Server Logic)
    async function checkWiki(q: string, expected: string): Promise<void> {
        try {
            console.log(`   Asking Server: "${q}"...`);
            const res = await axios.post(`${API_URL}/test/live-fact`, {
                query: q
            });

            const answer = res.data.answer || "";
            // console.log(`   Server Answer: "${answer.substring(0, 100)}..."`);

            if (answer.toLowerCase().includes(expected.toLowerCase().split(' ')[0])) {
                console.log(`✅ PASS: Server responded with "${expected}"`);
            } else {
                console.log(`⚠️ WARN: Server response did not contain "${expected}"`);
                console.log(`   Full Response: "${answer.trim()}"`);
            }
        } catch (e: any) {
            console.error(`❌ FAIL: Server API Error`, e.message);
        }
    }

    // 5. Run Live Fact Tests
    console.log('\n[TEST 2] Live Fact: President of India...');
    await checkWiki("Who is the President of India", "Droupadi Murmu");

    console.log('\n[TEST 3] Live Fact: Prime Minister of India...');
    await checkWiki("Who is the Prime Minister of India", "Narendra Modi");

    console.log('\n[TEST 4] Live Fact: CM of Chhattisgarh...');
    await checkWiki("Who is the Chief Minister of Chhattisgarh", "Vishnu Deo Sai");

    console.log('\n=== Verification Complete ===');
}

runFinalDemo();
