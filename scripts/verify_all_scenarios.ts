
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const API_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log('=== KalingaAI Full Validation Test ===');

    // 1. Upload RAG Document
    console.log('\n[TEST 1] Uploading RAG Document (rag_test.txt)...');
    const txtPath = path.join(process.cwd(), 'rag_test.txt');
    const form = new FormData();
    form.append('file', fs.readFileSync(txtPath), { filename: 'rag_test.txt', contentType: 'text/plain' });

    try {
        const uploadRes = await axios.post(`${API_URL}/rag/upload`, form, { headers: { ...form.getHeaders() } });
        console.log('Upload Success:', uploadRes.data.message);
    } catch (e: any) {
        console.error('Upload Failed:', e.message);
        process.exit(1);
    }

    // Helper to send chat message (simulating logged-in user is hard via script without auth, 
    // so we will reuse the /rag/query for RAG check and rely on unit-test style checks for Router 
    // OR we can hack a "router verification" log in the backend).

    // Since verifying the CHAT response requires Auth + Streaming parsing in the script, 
    // let's verify the components:

    // 2. Verify RAG Search returns the secret code
    console.log('\n[TEST 2] Verifying RAG Retrieval...');
    try {
        const query = "What is the secret number?";
        const ragRes = await axios.post(`${API_URL}/rag/query`, { query });
        console.log('RAG Best Match:', ragRes.data[0]?.chunk?.text.trim());

        if (ragRes.data[0]?.chunk?.text.includes('4321')) {
            console.log('✅ PASS: RAG retrieved secret code 4321');
        } else {
            console.error('❌ FAIL: RAG did not retrieve code');
        }
    } catch (e: any) { console.error('RAG Query Error:', e.message); }

    console.log('\n[TEST 3] Manual Check Required for Live Facts');
    console.log('Please check server logs for "[Router] Live Fact Triggered" when testing in UI.');

    // Clean up
    if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
}

runTest();
