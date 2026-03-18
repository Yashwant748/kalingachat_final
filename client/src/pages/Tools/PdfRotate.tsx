import { useState } from "react";
import { Upload, FileText, Download, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PDFDocument, degrees } from "pdf-lib";

export default function PdfRotate() {
    const [file, setFile] = useState<File | null>(null);
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
        if (!file) return;

        setIsProcessing(true);
        setProgress(20);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            setProgress(50);
            
            const pages = pdfDoc.getPages();
            
            for (const page of pages) {
                // Rotate clockwise by 90 degrees
                const currentRelRotation = page.getRotation().angle;
                page.setRotation(degrees(currentRelRotation + 90));
            }

            setProgress(80);
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            
            setProgress(100);

            const a = document.createElement("a");
            a.href = url;
            a.download = `rotated_${file.name}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({ title: "Success!", description: "Document rotated successfully." });
            
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
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                        <RotateCcw className="w-5 h-5 text-pink-500" />
                    </div>
                    <h1 className="font-orbitron font-semibold text-lg">Rotate PDF</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                <div className="max-w-xl w-full">
                    <div className="glass-panel p-8 rounded-2xl text-center space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Fix Orientation</h2>
                            <p className="text-muted-foreground">Rotate all pages in your PDF document by 90° clockwise offline.</p>
                        </div>

                        <div
                            className={`border-2 border-dashed rounded-xl p-10 transition-colors ${file ? 'border-pink-500/50 bg-pink-500/5' : 'border-border hover:border-primary/50 hover:bg-white/5'}`}
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
                                    <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto">
                                        <FileText className="w-8 h-8 text-pink-500" />
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
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" /> Rotating...
                                        </span>
                                        <span className="font-medium">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            )}

                            <Button
                                size="lg"
                                className="w-full h-12 text-base font-medium shadow-lg hover:-translate-y-0.5 transition-all"
                                disabled={!file || isProcessing}
                                onClick={handleProcess}
                            >
                                {isProcessing ? "Processing..." : <><RotateCcw className="w-5 h-5 mr-2" /> Rotate 90° & Download</>}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
