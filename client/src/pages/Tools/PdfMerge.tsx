import { useState } from "react";
import { Upload, FileText, Download, AlertCircle, Loader2, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PDFDocument } from "pdf-lib";

export default function PdfMerge() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        addFiles(selectedFiles);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files || []);
        addFiles(droppedFiles);
    };

    const addFiles = (newFiles: File[]) => {
        const validFiles = newFiles.filter(f => {
            if (f.type !== "application/pdf") {
                 toast({ title: "Invalid file type", description: `${f.name} is not a PDF.`, variant: "destructive" });
                 return false;
            }
            if (f.size > 20 * 1024 * 1024) {
                 toast({ title: "File too large", description: `${f.name} is over 20MB.`, variant: "destructive" });
                 return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcess = async () => {
        if (files.length < 2) {
             toast({ title: "More files needed", description: "Please add at least two PDFs to merge.", variant: "destructive" });
             return;
        }

        setIsProcessing(true);
        setProgress(10);

        try {
            const mergedPdf = await PDFDocument.create();
            
            for (let i = 0; i < files.length; i++) {
                setProgress(10 + Math.floor((i / files.length) * 70));
                const arrayBuffer = await files[i].arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }

            setProgress(90);
            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            
            setProgress(100);

            const a = document.createElement("a");
            a.href = url;
            a.download = `merged_document.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({ title: "Success!", description: "Documents merged successfully." });
            
            setTimeout(() => {
                setFiles([]);
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
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-orange-500" />
                    </div>
                    <h1 className="font-orbitron font-semibold text-lg">Merge PDFs</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                <div className="max-w-xl w-full">
                    <div className="glass-panel p-8 rounded-2xl text-center space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Combine Documents</h2>
                            <p className="text-muted-foreground">Select multiple PDFs and merge them into a single file offline.</p>
                        </div>

                        <div
                            className={`border-2 border-dashed rounded-xl p-10 transition-colors ${files.length > 0 ? 'border-orange-500/50 bg-orange-500/5' : 'border-border hover:border-primary/50 hover:bg-white/5'}`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <div className="space-y-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                    <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <label className="cursor-pointer">
                                        <span className="text-primary hover:underline font-medium">Click to upload</span>
                                        <span className="text-muted-foreground"> or drag and drop</span>
                                        <input type="file" className="hidden" accept="application/pdf" multiple onChange={handleFileChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Select 2 or more PDFs
                                </p>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="space-y-2 text-left">
                                <h3 className="font-medium text-sm text-muted-foreground uppercase">Selected Files ({files.length})</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex flex-row items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                                             <div className="flex items-center space-x-3 overflow-hidden">
                                                <FileText className="w-4 h-4 text-orange-400 shrink-0" />
                                                <span className="text-sm truncate max-w-[200px]">{f.name}</span>
                                             </div>
                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeFile(i)}>
                                                <i className="fas fa-times" />
                                             </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {isProcessing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" /> Merging...
                                        </span>
                                        <span className="font-medium">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            )}

                            <Button
                                size="lg"
                                className="w-full h-12 text-base font-medium shadow-lg hover:-translate-y-0.5 transition-all"
                                disabled={files.length < 2 || isProcessing}
                                onClick={handleProcess}
                            >
                                {isProcessing ? "Merging..." : <><Download className="w-5 h-5 mr-2" /> Merge & Download</>}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
