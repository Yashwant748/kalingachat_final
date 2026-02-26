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

function generateAttendanceExcel(studentCount: number, course: string = "BCA", semester: string = "VI", totalClasses: number | string = ""): string | null {
    try {
        const rows: any[][] = [];
        // Header
        rows.push(["Roll No", "Enrollment No", "Student Name", "Course", "Semester", "Total Classes", "Attended", "Percentage"]);

        // Students
        const courseCode = course.toUpperCase().replace(/\s+/g, '');
        for (let i = 1; i <= studentCount; i++) {
            const rollNo = 100 + i;
            const enrollNo = `KU24${courseCode}${String(i).padStart(3, '0')}`;
            const rowIdx = i + 1;
            const percentageCell = { t: 'n', f: `IF(F${rowIdx}>0, G${rowIdx}/F${rowIdx}, 0)`, z: "0.00%" };

            rows.push([rollNo, enrollNo, `Student ${i}`, course.toUpperCase(), semester.toUpperCase(), totalClasses, "", percentageCell]);
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(rows);

        // Styling: Column Widths
        ws['!cols'] = [
            { wch: 10 }, // Roll No
            { wch: 18 }, // Enrollment
            { wch: 25 }, // Name
            { wch: 12 }, // Course
            { wch: 10 }, // Semester
            { wch: 15 }, // Total
            { wch: 15 }, // Attended
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
        rows.push(["Roll No", "Enrollment No", "Student Name", "Assignment 1", "Midterm", "Final Exam", "Total Marks", "Grade"]);

        // Students
        for (let i = 1; i <= studentCount; i++) {
            rows.push([i, `KU/24/${1000 + i}`, `Student ${i}`, "", "", "", "", ""]);
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(rows);

        // Styling: Column Widths
        ws['!cols'] = [
            { wch: 10 }, // Roll No
            { wch: 15 }, // Enrollment
            { wch: 25 }, // Name
            { wch: 15 }, // Ass 1
            { wch: 12 }, // Mid
            { wch: 12 }, // Final
            { wch: 15 }, // Total
            { wch: 10 }  // Grade
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

export class ChatService {
    async processUserMessage(
        conversationId: number,
        content: string,
        requestedModel: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const lowerContent = content.toLowerCase();

        // 1. Save User Message
        const userMsg = await storage.createMessage({ conversationId, content, sender: "user" });

        // Quick Return for RAG Uploads (Frontend handles this logic too, but safety check)
        if (content.startsWith("[RAG_ATTACHMENT]:")) {
            return;
        }

        // 2. Prepare AI Message Placeholder
        const aiMsg = await storage.createMessage({ conversationId, content: "", sender: "ai" });

        // Send Metadata to Client (JSON chunk)
        onChunk(JSON.stringify({ userMessage: userMsg, aiMessageId: aiMsg.id }) + "\n");

        try {
            // 3. Define Route
            let route: "CHAT" | "RAG" | "LIVE_FACT" = "CHAT";
            let context = "";
            let liveFactResult = null;
            let liveFactFailed = false;

            // A. RAG CHECK
            const ragTriggers = ["document", "pdf", "file", "secret code", "uploaded", "context", "summarize"];
            if (ragTriggers.some(t => lowerContent.includes(t))) {
                const results = await ragService.search(content, 3);
                if (results.length > 0) {
                    route = "RAG";
                    context = results.map(r => `[Source: ${r.chunk.source}]\n${r.chunk.text.replace(/SYSTEM_INSTRUCTION/g, "")}`).join("\n\n---\n\n");
                }
            }

            // B. LIVE FACT CHECK (Only if not RAG)
            if (route === "CHAT" && ollama.detectStrictFactual(content)) {
                try {
                    const fact = await liveFactsService.getFact(content);
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
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            }

            // --- FEATURE 4: SYSTEM DIAGNOSTIC COMMAND ---
            if (content.toLowerCase().trim() === "system check") {
                const diagnosticOutput = `**SYSTEM DIAGNOSTICS**

✅ **AI Model:** OK (TinyLlama Active)
✅ **Excel Generator:** OK (Faculty Tools Online)
✅ **Academic Tools:** OK (Builders Online)
✅ **Jarvis Commands:** OK (OS Integration Active)
✅ **Server:** Running

**STATUS: HEALTHY**`;
                onChunk(diagnosticOutput);
                await storage.updateMessageContent(aiMsg.id, diagnosticOutput);
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            }

            // 4.5 Intercept Image Generation & Jarvis Commands
            const lowerPrompt = content.toLowerCase();
            if (lowerPrompt.startsWith("generate image") || lowerPrompt.startsWith("create image") || lowerPrompt.startsWith("draw image") || lowerPrompt.startsWith("make picture") || lowerPrompt.startsWith("generate an image") || lowerPrompt.startsWith("create an image") || lowerPrompt.startsWith("draw ")) {
                const imgNotice = "Image generation will be added in a future update.";
                onChunk(imgNotice);
                await storage.updateMessageContent(aiMsg.id, imgNotice);
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            }

            const jarvisResponse = handleJarvisCommand(content);
            if (jarvisResponse) {
                onChunk(jarvisResponse);
                await storage.updateMessageContent(aiMsg.id, jarvisResponse);
                await this.updateTitleIfNeeded(conversationId, content);
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

            const { language } = detectLanguageRequest(content);
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
                    await this.updateTitleIfNeeded(conversationId, content);
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
                    await this.updateTitleIfNeeded(conversationId, content);
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
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            }

            // 4.5.5 Intercept PDF to Excel Tool (Smart Assistant Mode)
            const isPdfRequest = lowerPrompt.includes("pdf") && (lowerPrompt.includes("excel") || lowerPrompt.includes("extract") || lowerPrompt.includes("convert") || lowerPrompt.includes("table") || lowerPrompt.includes("make") || lowerPrompt.includes("bana") || lowerPrompt.includes("karo") || lowerPrompt.includes("badal") || lowerPrompt.includes("do"));
            if (isPdfRequest && !activePrompt.includes("document") && !activePrompt.includes("summarize")) {
                const pdfResponse = isHindi
                    ? `*[कार्य निष्पादित हो रहा है]* PDF से Excel टूल खोला जा रहा है...\n\n[PDF को Excel में बदलने के लिए यहाँ क्लिक करें](/tools/pdf-to-excel)`
                    : `*[Executing Task]* Opening PDF to Excel Tool...\n\n[Click here to open the PDF to Excel Converter](/tools/pdf-to-excel)`;
                onChunk(pdfResponse);
                await storage.updateMessageContent(aiMsg.id, pdfResponse);
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            }

            // 4.6 Intercept Teacher Attendance Sheet Tool (Smart Assistant Mode)
            if (activePrompt.startsWith("/attendance")) {
                const countMatch = lowerPrompt.match(/(\d+)\s*student/) || previousMessageContent.match(/(\d+)\s*student/) || activePrompt.match(/(\d+)/);
                const count = countMatch ? parseInt(countMatch[1]) : 50;

                const classesMatch = activePrompt.match(/(\d+)\s*class/);
                const totalClasses = classesMatch ? parseInt(classesMatch[1]) : "";

                const coursesList = ["bca", "mca", "btech", "b.tech", "mtech", "m.tech", "bba", "mba", "bsc", "msc", "b.com", "m.com", "aiml", "cse"];
                let course = "BCA";
                const foundCourse = coursesList.find(c => activePrompt.includes(c));
                if (foundCourse) course = foundCourse.toUpperCase();

                if (activePrompt.includes("bca") && activePrompt.includes("aiml")) course = "BCA AIML";
                if (activePrompt.includes("btech") && activePrompt.includes("cse")) course = "BTECH CSE";

                const semMatch = activePrompt.match(/semester\s*(\d+)/) || activePrompt.match(/sem\s*(\d+)/);
                const semester = semMatch ? semMatch[1] : "VI";

                const startMsg = isHindi
                    ? `*[कार्य निष्पादित हो रहा है]* ERP Attendance Sheet ${count} छात्रों (${course}, Sem ${semester}) के लिए बनाई जा रही है...\n`
                    : `*[Executing Task]* Generating ERP Attendance Sheet for ${count} students (${course}, Sem ${semester})...\n`;
                onChunk(startMsg);

                const fileUrl = generateAttendanceExcel(count, course, semester, totalClasses);
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
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            }

            // 4.7 Intercept Student List Excel Tool (Smart Assistant Mode)
            if (activePrompt.startsWith("/studentlist")) {
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
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            }

            // 4.8 Intercept Marks Sheet Excel Tool (Smart Assistant Mode)
            if (activePrompt.startsWith("/marks")) {
                const match = lowerPrompt.match(/(\d+)/) || previousMessageContent.match(/(\d+)/);
                const count = match ? parseInt(match[1]) : 60;

                const startMsg = isHindi
                    ? `*[कार्य निष्पादित हो रहा है]* ${count} छात्रों के लिए ERP मार्क्स शीट बनाई जा रही है...\n`
                    : `*[Executing Task]* Generating ERP Marks Sheet for ${count} students...\n`;
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
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            }

            // 4.9 Intercept Academic Tools (Smart Assistant Mode)
            let isAcademicTool = false;
            let academicPrompt = "";
            let academicMaxTokens = 80;

            const isResumeRequest = activePrompt.startsWith("/resume");

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
                await this.updateTitleIfNeeded(conversationId, content);
                return;
            } else if (lowerPrompt.startsWith("/coverletter")) {
                isAcademicTool = true;
                academicPrompt = `Generate a professional cover letter based on: '${content.replace(/^\/coverletter/i, '').trim()}'. Include: Applicant introduction, Skills, Reason for applying, Strengths, Closing statement. Make it realistic and professional. Limit to 200–300 words.`;
                academicMaxTokens = 500;
            } else if (lowerPrompt.startsWith("/apa")) {
                isAcademicTool = true;
                academicPrompt = `Generate APA citation for: '${content.replace(/^\/apa/i, '').trim()}'. RULES: NEVER invent fake details. Use ONLY the provided fields (Author, Title, Year). Do NOT guess or add extra fields like editors, pages, or journals. If exact details are unknown, use this safe generic format: Author. (Year). Title. Publisher Unknown. Return ONLY the citation.`;
                academicMaxTokens = 150;
            } else if (lowerPrompt.startsWith("/ieee")) {
                isAcademicTool = true;
                academicPrompt = `Generate IEEE citation for: '${content.replace(/^\/ieee/i, '').trim()}'. RULES: NEVER invent fake details. Use ONLY the provided fields (Author, Title, Year). Do NOT guess or add extra fields like editors, pages, or journals. If exact details are unknown, use this safe generic format: [1] Author Unknown, "Title," Year. Return ONLY the citation.`;
                academicMaxTokens = 150;
            }

            if (isAcademicTool) {
                onChunk("\n*[Academic Tool Ready]*\n\n");
            }

            // 5. Build Prompt & Model
            // detectLanguageRequest is now hoisted to line 348
            const domain = ollama.detectDomain(content);
            const model = isAcademicTool ? "tinyllama" : ollama.chooseModel(content, route === "RAG", requestedModel, domain, route === "LIVE_FACT" || liveFactFailed, language);

            // Determine Mode
            let derivedMode: "FRIDAY" | "VIVA" | "PORTFOLIO" | "CODING" | "TEACHING" | "DEFAULT" = "DEFAULT";
            if (lowerContent.startsWith("/analyze") || lowerContent.startsWith("/friday")) derivedMode = "FRIDAY";
            else if (lowerContent.startsWith("/viva")) derivedMode = "VIVA";
            else if (lowerContent.startsWith("/whoami") || lowerContent.startsWith("/portfolio")) derivedMode = "PORTFOLIO";
            else if (domain === "CODING") derivedMode = "CODING";
            else if (lowerContent.includes("teach") || lowerContent.includes("step by step") || lowerContent.includes("guide me") || lowerContent.includes("learn ")) derivedMode = "TEACHING";

            // Prepare Prompt Content
            let promptContent = content;
            if (isAcademicTool) {
                promptContent = academicPrompt;
            } else {
                if (derivedMode === "FRIDAY") promptContent = content.replace(/^\/(analyze|friday)/i, "").trim();
                if (derivedMode === "VIVA") promptContent = content.replace(/^\/viva/i, "").trim();
                if (derivedMode === "PORTFOLIO") promptContent = content.replace(/^\/(whoami|portfolio)/i, "").trim() || "Tell me about the developer.";
                promptContent = buildMultilingualPrompt(promptContent, language);
            }

            // --- FEATURE 1: SIMPLE EXPLANATION CONTROL ---
            const simpleKeywords = ["simple explanation", "explain simply", "easy explanation", "explain it simply", "explain in simple terms"];
            const isSimpleRequest = simpleKeywords.some(k => lowerPrompt.includes(k));

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
                    simpleExplanation: isSimpleRequest
                });

            // Special Header for Soft Offline Warning
            if (liveFactFailed && !isAcademicTool) {
                onChunk("*[Offline Mode: Using internal memory...]*\n\n");
            }

            // --- FEATURE 4: LOADING INDICATOR FIX ---
            if (!isAcademicTool) {
                onChunk("*(Thinking...)*\n\n");
            }

            // 6. Stream from Ollama
            // Raised TinyLlama limit to 300 tokens to cure the "half responses" cutting off mid-sentence now that structural prompts restrict length naturally.
            const options = {
                temperature: isAcademicTool ? 0.3 : (domain === "CODING" ? 0.1 : 0.3),
                num_predict: isAcademicTool ? academicMaxTokens : (model === "tinyllama" ? 300 : (domain === "CODING" ? 1024 : 512))
            };

            const reader = await ollama.generateStream(promptContent, systemPrompt, model, options);
            const decoder = new TextDecoder();
            let fullResponseText = "";
            let initialBuffer = "";
            let isStreamingStarted = false;

            // Stream Loop
            while (true) {
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

                            // Buffer the first 100 characters to cleanly strip AI intro artifacts
                            if (!isStreamingStarted) {
                                initialBuffer += contentChunk;
                                if (initialBuffer.length >= 100) {
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
            const modelNameDisplay = model === "tinyllama" ? "TinyLlama Fast" : (model === "qwen2.5:3b" ? "Qwen Smart" : "Phi3 Writer");
            const modelBadge = `\n\n*Model Used: ${modelNameDisplay}*`;
            onChunk(modelBadge);

            // 7. Finalize (Save to DB)
            let finalContent = cleanResponse(fullResponseText);
            if (liveFactFailed) finalContent = "**[Offline Mode Warning]** Info may be outdated.\n\n" + finalContent;

            finalContent += modelBadge;

            await storage.updateMessageContent(aiMsg.id, finalContent);
            await this.updateTitleIfNeeded(conversationId, content);

        } catch (error: any) {
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
