import { useState } from "react";
import { Upload, FileText, Download, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function PdfToExcel() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== "application/pdf") {
                toast({
                    title: "Invalid file type",
                    description: "Please upload a PDF file.",
                    variant: "destructive",
                });
                return;
            }
            if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
                toast({
                    title: "File too large",
                    description: "Please upload a file smaller than 10MB.",
                    variant: "destructive",
                });
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            if (droppedFile.type !== "application/pdf") {
                toast({
                    title: "Invalid file type",
                    description: "Please upload a PDF file.",
                    variant: "destructive",
                });
                return;
            }
            if (droppedFile.size > 10 * 1024 * 1024) { // 10MB limit
                toast({
                    title: "File too large",
                    description: "Please upload a file smaller than 10MB.",
                    variant: "destructive",
                });
                return;
            }
            setFile(droppedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsProcessing(true);
        setProgress(10); // Start progress

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Simulate some progress during upload
            const progressInterval = setInterval(() => {
                setProgress(p => Math.min(p + 10, 90));
            }, 500);

            const response = await fetch("/api/tools/pdf-to-excel", {
                method: "POST",
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || "Failed to process PDF");
            }

            // Handle file download via payload URL
            const data = await response.json();

            if (data.downloadUrl) {
                // Trigger native browser download directly!
                window.location.href = data.downloadUrl;
            } else {
                throw new Error("No download URL returned by the server.");
            }

            toast({
                title: "Success!",
                description: "Your Excel file has been generated and downloaded.",
            });

            // Reset
            setTimeout(() => {
                setFile(null);
                setProgress(0);
            }, 1000);

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "Processing Failed",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
            setProgress(0);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-500" />
                    </div>
                    <h1 className="font-orbitron font-semibold text-lg">PDF to Excel</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                <div className="max-w-xl w-full">
                    <div className="glass-panel p-8 rounded-2xl text-center space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Convert PDF Data</h2>
                            <p className="text-muted-foreground">
                                Extract tabular data from your PDFs into structured Excel spreadsheets offline.
                            </p>
                        </div>

                        {/* Upload Area */}
                        <div
                            className={`
                border-2 border-dashed rounded-xl p-10 transition-colors
                ${file ? 'border-green-500/50 bg-green-500/5' : 'border-border hover:border-primary/50 hover:bg-white/5'}
              `}
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
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="application/pdf"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Max file size: 10MB
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                                        <FileText className="w-8 h-8 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    {!isProcessing && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setFile(null)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            Remove File
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Progress & Action */}
                        <div className="space-y-4">
                            {isProcessing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            Processing Document...
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
                                onClick={handleUpload}
                            >
                                {isProcessing ? (
                                    <>Converting...</>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5 mr-2" />
                                        Convert & Download Excel
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground/60 text-center pt-4">
                            Processing is done offline to ensure data privacy and system stability.
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
