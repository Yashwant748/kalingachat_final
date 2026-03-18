import { execFile } from 'child_process';
import path from 'path';

export async function decodeImageCaption(imagePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(process.cwd(), 'server', 'services', 'image_caption.py');

        // Execute the python script with the image path
        execFile('python', [pythonScript, imagePath], (error, stdout, stderr) => {
            if (error) {
                console.error("Python Execution Error:", error);
                // Return a generic caption if the python script fails so the chat doesn't break
                return resolve("An image was uploaded but the captioning service failed.");
            }

            try {
                // Parse the JSON output from the print statement
                const result = JSON.parse(stdout.trim());
                if (result.error) {
                    console.error("BLIP Script Error:", result.error);
                    return resolve("An image was uploaded but the captioning model encountered an error.");
                }
                return resolve(result.caption || "A user-uploaded image without a clear description.");
            } catch (e) {
                console.error("Failed to parse Python output:", stdout);
                return resolve("An image was uploaded (Caption parsing failed).");
            }
        });
    });
}
