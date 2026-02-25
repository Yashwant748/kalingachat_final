import * as xlsx from 'xlsx';

export interface AnalyzerReport {
    text: string;
}

export const excelAnalyzerService = {

    parseExcelBuffer(buffer: Buffer): any[] {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Convert to JSON array, using first row as header
        return xlsx.utils.sheet_to_json(worksheet);
    },

    // Helper to find a column name ignoring case and spacing
    findColumnKey(row: any, searchTerms: string[]): string | undefined {
        if (!row) return undefined;
        const keys = Object.keys(row);
        for (const key of keys) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9%]/g, '');
            for (const term of searchTerms) {
                const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9%]/g, '');
                // It's safer to check if it starts with the term or is exact, rather than just includes
                // 'includes' makes "Roll Number" match "lln" -> "attendance" (if normalized poorly)
                if (normalizedKey.includes(normalizedTerm)) {
                    // double check to ensure we don't accidentally match 'roll number' for '%'
                    if (term === '%' && !key.includes('%')) continue;

                    return key;
                }
            }
        }
        return undefined;
    },

    analyzeAttendance(buffer: Buffer): AnalyzerReport {
        try {
            const data = this.parseExcelBuffer(buffer);
            if (data.length === 0) return { text: "The uploaded Excel file appears to be empty." };

            const nameKey = this.findColumnKey(data[0], ['name', 'student']);
            const attKey = this.findColumnKey(data[0], ['attendance', 'att', '%', 'present']);

            if (!nameKey || !attKey) {
                return { text: "Could not find 'Name' or 'Attendance' columns in the Excel file. Please ensure standard column headers are used." };
            }

            let totalStudents = 0;
            let totalAtt = 0;
            const lowAtt: { name: string, val: number }[] = [];
            const goodAtt: { name: string, val: number }[] = [];

            for (const row of data) {
                const name = row[nameKey];
                let attVal = row[attKey];

                if (!name || attVal === undefined) continue;

                // Parse attendance to number
                if (typeof attVal === 'string') {
                    attVal = parseFloat(attVal.replace(/[^0-9.]/g, ''));
                }

                if (isNaN(attVal)) continue;

                // If attendance is decimal (e.g. 0.82), convert to 82%
                if (attVal <= 1 && attVal > 0) {
                    attVal = attVal * 100;
                }

                // Cap attendance at 100%
                if (attVal > 100) attVal = 100;

                totalStudents++;
                totalAtt += attVal;

                if (attVal < 75) lowAtt.push({ name: String(name), val: attVal });
                else if (attVal > 90) goodAtt.push({ name: String(name), val: attVal });
            }

            if (totalStudents === 0) return { text: "Could not parse any valid student attendance data from the rows." };

            const avgAtt = Math.round(totalAtt / totalStudents);

            let report = `### Attendance Analysis\n\n`;
            report += `**Total Students:** ${totalStudents}\n\n`;
            report += `**Average Attendance:**\n${avgAtt}%\n\n`;

            report += `**Low Attendance (<75%):**\n`;
            if (lowAtt.length > 0) {
                lowAtt.forEach(s => report += `- ${s.name} - ${Math.round(s.val)}%\n`);
            } else {
                report += "None\n";
            }
            report += `\n`;

            report += `**Good Attendance (>90%):**\n`;
            if (goodAtt.length > 0) {
                goodAtt.forEach(s => report += `- ${s.name} - ${Math.round(s.val)}%\n`);
            } else {
                report += "None\n";
            }

            return { text: report };

        } catch (e: any) {
            return { text: `Error analyzing attendance: ${e.message}` };
        }
    },

    analyzeMarks(buffer: Buffer): AnalyzerReport {
        try {
            const data = this.parseExcelBuffer(buffer);
            if (data.length === 0) return { text: "The uploaded Excel file appears to be empty." };

            const nameKey = this.findColumnKey(data[0], ['name', 'student']);
            const marksKey = this.findColumnKey(data[0], ['marks', 'grade', 'score', 'total', 'result']);

            if (!nameKey || !marksKey) {
                return { text: "Could not find 'Name' or 'Marks' columns in the Excel file. Please ensure standard column headers are used." };
            }

            let totalStudents = 0;
            let totalMarks = 0;
            let passCount = 0;
            let failCount = 0;
            const passThreshold = 33;

            const allMarks: { name: string, val: number }[] = [];

            for (const row of data) {
                const name = row[nameKey];
                let markVal = row[marksKey];

                if (!name || markVal === undefined) continue;

                if (typeof markVal === 'string') {
                    markVal = parseFloat(markVal.replace(/[^0-9.]/g, ''));
                }

                if (isNaN(markVal)) continue;

                totalStudents++;
                totalMarks += markVal;
                allMarks.push({ name: String(name), val: markVal });

                if (markVal >= passThreshold) passCount++;
                else failCount++;
            }

            if (totalStudents === 0) return { text: "Could not parse any valid student marks data from the rows." };

            const avgMarks = Math.round(totalMarks / totalStudents);
            allMarks.sort((a, b) => b.val - a.val);

            const topStudents = allMarks.slice(0, Math.min(3, allMarks.length));
            const lowestStudents = [...allMarks].reverse().slice(0, Math.min(3, allMarks.length));

            let report = `### Marks Analysis\n\n`;
            report += `**Total Students:** ${totalStudents}\n\n`;

            report += `**Top Students:**\n`;
            topStudents.forEach(s => report += `- ${s.name} - ${Math.round(s.val)}\n`);
            report += `\n`;

            report += `**Lowest Students:**\n`;
            lowestStudents.forEach(s => report += `- ${s.name} - ${Math.round(s.val)}\n`);
            report += `\n`;

            report += `**Average Marks:**\n${avgMarks}\n\n`;

            report += `**Pass Students:**\n${passCount}\n\n`;
            report += `**Fail Students:**\n${failCount}\n`;

            return { text: report };

        } catch (e: any) {
            return { text: `Error analyzing marks: ${e.message}` };
        }
    },

    detectExcelErrors(buffer: Buffer): AnalyzerReport {
        try {
            const data = this.parseExcelBuffer(buffer);
            if (data.length === 0) return { text: "The uploaded Excel file appears to be empty." };

            let missingCells = 0;
            let duplicateRolls = 0;
            let invalidMarks = 0;
            let invalidAtt = 0;

            const rollKey = this.findColumnKey(data[0], ['roll', 'id', 'enrollment']);
            const marksKey = this.findColumnKey(data[0], ['marks', 'grade', 'score']);
            const attKey = this.findColumnKey(data[0], ['attendance', 'att', '%']);

            const seenRolls = new Set<string>();

            // Figure out expected keys based on first full row
            let expectedKeys: string[] = [];
            if (data.length > 0) expectedKeys = Object.keys(data[0]);

            for (const row of data) {
                // Missing cells check
                for (const key of expectedKeys) {
                    if (row[key] === undefined || row[key] === null || String(row[key]).trim() === '') {
                        missingCells++;
                    }
                }

                // Duplicate rolls check
                if (rollKey && row[rollKey] !== undefined) {
                    const roll = String(row[rollKey]).trim();
                    if (roll) {
                        if (seenRolls.has(roll)) duplicateRolls++;
                        else seenRolls.add(roll);
                    }
                }

                // Invalid marks (>100)
                if (marksKey && row[marksKey] !== undefined) {
                    let mk = row[marksKey];
                    if (typeof mk === 'string') mk = parseFloat(mk.replace(/[^0-9.]/g, ''));
                    if (!isNaN(mk) && mk > 100) invalidMarks++;
                }

                // Invalid Attendance (>100%)
                if (attKey && row[attKey] !== undefined) {
                    let mk = row[attKey];
                    if (typeof mk === 'string') mk = parseFloat(mk.replace(/[^0-9.]/g, ''));
                    // If it's stored as fraction, 1.5 is 150% so > 1. If stored as int, 105 is 105%
                    if (!isNaN(mk)) {
                        if ((mk > 1 && mk <= 2) || mk > 100) invalidAtt++;
                    }
                }
            }

            let report = `### Excel Analysis\n\n`;
            report += `**Problems Found:**\n\n`;

            let hasErrors = false;

            if (missingCells > 0) {
                report += `**Missing Values:**\n${missingCells} cells empty\n\n`;
                hasErrors = true;
            }

            if (duplicateRolls > 0) {
                report += `**Duplicate Roll Numbers:**\n${duplicateRolls} duplicates\n\n`;
                hasErrors = true;
            }

            if (invalidMarks > 0) {
                report += `**Invalid Marks:**\n${invalidMarks} entries above 100\n\n`;
                hasErrors = true;
            }

            if (invalidAtt > 0) {
                report += `**Invalid Attendance:**\n${invalidAtt} entries above 100%\n\n`;
                hasErrors = true;
            }

            if (!hasErrors) {
                report = `### Excel Analysis\n\nNo major structural or logical problems found in the dataset. All values appear valid.`;
            }

            return { text: report.trim() };

        } catch (e: any) {
            return { text: `Error analyzing Excel problems: ${e.message}` };
        }
    }

};
