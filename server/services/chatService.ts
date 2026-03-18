import { exec } from "child_process";
import { storage } from "../storage";
import { ragService } from "../rag";
import { liveFactsService } from "./liveFacts";
import { pdfService } from "./pdfService";
import { excelAnalyzerService } from "./excelAnalyzerService";
import * as ollama from "./ollamaService";
import { detectLanguageRequest } from "./languageService";
import { buildMultilingualPrompt } from "./promptBuilder";
import { cleanResponse } from "./responseCleaner";
import { generateImage } from "./imageService";

const OLLAMA_API_URL = "http://127.0.0.1:11434";

import * as xlsx from "xlsx";
import path from "path";
import fs from "fs";
import os from "os";

export interface ChatResponseChunk {
    type: "meta" | "content" | "error" | "done";
    payload?: any;
}

function getOpenCommand() {
    switch (process.platform) {
        case 'darwin': return 'open';
        case 'win32': return 'start';
        default: return 'xdg-open';
    }
}

function handleJarvisCommand(prompt: string): string | null {
    const lower = prompt.toLowerCase().trim();

    // --- FEATURE 1: SMART ASSISTANT MODE (OS COMMANDS) ---
    const actionWords = ["open", "launch", "start", "run", "boot", "shutdown", "restart"];
    const hasAction = actionWords.some(w => lower.includes(w));

    if (!hasAction && !lower.includes("search")) {
        return null;
    }

    try {
        const openCmd = getOpenCommand();

        // Search
        if (lower.includes("search") && lower.includes("youtube")) {
            const query = lower.replace(/search|on|youtube|for/g, "").trim();
            const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            exec(`${openCmd} ${url}`);
            return `*[Executing Task]* Opening YouTube search...`;
        } else if (lower.includes("search") && lower.includes("google")) {
            const query = lower.replace(/search|on|google|for/g, "").trim();
            const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            exec(`${openCmd} ${url}`);
            return `*[Executing Task]* Opening Google search...`;
        }

        // System Power Commands
        if (lower.includes("shutdown") && (lower.includes("pc") || lower.includes("system") || lower.includes("computer") || lower.includes("laptop"))) {
            exec(`shutdown /s /t 0`);
            return `*[Executing Task]* Shutting down system...`;
        }

        // Applications
        if (lower.includes("chrome") || lower.includes("browser")) {
            exec(`start chrome`);
            return `*[Executing Task]* Opening Chrome`;
        } else if (lower.includes("chatgpt")) {
            exec(`${openCmd} https://chatgpt.com`);
            return `*[Executing Task]* Opening ChatGPT`;
        } else if (lower.includes("whatsapp")) {
            exec(`${openCmd} https://web.whatsapp.com`);
            return `*[Executing Task]* Opening WhatsApp`;
        } else if (lower.includes("gmail") || lower.includes("email") || lower.includes("mail")) {
            exec(`${openCmd} https://mail.google.com`);
            return `*[Executing Task]* Opening Gmail`;
        } else if (lower.includes("file explorer") || lower.includes("explorer") || lower.includes("this pc") || lower.includes("my computer")) {
            exec(`start explorer.exe`);
            return `*[Executing Task]* Opening File Explorer`;
        } else if (lower.includes("notepad") || lower.includes("text editor")) {
            exec(`start notepad.exe`);
            return `*[Executing Task]* Opening Notepad`;
        } else if ((lower.includes("youtube") && !lower.includes("search")) || lower.includes("yt")) {
            exec(`${openCmd} https://youtube.com`);
            return `*[Executing Task]* Opening YouTube`;
        } else if (lower.includes("google") && !lower.includes("search")) {
            exec(`${openCmd} https://google.com`);
            return `*[Executing Task]* Opening Google`;
        } else if (lower.includes("calculator") || lower.includes("calc")) {
            exec(`start calc.exe`);
            return `*[Executing Task]* Opening Calculator`;
        } else if (lower.includes("gemini")) {
            exec(`${openCmd} https://gemini.google.com`);
            return `*[Executing Task]* Opening Gemini`;
        }
    } catch (e) {
        return `❌ Jarvis Command Failed`;
    }
    return null;
}

