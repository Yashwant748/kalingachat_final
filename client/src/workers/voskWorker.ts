import { createModel } from 'vosk-browser';

// Polyfill for some environments (Vite Worker)
(self as any).window = self;

let model: any = null;
let recognizer: any = null;

const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    try {
        if (type === 'INIT') {
            const modelUrl = payload;
            console.log(`[WORKER] Initializing Vosk with URL: ${modelUrl}`);

            try {
                ctx.postMessage({ type: 'STATUS', message: 'Fetching Model Config...' });

                // createModel handles the fetching of model.json and WASM
                // We pass the URL. Note: vosk-browser expects the path to the folder 
                // containing 'model.json' (or 'model.conf'?)
                // Actually, vosk-browser documentation says:
                // "path to the directory where model.json or model.zip is located"
                model = await createModel(modelUrl);

                ctx.postMessage({ type: 'STATUS', message: 'Loading Recognizer...' });
                recognizer = new model.KaldiRecognizer(16000);

                recognizer.on("result", (message: any) => {
                    ctx.postMessage({ type: 'RESULT', text: message.result.text });
                });

                recognizer.on("partialresult", (message: any) => {
                    ctx.postMessage({ type: 'PARTIAL', text: message.result.partial });
                });

                console.log("[WORKER] Vosk Ready.");
                ctx.postMessage({ type: 'READY' });
            } catch (innerErr: any) {
                console.error("[WORKER] CreateModel Failed:", innerErr);
                ctx.postMessage({ type: 'ERROR', error: innerErr.message });
            }
        }

        if (type === 'AUDIO') {
            if (recognizer) {
                try {
                    // Handle both Float32Array and Int16Array
                    let audioData = payload;
                    if (audioData instanceof Float32Array) {
                        // Convert Float32Array to Int16Array for Vosk
                        const int16Data = new Int16Array(audioData.length);
                        for (let i = 0; i < audioData.length; i++) {
                            int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
                        }
                        audioData = int16Data;
                    }
                    recognizer.acceptWaveform(audioData);
                } catch (audioErr: any) {
                    console.warn('[WORKER] Audio processing error:', audioErr.message);
                }
            }
        }

        if (type === 'RESET') {
            if (recognizer) {
                // reset logic if supported
            }
        }

    } catch (err: any) {
        console.error("[WORKER] Global Error:", err);
        ctx.postMessage({ type: 'ERROR', error: err.message });
    }
};

export { };
