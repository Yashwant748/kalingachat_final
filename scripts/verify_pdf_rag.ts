
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function runTest() {
    console.log('=== PDF RAG Verification Test (pdf-lib) ===');

    const secretCode = '8888';
    const pdfPath = path.join(process.cwd(), 'secret_test.pdf');

    try {
        console.log('[1] Generating test PDF...');
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const longText = `CONFIDENTIAL: The secret code is ${secretCode}. 
    This document contains important sensitive information that must be protected.
    We are testing the RAG system to ensure it can read PDF files correctly.
    The minimum chunk size is 50 characters, so this text must be long enough.
    Here is some more filler text to guarantee we generate at least one valid chunk for the vector database.`;

        page.drawText(longText, {
            x: 50,
            y: 700,
            size: 12,
            font,
            color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, pdfBytes);
        console.log('[1] PDF created successfully.');
    } catch (err) {
        console.error('Failed to generate PDF:', err);
        process.exit(1);
    }

    try {
        const form = new FormData();
        const fileBuffer = fs.readFileSync(pdfPath);
        form.append('file', fileBuffer, { filename: 'secret_test.pdf', contentType: 'application/pdf' });

        console.log('[2] Uploading PDF...');
        const uploadRes = await axios.post(`${API_URL}/rag/upload`, form, {
            headers: { ...form.getHeaders() },
        });
        console.log('Upload Result:', JSON.stringify(uploadRes.data, null, 2));
    } catch (err: any) {
        console.error('Upload Failed:', err.response?.data || err.message);
        process.exit(1);
    }

    try {
        console.log('[3] Querying RAG...');
        const query = 'What is the secret code?';
        await new Promise(r => setTimeout(r, 1000));

        const queryRes = await axios.post(`${API_URL}/rag/query`, { query });

        const results = queryRes.data;
        console.log(`Found ${results.length} chunks.`);

        const found = results.some((r: any) => r.chunk.text.includes(secretCode));

        if (found) {
            console.log(`SUCCESS: Found secret code "${secretCode}" in RAG results.`);
        } else {
            console.error('FAILURE: Secret code not found in RAG results.');
            if (results.length > 0) console.log('Top match:', results[0]?.chunk?.text);
        }
    } catch (err: any) {
        console.error('Query Failed:', err.response?.data || err.message);
    }

    // Cleanup
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
}

runTest();
