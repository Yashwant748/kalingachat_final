
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log('=== TXT RAG Verification Test ===');

    const txtPath = path.join(process.cwd(), 'test_doc.txt');
    const content = "This is a simple text file validation. The secret code is 7777.";

    try {
        fs.writeFileSync(txtPath, content);
        console.log('[1] TXT created successfully.');
    } catch (err) {
        console.error('Failed to generate TXT:', err);
        process.exit(1);
    }

    try {
        const form = new FormData();
        const fileBuffer = fs.readFileSync(txtPath);
        form.append('file', fileBuffer, { filename: 'test_doc.txt', contentType: 'text/plain' });

        console.log('[2] Uploading TXT...');
        const uploadRes = await axios.post(`${API_URL}/rag/upload`, form, {
            headers: { ...form.getHeaders() },
        });
        console.log('Upload Result:', JSON.stringify(uploadRes.data, null, 2));
    } catch (err: any) {
        console.error('Upload Failed:', err.response?.data || err.message);
        process.exit(1);
    }

    // Cleanup
    if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
}

runTest();
