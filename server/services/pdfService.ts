import pdfParse from "pdf-parse";
import * as xlsx from "xlsx";

/**
 * Service to handle extracting text from a PDF and converting structured rows into an Excel file.
 */
export class PdfService {

    /**
     * Extracts text from PDF and returns an Excel file as a Buffer.
     */
    async processPdfToExcel(pdfBuffer: Buffer): Promise<Buffer> {
        // 1. Extract text using pdf-parse
        let data;
        try {
            data = await pdfParse(pdfBuffer);
        } catch (error: any) {
            console.error("PDF Parsing error:", error);
            throw new Error("Failed to parse PDF document.");
        }

        const text = data.text;

        // 2. Simple heuristic text to grid conversion
        const lines = text.split(/\r?\n/);
        const rows: any[][] = [];
        let maxCols = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Clean stray non-printable or garbage characters
            const cleanedLine = trimmed.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
            const normalized = cleanedLine.replace(/\s+/g, ' ').trim();

            // 1. Header Detection (Syllabus Structure)
            if (normalized.toLowerCase().includes("subject code subject name credit")) {
                rows.push(["Subject Code", "Subject Name", "Credit", "Internal", "External", "Total"]);
                maxCols = Math.max(maxCols, 6);
                continue;
            }

            // 2. Syllabus Row Detection (Word + Words + 4 Numbers)
            // Example: "BCAAIML101 Problem Solving Using Programming 3 30 70 100"
            const syllabusMatch = normalized.match(/^(\S+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
            if (syllabusMatch) {
                rows.push([
                    syllabusMatch[1], // Code
                    syllabusMatch[2], // Name
                    Number(syllabusMatch[3]), // Credit
                    Number(syllabusMatch[4]), // Internal
                    Number(syllabusMatch[5]), // External
                    Number(syllabusMatch[6])  // Total
                ]);
                maxCols = Math.max(maxCols, 6);
                continue;
            }

            // 3. Fallback: Split by tabs or multiple spaces.
            const cells = cleanedLine.split(/\s{2,}|\t/)
                .map(cell => cell.replace(/\s+/g, ' ').trim())
                .filter(cell => cell.length > 0);

            if (cells.length > 0) {
                maxCols = Math.max(maxCols, cells.length);
                rows.push(cells);
            }
        }

        if (rows.length === 0) {
            throw new Error("No structured text found in the PDF.");
        }

        // Uniform Column Alignment (Pad broken rows)
        const uniformRows = rows.map(r => {
            const newRow = [...r];
            while (newRow.length < maxCols) {
                newRow.push("");
            }
            return newRow;
        });

        // 3. Create Excel workbook
        const utils = xlsx.utils as any;
        const wb = utils.book_new();
        const ws = utils.aoa_to_sheet(uniformRows);

        // Smart Cleaning: Auto-fit Column Widths
        const colWidths = [];
        for (let i = 0; i < maxCols; i++) {
            let maxW = 10; // Default min width
            for (const row of uniformRows) {
                if (row[i] && row[i].length > maxW) {
                    maxW = row[i].length;
                }
            }
            colWidths.push({ wch: Math.min(maxW + 2, 60) }); // Cap max width at 60
        }
        ws['!cols'] = colWidths;

        // Add sheet to workbook
        utils.book_append_sheet(wb, ws, "Extracted Data");

        // 4. Write to buffer for download
        const excelBuffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
        return excelBuffer;
    }
}

export const pdfService = new PdfService();