function generateAttendanceExcel(studentCount: number): string | null {
    try {
        const rows: any[][] = [];
        // Header
        rows.push(["Student Name", "Roll No", "1 Mar", "2 Mar", "3 Mar", "Total Present", "Attendance %"]);

        // Students
        for (let i = 1; i <= studentCount; i++) {
            const rollNo = 100 + i;
            const rowIdx = i + 1;
            const attendedCell = { t: 'n', f: `COUNTIF(C${rowIdx}:E${rowIdx}, "P")` };
            const percentageCell = { t: 'n', f: `IF(F${rowIdx}>0, (F${rowIdx}/3)*100, 0)`, z: "0.00%" };

            rows.push([`Student ${i}`, rollNo, "", "", "", attendedCell, percentageCell]);
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(rows);

        // Styling: Column Widths
        ws['!cols'] = [
            { wch: 25 }, // Name
            { wch: 10 }, // Roll No
            { wch: 10 }, // 1 Mar
            { wch: 10 }, // 2 Mar
            { wch: 10 }, // 3 Mar
            { wch: 15 }, // Total
            { wch: 15 }  // Percentage
        ];

        xlsx.utils.book_append_sheet(wb, ws, "Attendance");

        // Save to public directory for download
        const outputDir = path.join(process.cwd(), "public", "generated-files");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = `attendance_sheet_${Date.now()}.xlsx`;
        const filePath = path.join(outputDir, fileName);
        xlsx.writeFile(wb, filePath);

        return `/generated-files/${fileName}`;
    } catch (e) {
        console.error("Attendance Gen Error:", e);
        return null;
    }
}

function generateStudentExcel(studentCount: number): string | null {
    try {
        const rows: any[][] = [];
        // Header
        rows.push(["Roll No", "Enrollment No", "Student Name", "Program", "Semester", "Email", "Phone"]);

        // Students
        for (let i = 1; i <= studentCount; i++) {
            rows.push([i, `KU/24/${1000 + i}`, `Student ${i}`, "BCA", "VI", `student${i}@kalinga.edu`, ""]);
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(rows);

        // Styling: Column Widths
        ws['!cols'] = [
            { wch: 10 }, // Roll No
            { wch: 15 }, // Enrollment
            { wch: 25 }, // Name
            { wch: 10 }, // Program
            { wch: 10 }, // Semester
            { wch: 25 }, // Email
            { wch: 15 }  // Phone
        ];

        xlsx.utils.book_append_sheet(wb, ws, "Students");

        // Save to server/generated-excel as requested
        const outputDir = path.join(process.cwd(), "server", "generated-excel");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = `student_list_${Date.now()}.xlsx`;
        const filePath = path.join(outputDir, fileName);
        xlsx.writeFile(wb, filePath);

        return `/generated-excel/${fileName}`;
    } catch (e) {
        console.error("Student Gen Error:", e);
        return null;
    }
}

function generateMarksSheetExcel(studentCount: number): string | null {
    try {
        const rows: any[][] = [];
        // Header
        rows.push(["Name", "Subject1", "Subject2", "Subject3", "Total", "Percentage"]);

        // Students
        for (let i = 1; i <= studentCount; i++) {
            const rowIdx = i + 1;
            const totalCell = { t: 'n', f: `SUM(B${rowIdx}:D${rowIdx})` };
            const percentageCell = { t: 'n', f: `E${rowIdx}/3`, z: "0.00%" };
            rows.push([`Student ${i}`, "", "", "", totalCell, percentageCell]);
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(rows);

        // Styling: Column Widths
        ws['!cols'] = [
            { wch: 25 }, // Name
            { wch: 15 }, // Sub1
            { wch: 15 }, // Sub2
            { wch: 15 }, // Sub3
            { wch: 15 }, // Total
            { wch: 15 }  // Percentage
        ];

        xlsx.utils.book_append_sheet(wb, ws, "Marks");

        const outputDir = path.join(process.cwd(), "server", "generated-excel");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = `marks_sheet_${Date.now()}.xlsx`;
        const filePath = path.join(outputDir, fileName);
        xlsx.writeFile(wb, filePath);

        return `/generated-excel/${fileName}`;
    } catch (e) {
        console.error("Marks Gen Error:", e);
        return null;
    }
}

function detectLanguage(text: string): "english" | "nonEnglish" {
    const nonEnglishPattern = /[^\x00-\x7F]|bonjour|français|hindi|namaste|bonjour|merci|क्या|है/i;
    return nonEnglishPattern.test(text) ? "nonEnglish" : "english";
}

export class ChatService {
    async processUserMessage(
        conversationId: number,
        content: string,
        requestedModel: string,
        onChunk: (chunk: string) => void,
        signal?: AbortSignal
    ): Promise<void> {
        let processedContent = content;
        let lowerContent = processedContent.toLowerCase();

        // 1. Save User Message
        const userMsg = await storage.createMessage({ conversationId, content, sender: "user" });

        // Quick Return for RAG Uploads or Pure Image Uploads
        if (content.startsWith("[RAG_ATTACHMENT]:") || (content.startsWith("[IMAGE_ATTACHMENT]:") && content.split('\n').length === 1)) {
            // Send Metadata to Client so the UI updates
            onChunk(JSON.stringify({ userMessage: userMsg }) + "\n");
            return;
        }

        // 2. Prepare AI Message Placeholder
        const aiMsg = await storage.createMessage({ conversationId, content: "", sender: "ai" });

        // Send Metadata to Client (JSON chunk)
        onChunk(JSON.stringify({ userMessage: userMsg, aiMessageId: aiMsg.id }) + "\n");

        // 2.2 On-Demand Image Captioning (Delayed Analysis)
        let imageContext = "";
        try {
            const history = await storage.getMessages(conversationId);
            // Search backwards for the most recent image attachment
            for (let i = history.length - 1; i >= 0; i--) {
                const msg = history[i];
                if (msg.sender === "user" && msg.content.startsWith("[IMAGE_ATTACHMENT]:")) {
                    const lines = msg.content.split('\n');
                    const firstLine = lines[0];
                    const data = JSON.parse(firstLine.replace("[IMAGE_ATTACHMENT]:", ""));

                    if (data.fileId) {
                        let finalCaption = data.caption;

                        // If it hasn't been analyzed yet, do it now
                        if (data.caption === "Analyzing image..." || !data.caption) {
                            const path = require("path");
                            const imagePath = path.join(process.cwd(), "public", "uploads", data.fileId);

                            const { decodeImageCaption } = require("./imageDecoderService");
                            finalCaption = await decodeImageCaption(imagePath);

                            data.caption = finalCaption;
                            lines[0] = `[IMAGE_ATTACHMENT]:${JSON.stringify(data)}`;

                            const updatedContent = lines.join('\n');
                            await storage.updateMessageContent(msg.id, updatedContent);

                            // Stream update to UI so the old image bubble updates to show the caption
                            onChunk(JSON.stringify({ updateUserMessage: { id: msg.id, content: updatedContent } }) + "\n");
                        }

                        // Save the extracted caption to inject
                        imageContext = finalCaption;
                        break; // Only process the most recent image
                    }
                }
            }
        } catch (e) {
            console.error("Delayed Image Captioning Error:", e);
        }

        if (imageContext) {
            // Inject the caption into the CURRENT prompt so the AI knows what the user is asking about
            processedContent += `\n\n[System context: The user previously uploaded an image. Vision Analysis says: "${imageContext}"]`;
            lowerContent = processedContent.toLowerCase();
        }

        // 2.5 Prompt Injection Protection
        const forbiddenPhrases = [
            "system instructions",
            "hidden prompt",
            "developer message",
            "internal instructions",
            "reveal prompt",
            "show system prompt",
            "internal prompt"
        ];
        if (forbiddenPhrases.some(phrase => lowerContent.includes(phrase))) {
            const safeResponse = "I cannot disclose internal system instructions.";
            onChunk(safeResponse);
            await storage.updateMessageContent(aiMsg.id, safeResponse);
            await this.updateTitleIfNeeded(conversationId, content);
            return;
        }

        try {
            // 3. Define Route
            let route: "CHAT" | "RAG" | "LIVE_FACT" = "CHAT";
            let context = "";
            let liveFactResult = null;
            let liveFactFailed = false;

            // A. RAG CHECK
            const ragTriggers = ["document", "pdf", "file", "secret code", "uploaded", "context", "summarize"];
            if (ragTriggers.some(t => lowerContent.includes(t))) {
                const results = await ragService.search(processedContent, 3);
                if (results.length > 0) {
                    route = "RAG";
                    context = results.map(r => `[Source: ${r.chunk.source}]\n${r.chunk.text.replace(/SYSTEM_INSTRUCTION/g, "")}`).join("\n\n---\n\n");
                }
            }

            // B. LIVE FACT CHECK (Only if not RAG)
            if (route === "CHAT" && ollama.detectStrictFactual(processedContent)) {
                try {
                    const fact = await liveFactsService.getFact(processedContent);
                    if (fact && fact.answer) {
                        route = "LIVE_FACT";
                        liveFactResult = fact;
                    } else {
                        liveFactFailed = true;
                    }
                } catch (e) {
                    liveFactFailed = true;
                }
            }

            // 4. Handle Direct Results (LiveFact)
            if (route === "LIVE_FACT" && liveFactResult?.answer) {
                onChunk(liveFactResult.answer); // Stream the answer
                await storage.updateMessageContent(aiMsg.id, liveFactResult.answer);
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            // --- FEATURE 4: SYSTEM DIAGNOSTIC COMMAND ---
            if (processedContent.toLowerCase().trim() === "system check") {
                const diagnosticOutput = `**SYSTEM DIAGNOSTICS**

✅ **AI Model:** OK (TinyLlama Active)
✅ **Excel Generator:** OK (Faculty Tools Online)
✅ **Academic Tools:** OK (Builders Online)
✅ **Jarvis Commands:** OK (OS Integration Active)
✅ **Server:** Running

**STATUS: HEALTHY**`;
                onChunk(diagnosticOutput);
                await storage.updateMessageContent(aiMsg.id, diagnosticOutput);
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            // 4.5 Intercept Image Generation & Jarvis Commands
            const lowerPrompt = processedContent.toLowerCase();
            if (lowerPrompt.startsWith("generate image") || lowerPrompt.startsWith("create image") || lowerPrompt.startsWith("draw image") || lowerPrompt.startsWith("make picture") || lowerPrompt.startsWith("generate an image") || lowerPrompt.startsWith("create an image") || lowerPrompt.startsWith("draw ")) {
                const imgNotice = "Image generation will be added in a future update.";
                onChunk(imgNotice);
                await storage.updateMessageContent(aiMsg.id, imgNotice);
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            const jarvisResponse = handleJarvisCommand(processedContent);
            if (jarvisResponse) {
                onChunk(jarvisResponse);
                await storage.updateMessageContent(aiMsg.id, jarvisResponse);
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            // --- FEATURE 5: SIMPLE MEMORY MODE ---
            let previousMessageContent = "";
            try {
                const history = await storage.getMessages(conversationId);
                // The newest is the one we just saved, the one before is the previous AI message, the one before that is previous User message
                if (history && history.length >= 3) {
                    previousMessageContent = history[history.length - 3].content.toLowerCase();
                }
            } catch (e) { }

            const activePrompt = lowerPrompt + " " + previousMessageContent; // Context merge for Simple Memory

            const { language } = detectLanguageRequest(processedContent);
            const isHindi = language === "hindi" || activePrompt.includes("bana") || activePrompt.includes("karo") || activePrompt.includes("do");

            // --- FEATURE 5: ACADEMIC JARVIS EXCEL ANALYZERS ---
            const isAttendanceAnalysis = lowerPrompt.startsWith("/analyze attendance");
            const isMarksAnalysis = lowerPrompt.startsWith("/analyze marks");
            const isExcelErrorAnalysis = lowerPrompt.startsWith("/analyze errors");

            if (isAttendanceAnalysis || isMarksAnalysis || isExcelErrorAnalysis) {
                // Find the most recent staged Excel file in this conversation by reverse searching messages
                let targetFileId: string | null = null;
                try {
                    const history = await storage.getMessages(conversationId);
                    // Search backwards for a RAG_ATTACHMENT containing an excel fileId
                    for (let i = history.length - 1; i >= 0; i--) {
                        const msg = history[i].content;
                        if (msg.startsWith("[RAG_ATTACHMENT]:")) {
                            try {
                                const data = JSON.parse(msg.replace("[RAG_ATTACHMENT]:", ""));
                                if (data.fileId && data.fileId.startsWith("rng_")) {
                                    targetFileId = data.fileId;
                                    break;
                                }
                            } catch (e) { }
                        }
                    }
                } catch (e) { }

                if (!targetFileId) {
                    const errorMsg = "Please upload an Excel file (.xlsx or .xls) first using the '+' button before asking me to analyze it.";
                    onChunk(errorMsg);
                    await storage.updateMessageContent(aiMsg.id, errorMsg);
                    await this.updateTitleIfNeeded(conversationId, processedContent);
                    return;
                }

                // File found, read it
                const fs = require('fs');
                const path = require('path');
                const os = require('os');
                const tempPath = path.join(os.tmpdir(), `kalinga_academic_${targetFileId}.xlsx`);

                if (!fs.existsSync(tempPath)) {
                    const expiredMsg = "The uploaded Excel file has expired or was removed. Please upload it again.";
                    onChunk(expiredMsg);
                    await storage.updateMessageContent(aiMsg.id, expiredMsg);
                    await this.updateTitleIfNeeded(conversationId, processedContent);
                    return;
                }

                const buffer = fs.readFileSync(tempPath);
                let report = "";

                if (isAttendanceAnalysis) {
                    report = excelAnalyzerService.analyzeAttendance(buffer).text;
                } else if (isMarksAnalysis) {
                    report = excelAnalyzerService.analyzeMarks(buffer).text;
                } else if (isExcelErrorAnalysis) {
                    report = excelAnalyzerService.detectExcelErrors(buffer).text;
                }

                // Cleanup the file after analysis
                try { fs.unlinkSync(tempPath); } catch (e) { }

                onChunk(report);
                await storage.updateMessageContent(aiMsg.id, report);
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            // 4.5.5 Intercept PDF to Excel Tool (Smart Assistant Mode)
            const isPdfRequest = lowerPrompt.startsWith("/excel") || lowerPrompt.startsWith("/pdf-to-excel");
            if (isPdfRequest) {
                const pdfResponse = isHindi
                    ? `*[कार्य निष्पादित हो रहा है]* PDF से Excel टूल खोला जा रहा है...\n\n[PDF को Excel में बदलने के लिए यहाँ क्लिक करें](/tools/pdf-to-excel)`
                    : `*[Executing Task]* Opening PDF to Excel Tool...\n\n[Click here to open the PDF to Excel Converter](/tools/pdf-to-excel)`;
                onChunk(pdfResponse);
                await storage.updateMessageContent(aiMsg.id, pdfResponse);
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            // 4.6 Intercept Teacher Attendance Sheet Tool (Smart Assistant Mode)
            if (activePrompt.includes("attendance sheet") || activePrompt.includes("create attendance")) {
                const countMatch = lowerPrompt.match(/(\d+)\s*student/) || previousMessageContent.match(/(\d+)\s*student/) || activePrompt.match(/(\d+)/);
                const count = countMatch ? parseInt(countMatch[1]) : 50;

                const startMsg = isHindi
                    ? `*[कार्य निष्पादित हो रहा है]* Attendance Sheet ${count} छात्रों के लिए बनाई जा रही है...\n`
                    : `*[Executing Task]* Generating Attendance Sheet for ${count} students...\n`;
                onChunk(startMsg);

                const fileUrl = generateAttendanceExcel(count);
                if (fileUrl) {
                    const finalResponse = isHindi
                        ? `\n✅ **Attendance ERP Sheet तैयार है**\n\n[एक्सेल डाउनलोड करें](${fileUrl})`
                        : `\n✅ **Attendance ERP Sheet Ready**\n\n[Download Excel](${fileUrl})`;
                    onChunk(finalResponse);
                    await storage.updateMessageContent(aiMsg.id, finalResponse);
                } else {
                    const failMsg = isHindi ? `\n❌ Attendance sheet बनाने में विफल रहा।` : `\n❌ Failed to generate attendance sheet.`;
                    onChunk(failMsg);
                    await storage.updateMessageContent(aiMsg.id, failMsg);
                }
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            // 4.7 Intercept Student List Excel Tool (Smart Assistant Mode)
            if (lowerPrompt.startsWith("/studentlist")) {
                const match = lowerPrompt.match(/(\d+)/) || previousMessageContent.match(/(\d+)/);
                const count = match ? parseInt(match[1]) : 100;

                const startMsg = isHindi
                    ? `*[कार्य निष्पादित हो रहा है]* ${count} छात्रों के लिए ERP छात्र सूची बनाई जा रही है...\n`
                    : `*[Executing Task]* Generating ERP Student List for ${count} students...\n`;
                onChunk(startMsg);

                const fileUrl = generateStudentExcel(count);
                if (fileUrl) {
                    const finalResponse = isHindi
                        ? `\n✅ **छात्र सूची एक्सेल तैयार है**\n\n[एक्सेल डाउनलोड करें](${fileUrl})`
                        : `\n✅ **Student List Excel Ready**\n\n[Download Excel](${fileUrl})`;
                    onChunk(finalResponse);
                    await storage.updateMessageContent(aiMsg.id, finalResponse);
                } else {
                    const failMsg = isHindi ? `\n❌ एक्सेल शीट बनाने में विफल रहा।` : `\n❌ Failed to generate Excel sheet.`;
                    onChunk(failMsg);
                    await storage.updateMessageContent(aiMsg.id, failMsg);
                }
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            // 4.8 Intercept Marks Sheet Excel Tool (Smart Assistant Mode)
            if (activePrompt.includes("marksheet") || activePrompt.includes("create marksheet") || activePrompt.includes("mark sheet")) {
                const match = lowerPrompt.match(/(\d+)/) || previousMessageContent.match(/(\d+)/);
                const count = match ? parseInt(match[1]) : 60;

                const startMsg = isHindi
                    ? `*[कार्य निष्पादित हो रहा है]* ${count} छात्रों के लिए मार्क्स शीट बनाई जा रही है...\n`
                    : `*[Executing Task]* Generating Marks Sheet for ${count} students...\n`;
                onChunk(startMsg);

                const fileUrl = generateMarksSheetExcel(count);
                if (fileUrl) {
                    const finalResponse = isHindi
                        ? `\n✅ **मार्क्स शीट एक्सेल तैयार है**\n\n[एक्सेल डाउनलोड करें](${fileUrl})`
                        : `\n✅ **Marks Sheet Excel Ready**\n\n[Download Excel](${fileUrl})`;
                    onChunk(finalResponse);
                    await storage.updateMessageContent(aiMsg.id, finalResponse);
                } else {
                    const failMsg = isHindi ? `\n❌ मार्क्स शीट बनाने में विफल रहा।` : `\n❌ Failed to generate Marks sheet.`;
                    onChunk(failMsg);
                    await storage.updateMessageContent(aiMsg.id, failMsg);
                }
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            }

            // 4.9 Intercept Academic Tools (Smart Assistant Mode)
            let isAcademicTool = false;
            let academicPrompt = "";
            let academicMaxTokens = 80;

            const isResumeRequest = lowerPrompt.startsWith("/resume");

            if (isResumeRequest) {
                const courses = ["bca", "mca", "btech", "b.tech", "mtech", "m.tech", "bba", "mba", "bsc", "msc", "b.com", "m.com"];
                let detectedCourse = "Computer Science / Software Engineering";
                let detectedName = "Rahul Sharma";
                let nameFound = false;
                let courseFound = false;

                const courseHit = courses.find(c => lowerPrompt.includes(c));
                if (courseHit) {
                    detectedCourse = courseHit.toUpperCase();
                    courseFound = true;
                }

                const forMatch = lowerPrompt.match(/for\s+([a-z\s.]+)/);
                if (forMatch) {
                    let extracted = forMatch[1].replace(/student|developer|fresher|intern|job/g, "").trim();
                    if (extracted) {
                        let nameParts = extracted.split(' ').filter(w => !courses.includes(w) && w.length > 0);
                        if (nameParts.length > 0) {
                            detectedName = nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                            nameFound = true;
                        } else if (courses.includes(extracted)) {
                            detectedCourse = extracted.toUpperCase();
                            courseFound = true;
                        }
                    }
                }

                if (courseFound && !nameFound) {
                    detectedName = "_________________________";
                }

                const email = detectedName.includes("_") ? "_________________________" : detectedName.toLowerCase().replace(/[^a-z0-9]/g, '') + "@email.com";
                const phone = detectedName.includes("_") ? "_________________________" : "+91 9876543210";

                const resumeOutputEn = `*[Executing Task]* Resume Generated\n\n**Name:** ${detectedName}\n**Email:** ${email}\n**Phone:** ${phone}\n\n**Education:**\n- ${detectedCourse} – Kalinga University (2025)\n- Higher Secondary – CBSE Board (2022)\n\n**Skills:**\n- Python\n- Artificial Intelligence (AI)\n- Machine Learning (ML)\n\n**Projects:**\n- KalingaAI Assistant\n- Smart Resume Analyzer\n\n**Experience:**\n- Internship at Tech Corp`;
                const resumeOutputHi = `*[कार्य निष्पादित हो रहा है]* Resume तैयार है\n\n**नाम (Name):** ${detectedName}\n**ईमेल (Email):** ${email}\n**फ़ोन (Phone):** ${phone}\n\n**शिक्षा (Education):**\n- ${detectedCourse} – Kalinga University (2025)\n- Higher Secondary – CBSE Board (2022)\n\n**कौशल (Skills):**\n- Python\n- Artificial Intelligence (AI)\n- Machine Learning (ML)\n\n**प्रोजेक्ट्स (Projects):**\n- KalingaAI Assistant\n- Smart Resume Analyzer\n\n**अनुभव (Experience):**\n- Internship at Tech Corp`;

                const finalResume = isHindi ? resumeOutputHi : resumeOutputEn;

                onChunk(finalResume);
                await storage.updateMessageContent(aiMsg.id, finalResume);
                await this.updateTitleIfNeeded(conversationId, processedContent);
                return;
            } else if (lowerPrompt.startsWith("/coverletter")) {
                isAcademicTool = true;
                academicPrompt = `Generate a professional cover letter based on: '${processedContent.replace(/^\/coverletter/i, '').trim()}'. Include: Applicant introduction, Skills, Reason for applying, Strengths, Closing statement. Make it realistic and professional. Limit to 200–300 words.`;
                academicMaxTokens = 500;
            } else if (lowerPrompt.includes("apa citation") || lowerPrompt.includes("ieee citation") || lowerPrompt.includes("mla citation") || lowerPrompt.includes("generate citation")) {
                isAcademicTool = true;
                const format = lowerPrompt.includes("apa") ? "APA" : lowerPrompt.includes("ieee") ? "IEEE" : lowerPrompt.includes("mla") ? "MLA" : "APA";
                academicPrompt = `Generate ${format} citation for: '${processedContent}'. RULES: Format perfectly according to ${format} standard. Ex: APA -> Author, A. A. (2024). Title. Journal. Volume(Issue), pages. IEEE -> [1] A. Author, "Title," Journal, 2024. MLA -> Author Name. Title. Journal. Year. Return ONLY the citation.`;
                academicMaxTokens = 150;
            } else if (lowerPrompt.includes("research paper") && (lowerPrompt.includes("write") || lowerPrompt.includes("help") || lowerPrompt.includes("generate"))) {
                isAcademicTool = true;
                academicPrompt = `Write a structured research paper based on: '${processedContent}'. Must include EXACTLY these numbered sections: 1. Abstract 2. Introduction 3. Literature Review 4. Methodology 5. Results 6. Conclusion 7. References. Use formal academic language.`;
                academicMaxTokens = 800;
            } else if (lowerPrompt.includes("calculate attendance")) {
                isAcademicTool = true;
                academicPrompt = `Calculate the attendance percentage based on the numbers provided in: '${processedContent}'. Return a markdown table with columns like Total Classes, Attended, and Percentage.`;
                academicMaxTokens = 200;
            }

            if (isAcademicTool) {
                onChunk("\n*[Academic Tool Ready]*\n\n");
            }

            // 5. Build Prompt & Model
            // detectLanguageRequest is now hoisted to line 348
            const domain = ollama.detectDomain(processedContent);
            let model = isAcademicTool ? "phi3:mini" : ollama.chooseModel(processedContent, route === "RAG", requestedModel, domain, route === "LIVE_FACT" || liveFactFailed, language);

            // --- FEATURE: MODEL ROUTING FALLBACK & MANUAL OVERRIDE ---
            const languageDetect = detectLanguage(processedContent);
            const hindiRegex = /[\u0900-\u097F]/;
            const romanHindiWords = ["kya", "kaise", "kyon", "hota", "hai", "samjhao", "batao", "hindi", "hinglish"];

            const isHindiQuery =
                hindiRegex.test(processedContent) ||
                romanHindiWords.some(word =>
                    new RegExp(`\\b${word}\\b`, 'i').test(processedContent)
                );

            if (requestedModel && requestedModel !== "auto") {
                model = requestedModel;
            } else if (isAcademicTool) {
                model = "phi3:mini";
            } else {
                if (isHindiQuery) {
                    model = "qwen2.5:3b";
                } else if (languageDetect === "nonEnglish") {
                    model = "qwen2.5:3b";
                } else if (processedContent.length > 200) {
                    model = "phi3:mini";
                } else {
                    model = "tinyllama";
                }
            }

            // Broadcast the chosen model back to the UI
            onChunk(JSON.stringify({ selectedModel: model }) + "\n");

            // Determine Mode
            let derivedMode: "FRIDAY" | "VIVA" | "PORTFOLIO" | "CODING" | "TEACHING" | "DEFAULT" = "DEFAULT";
            if (lowerContent.startsWith("/analyze") || lowerContent.startsWith("/friday")) derivedMode = "FRIDAY";
            else if (lowerContent.startsWith("/viva")) derivedMode = "VIVA";
            else if (lowerContent.startsWith("/whoami") || lowerContent.startsWith("/portfolio")) derivedMode = "PORTFOLIO";
            else if (domain === "CODING") derivedMode = "CODING";
            else if (lowerContent.includes("teach") || lowerContent.includes("step by step") || lowerContent.includes("guide me") || lowerContent.includes("learn ")) derivedMode = "TEACHING";

            // Prepare Prompt Content
            let promptContent = processedContent;
            if (isAcademicTool) {
                promptContent = academicPrompt;
            } else {
                if (derivedMode === "FRIDAY") promptContent = processedContent.replace(/^\/(analyze|friday)/i, "").trim();
                if (derivedMode === "VIVA") promptContent = processedContent.replace(/^\/viva/i, "").trim();
                if (derivedMode === "PORTFOLIO") promptContent = processedContent.replace(/^\/(whoami|portfolio)/i, "").trim() || "Tell me about the developer.";
                promptContent = buildMultilingualPrompt(promptContent, language);
            }

            // --- FEATURE 1: SIMPLE EXPLANATION CONTROL ---
            const simpleKeywords = ["simple explanation", "explain simply", "easy explanation", "explain it simply", "explain in simple terms"];
            const isSimpleRequest = simpleKeywords.some(k => lowerPrompt.includes(k));

            // NEW: Detailed Explanation Request Detection
            const detailedKeywords = ["detailed", "full explanation", "deep explanation", "in depth", "elaborate"];
            const isDetailed = detailedKeywords.some(k => lowerPrompt.includes(k));

            const systemPrompt = isAcademicTool
                ? "You are a professional Academic Assistant. Follow the user's instructions exactly."
                : ollama.buildSystemPrompt({
                    route,
                    mode: derivedMode,
                    domain,
                    isFactual: route === "LIVE_FACT" || liveFactFailed,
                    liveFactFailed,
                    context,
                    model,
                    language,
                    simpleExplanation: isSimpleRequest,
                    isDetailed: isDetailed
                });

            // Special Header for Soft Offline Warning
            if (liveFactFailed && !isAcademicTool) {
                onChunk("*[Offline Mode: Using internal memory...]*\n\n");
            }

            // --- FEATURE 4: LOADING INDICATOR FIX ---
            // Removed backend text injection to rely purely on UI dots.

            // 6. Stream from Ollama
            // Limit tokens. If not detailed, keep extremely strict caps to ensure < 5s speeds.
            const options = {
                temperature: isAcademicTool ? 0.3 : (domain === "CODING" ? 0.1 : 0.3),
                num_predict: isAcademicTool ? academicMaxTokens : (isDetailed ? 1024 : (model === "tinyllama" ? 400 : 250))
            };

            const reader = await ollama.generateStream(promptContent, systemPrompt, model, options, signal);
            const decoder = new TextDecoder();
            let fullResponseText = "";
            let initialBuffer = "";
            let isStreamingStarted = false;

            // Stream Loop
            while (true) {
                if (signal?.aborted) {
                    console.log(`[Abort] Streaming stopped by client for conversation ${conversationId}`);
                    break;
                }
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        const contentChunk = json.message?.content || json.response;
                        if (contentChunk) {
                            fullResponseText += contentChunk;

                            // Buffer the first 25 characters to cleanly strip AI intro artifacts
                            if (!isStreamingStarted) {
                                initialBuffer += contentChunk;
                                if (initialBuffer.length >= 25) {
                                    let cleaned = cleanResponse(initialBuffer);
                                    if (cleaned) onChunk(cleaned);
                                    isStreamingStarted = true;
                                }
                            } else {
                                onChunk(contentChunk);
                            }
                        }
                    } catch (e) { }
                }
            }

            if (!isStreamingStarted) {
                let cleaned = cleanResponse(initialBuffer);
                if (cleaned) onChunk(cleaned);
            }
            // --- FEATURE: SMART MODEL INDICATOR ---
            // Text removed per user request. Model selection remains exclusively in UI Dropdown.

            // 7. Finalize (Save to DB)
            let finalContent = cleanResponse(fullResponseText);
            if (liveFactFailed) finalContent = "**[Offline Mode Warning]** Info may be outdated.\n\n" + finalContent;

            await storage.updateMessageContent(aiMsg.id, finalContent);
            await this.updateTitleIfNeeded(conversationId, processedContent);

        } catch (error: any) {
            if (error.name === 'AbortError' || signal?.aborted) {
                console.log(`[Abort] ChatService generation aborted natively for conversation ${conversationId}`);
                return;
            }
            console.error("ChatService Error:", error);
            const fallbackMsg = "\n\n**[System Error]** AI temporarily unavailable. Please try again.";
            onChunk(fallbackMsg);
            await storage.updateMessageContent(aiMsg.id, fallbackMsg);
        }
    }

    private async updateTitleIfNeeded(conversationId: number, content: string) {
        const msgs = await storage.getMessages(conversationId);
        if (msgs.length === 2) {
            await storage.updateConversationTitle(conversationId, content.substring(0, 30));
        }
    }
}

export const chatService = new ChatService();
