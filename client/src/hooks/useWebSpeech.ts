import { useState, useEffect, useCallback, useRef } from 'react';
// WORKER IMPORT
// Vite handles worker imports with ?worker suffix
import VoskWorker from '../workers/voskWorker?worker';

interface UseWebSpeechReturn {
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    speak: (text: string) => void;
    stopSpeaking: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
    error: string | null;
    mode: 'ONLINE' | 'OFFLINE_VOSK';
    isModelLoading: boolean;
    modelLoadingMessage: string;
    audioLevel: number; // For debugging
}

export function useWebSpeech(): UseWebSpeechReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'ONLINE' | 'OFFLINE_VOSK'>('ONLINE');
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [modelLoadingMessage, setModelLoadingMessage] = useState('Initializing...');
    const [isWorkerReady, setIsWorkerReady] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0); // Debug audio level

    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesis | null>(null);

    // WORKER REF
    const workerRef = useRef<Worker | null>(null);
    const initializationAttemptedRef = useRef(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null); // For audio level detection
    const animationFrameRef = useRef<number | null>(null); // For audio level animation

    // 1. Init Web Speech (Browser Native)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const SpeechSynthesis = window.speechSynthesis;

            if (SpeechRecognition && SpeechSynthesis) {
                setIsSupported(true);
                synthesisRef.current = SpeechSynthesis;

                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = navigator.language || 'en-US';

                recognitionRef.current.onstart = () => {
                    setIsListening(true);
                    setError(null);
                    setMode('ONLINE');
                    console.log('[WebSpeech] Started listening');
                };
                recognitionRef.current.onend = () => {
                    setIsListening(false);
                    console.log('[WebSpeech] Stopped listening');
                };
                recognitionRef.current.onerror = (event: any) => {
                    console.error('WebSpeech error', event.error);
                    setIsListening(false);
                    if (event.error === 'network') {
                        console.warn("Network error detected. Switching to VOSK...");
                        setMode('OFFLINE_VOSK');
                        setError('Network error - trying offline mode');
                    } else if (event.error === 'no-speech') {
                        // Don't set error for no-speech, just continue
                        console.log('[WebSpeech] No speech detected');
                    } else {
                        setError(event.error);
                    }
                };

                recognitionRef.current.onresult = (event: any) => {
                    let final = '';
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final += event.results[i][0].transcript;
                        } else {
                            interim += event.results[i][0].transcript;
                        }
                    }
                    if (final) setTranscript(prev => prev + ' ' + final);
                    setInterimTranscript(interim);
                };
            }
        }
    }, []);

    // 2. Lazy Worker Initialization
    const initVoiceEngine = useCallback(async () => {
        if (workerRef.current || initializationAttemptedRef.current) {
            return Promise.resolve(workerRef.current);
        }

        console.log("[HOOK] Initializing Vosk Worker...");
        initializationAttemptedRef.current = true;
        setIsModelLoading(true);
        setModelLoadingMessage("Initializing...");

        return new Promise<Worker | null>((resolve) => {
            const worker = new VoskWorker();
            workerRef.current = worker;
            let active = true;

            // 11. 5 Second Timeout
            const timeoutId = setTimeout(() => {
                if (!active) return;
                console.error("[HOOK] Voice initialization timed out.");
                setError("Offline voice unavailable (Timeout)");
                setModelLoadingMessage("");
                setIsModelLoading(false);
                setIsWorkerReady(false);
                // We do NOT terminate immediately to avoid race conditions if it loads split second later,
                // but we stop the UI loading state.
                resolve(null);
            }, 5000);

            worker.onmessage = (e) => {
                const { type, text, error, message } = e.data;

                if (type === 'STATUS') {
                    console.log(`[VOSK STATUS] ${message}`);
                    if (active) setModelLoadingMessage(message);
                }

                if (type === 'READY') {
                    console.log("[HOOK] Vosk Engine Ready.");
                    clearTimeout(timeoutId);
                    if (active) {
                        setIsWorkerReady(true);
                        setIsModelLoading(false);
                        setError(null);
                        setModelLoadingMessage("");
                    }
                    resolve(worker);
                }

                if (type === 'ERROR') {
                    console.error("[HOOK] Vosk Worker Error:", error);
                    clearTimeout(timeoutId);
                    if (active) {
                        setError("Voice Error: " + error);
                        setIsModelLoading(false);
                        setModelLoadingMessage("");
                    }
                    resolve(null);
                }

                if (type === 'RESULT' && active) {
                    if (text) {
                        setTranscript(prev => prev + ' ' + text);
                        setInterimTranscript('');
                    }
                }
                if (type === 'PARTIAL' && active) {
                    if (text) setInterimTranscript(text);
                }
            };

            // 9. Correct Model Path
            // 8. Correct WASM Path (Implicit in VoskWorker or handled by library, but model path is key here)
            // 10. Relative Public Path
            const targetModelPath = '/models/vosk-model-small-en-us-0.15';
            const absoluteUrl = typeof window !== 'undefined'
                ? window.location.origin + targetModelPath
                : targetModelPath;

            console.log(`[HOOK] Requesting Model: ${absoluteUrl}`);
            worker.postMessage({
                type: 'INIT',
                payload: absoluteUrl
            });
        });
    }, []);

    // 3. Start Vosk (Capture Audio -> Send to Worker)
    const startVoskListening = async () => {
        if (!isWorkerReady) {
            setError("Offline voice engine not ready.");
            return;
        }

        try {
            console.log('[VOSK] Starting offline voice recognition');

            // Clean up any existing audio session
            stopVoskListening();

            // Check microphone permissions first
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            if (permissionStatus.state === 'denied') {
                setError('Microphone permission denied. Please allow microphone access.');
                return;
            }

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) throw new Error("AudioContext not supported");

            // Create fresh audio context
            if (audioContextRef.current) {
                await audioContextRef.current.close();
            }
            audioContextRef.current = new AudioContextClass({
                sampleRate: 16000,
                latencyHint: 'interactive'
            });

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            console.log('[VOSK] AudioContext state:', audioContextRef.current.state);

            // Get microphone access with optimized settings
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            console.log('[VOSK] Microphone stream active:', stream.active);
            mediaStreamRef.current = stream;

            sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);

            const bufferSize = 512; // Very small buffer for minimal latency
            const processor = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

            console.log('[VOSK] Buffer size:', bufferSize);

            // Add analyser for audio level monitoring
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 128;
            sourceNodeRef.current.connect(analyserRef.current);

            // Audio level monitoring function
            const updateAudioLevel = () => {
                if (!analyserRef.current || !isListening) return;

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setAudioLevel(average);

                if (isListening) {
                    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
                }
            };

            let audioProcessCount = 0;
            processor.onaudioprocess = (e) => {
                if (!isListening || !workerRef.current) return;

                audioProcessCount++;
                if (audioProcessCount % 100 === 0) {
                    console.log('[VOSK] Audio processing cycles:', audioProcessCount);
                }

                const inputData = e.inputBuffer.getChannelData(0);

                // Update audio level for debugging
                if (analyserRef.current && audioProcessCount % 10 === 0) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    setAudioLevel(average);
                }

                // Convert Float32Array to Int16Array for Vosk
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                }

                // Send to worker
                workerRef.current.postMessage({
                    type: 'AUDIO',
                    payload: int16Data
                });
            };

            sourceNodeRef.current.connect(processor);
            processorNodeRef.current = processor;

            // Start audio level monitoring
            updateAudioLevel();

            setIsListening(true);
            setMode('OFFLINE_VOSK');
            setError(null);
            console.log('[VOSK] Successfully started listening with buffer size:', bufferSize);

        } catch (e: any) {
            console.error("[VOSK] Mic Error:", e);
            if (e.name === 'NotAllowedError') {
                setError('Microphone access denied. Please allow microphone access in your browser.');
            } else if (e.name === 'NotFoundError') {
                setError('No microphone found. Please connect a microphone.');
            } else {
                setError("Microphone Error: " + e.message);
            }
            setIsListening(false);
        }
    };

    const stopVoskListening = () => {
        console.log('[VOSK] Stopping offline voice recognition');

        // Stop audio level monitoring
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setAudioLevel(0);

        // Stop media stream tracks
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            mediaStreamRef.current = null;
        }

        // Disconnect audio nodes
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.disconnect();
            } catch (e) {
                console.log('[VOSK] Source node already disconnected');
            }
            sourceNodeRef.current = null;
        }

        if (analyserRef.current) {
            try {
                analyserRef.current.disconnect();
            } catch (e) {
                console.log('[VOSK] Analyser node already disconnected');
            }
            analyserRef.current = null;
        }

        if (processorNodeRef.current) {
            try {
                processorNodeRef.current.disconnect();
                processorNodeRef.current.onaudioprocess = null;
            } catch (e) {
                console.log('[VOSK] Processor node already disconnected');
            }
            processorNodeRef.current = null;
        }

        // Close audio context if no longer needed
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
                audioContextRef.current.suspend();
            } catch (e) {
                console.log('[VOSK] Audio context already suspended');
            }
        }

        setIsListening(false);
    };

    // --- MAIN CONTROLS ---

    const startListening = useCallback(async () => {
        const isOffline = !navigator.onLine;
        console.log('[HOOK] Start Listening Requested. Offline:', isOffline);

        // Reset
        setError(null);

        if (isOffline) {
            // 4. Lazy Load Logic
            if (!isWorkerReady) {
                console.log("[HOOK] Worker not ready, initializing...");
                await initVoiceEngine();
                // Check if ready after init attempt
                if (workerRef.current) {
                    // small delay to let state settle
                    setTimeout(() => {
                        if (!isListening) startVoskListening();
                    }, 100);
                } else {
                    // Init failed or timed out
                    console.warn("[HOOK] Voice engine failed to init.");
                }
            } else {
                startVoskListening();
            }
        } else {
            // Online - WebSpeech
            setMode('ONLINE');
            if (recognitionRef.current && !isListening) {
                try {
                    recognitionRef.current.abort();
                    setTimeout(() => {
                        if (recognitionRef.current && !isListening) {
                            recognitionRef.current.start();
                        }
                    }, 50);
                } catch (e) {
                    console.error("Start listening failed", e);
                    setError('Start failed');
                }
            } else if (!recognitionRef.current) {
                // Fallback to offline if online not supported?
                // For now, adhere to separation.
                setError('Speech recognition not supported');
            }
        }
    }, [isListening, isWorkerReady, initVoiceEngine]);

    const stopListening = useCallback(() => {
        console.log('[HOOK] Stopping all listening modes');

        // Stop WebSpeech
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Might already be stopped, try abort
                try {
                    recognitionRef.current.abort();
                } catch (e2) {
                    console.log('[WebSpeech] Already stopped');
                }
            }
        }

        // Stop Vosk
        stopVoskListening();

        // Clear any interim results
        setInterimTranscript('');
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    // Helper: robustly load voices (waits for voiceschanged event if needed)
    const getVoicesAsync = (): Promise<SpeechSynthesisVoice[]> => {
        return new Promise((resolve) => {
            let voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                resolve(voices);
                return;
            }
            // Voices not loaded yet — wait for the event (fires once on first load)
            const onVoicesChanged = () => {
                voices = window.speechSynthesis.getVoices();
                resolve(voices);
                window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
            };
            window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
            // Failsafe: resolve with empty after 2s so speak doesn't hang forever
            setTimeout(() => {
                window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                resolve(window.speechSynthesis.getVoices());
            }, 2000);
        });
    };

    const speak = useCallback(async (text: string) => {
        if (!window.speechSynthesis) {
            console.warn('[TTS] SpeechSynthesis not supported on this device.');
            return;
        }

        // Cancel any in-progress speech
        window.speechSynthesis.cancel();

        const spokenText = text
            .replace(/KalingaAI/gi, "Kuh-ling-gah A.I.")
            .replace(/Kalinga/gi, "Kuh-ling-gah")
            // Strip markdown so the voice doesn't say "asterisk asterisk"
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .replace(/#{1,6} /g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip links
            .trim();

        if (!spokenText) return;

        const utterance = new SpeechSynthesisUtterance(spokenText);

        // Load voices — prefer LOCAL (offline) ones first
        const voices = await getVoicesAsync();

        const offlineVoice =
            voices.find(v => v.localService === true && v.lang.startsWith('en-')) ||
            voices.find(v => v.localService === true && v.lang.startsWith('en')) ||
            voices.find(v => v.localService === true) || // any local voice as last resort
            voices.find(v => v.name.toLowerCase().includes('microsoft')) || // Windows offline
            voices.find(v => v.name.toLowerCase().includes('siri')) || // macOS offline
            voices[0];

        if (offlineVoice) {
            utterance.voice = offlineVoice;
            console.log(`[TTS] Using voice: "${offlineVoice.name}" (local: ${offlineVoice.localService})`);
        } else {
            console.warn('[TTS] No voices available — browser may speak with default.');
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
            console.error('[TTS] Speech error:', e.error);
            setIsSpeaking(false);
            window.speechSynthesis.cancel();
        };

        // Small delay to allow cancel() to fully clear before new speak
        setTimeout(() => {
            if (window.speechSynthesis) {
                window.speechSynthesis.resume(); // in case it was paused
                window.speechSynthesis.speak(utterance);
            }
        }, 80);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Clean up all audio resources
            stopVoskListening();

            // Close audio context
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, []);

    const stopSpeaking = useCallback(() => {
        if (synthesisRef.current) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
        speak,
        stopSpeaking,
        isSpeaking,
        isSupported,
        error,
        mode,
        isModelLoading,
        modelLoadingMessage,
        audioLevel
    };
}
