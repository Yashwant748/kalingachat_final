import { useState } from "react";
import { Upload, FileText, Download, AlertCircle, Loader2, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PDFDocument, rgb, degrees } from "pdf-lib";

export default function PdfWatermark() {
    const [file, setFile] = useState<File | null>(null);
    const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== "application/pdf") {
                toast({ title: "Invalid file type", description: "Please upload a PDF file.", variant: "destructive" });
                return;
            }
            if (selectedFile.size > 20 * 1024 * 1024) { 
                toast({ title: "File too large", description: "Please upload a file smaller than 20MB.", variant: "destructive" });
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            if (droppedFile.type !== "application/pdf") {
                toast({ title: "Invalid file type", description: "Please upload a PDF file.", variant: "destructive" });
                return;
            }
            if (droppedFile.size > 20 * 1024 * 1024) { 
                toast({ title: "File too large", description: "Please upload a file smaller than 20MB.", variant: "destructive" });
                return;
            }
            setFile(droppedFile);
        }
    };

    const handleProcess = async () => {
        if (!file || !watermarkText.trim()) return;

        setIsProcessing(true);
        setProgress(20);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            setProgress(50);
            
            const pages = pdfDoc.getPages();
            
            for (const page of pages) {
                const { width, height } = page.getSize();
                page.drawText(watermarkText, {
                    x: width / 2 - (watermarkText.length * 20),
                    y: height / 2 - 20,
                    size: 60,
                    color: rgb(0.95, 0.1, 0.1),
                    opacity: 0.3,
                    rotate: degrees(45),
                });
            }

            setProgress(80);
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            
            setProgress(100);

            const a = document.createElement("a");
            a.href = url;
            a.download = `watermarked_${file.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({ title: "Success!", description: "Document watermarked successfully." });
            
            setTimeout(() => {
                setFile(null);
                setProgress(0);
            }, 1000);

        } catch (error: any) {
            console.error("Processing error:", error);
            toast({ title: "Processing Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
            setProgress(0);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
            <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Droplet className="w-5 h-5 text-blue-500" />
                    </div>
                    <h1 className="font-orbitron font-semibold text-lg">Add PDF Watermark</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                <div className="max-w-xl w-full">
                    <div className="glass-panel p-8 rounded-2xl text-center space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Secure Your PDF</h2>
                            <p className="text-muted-foreground">Add a transparent watermark diagonally across every page offline.</p>
                        </div>

                        <div className="text-left space-y-2">
                            <label className="text-sm font-medium text-foreground ml-1">Watermark Text</label>
                            <input 
                                type="text" 
                                value={watermarkText}
                                onChange={e => setWatermarkText(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="E.g., CONFIDENTIAL"
                            />
                        </div>

                        <div
                            className={`border-2 border-dashed rounded-xl p-10 transition-colors ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-border hover:border-primary/50 hover:bg-white/5'}`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            {!file ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                        <Upload className="w-8 h-8 text-primary" />
                                    </div>
                                    <div>
                                        <label className="cursor-pointer">
                                            <span className="text-primary hover:underline font-medium">Click to upload</span>
                                            <span className="text-muted-foreground"> or drag and drop</span>
                                            <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Max file size: 20MB
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                                        <FileText className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    {!isProcessing && (
                                        <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                                            Remove File
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {isProcessing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" /> Processing...
                                        </span>
                                        <span className="font-medium">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            )}

                            <Button
                                size="lg"
                                className="w-full h-12 text-base font-medium shadow-lg hover:-translate-y-0.5 transition-all"
                                disabled={!file || !watermarkText || isProcessing}
                                onClick={handleProcess}
                            >
                                {isProcessing ? "Processing..." : <><Download className="w-5 h-5 mr-2" /> Watermark & Download</>}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
