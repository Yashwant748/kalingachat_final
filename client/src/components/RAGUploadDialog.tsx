
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface RAGUploadDialogProps {
    children?: React.ReactNode;
    onUploadSuccess?: (data: { filename: string; chunks: number; type: string; autoReply: boolean; fileId?: string }) => void;
}

export default function RAGUploadDialog({ children, onUploadSuccess }: RAGUploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [autoReply, setAutoReply] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const saved = localStorage.getItem("rag_auto_reply");
        if (saved) {
            setAutoReply(saved === "true");
        }
    }, []);

    const handleAutoReplyChange = (checked: boolean) => {
        setAutoReply(checked);
        localStorage.setItem("rag_auto_reply", String(checked));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/rag/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            toast({
                title: "Upload Successful",
                description: data.message || "Document added to knowledge base.",
            });

            if (onUploadSuccess) {
                onUploadSuccess({
                    filename: data.filename || file.name,
                    chunks: data.chunkCount !== undefined ? data.chunkCount : 0,
                    type: data.fileType || file.type,
                    autoReply: autoReply,
                    fileId: data.fileId
                });
            }

            setOpen(false);
            setFile(null);
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "Upload Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-white/5 h-10 rounded-xl transition-colors mb-2"
                    >
                        <i className="fas fa-file-upload mr-3" />
                        Add Knowledge
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Upload to Knowledge Base</DialogTitle>
                    <DialogDescription>
                        Upload PDF or TXT files. The AI will use this context in conversations.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="file">Document</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".txt,.pdf,.xlsx,.xls"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </div>

                    <div className="flex items-center space-x-2 border border-white/10 p-3 rounded-lg bg-white/5">
                        <Switch id="auto-reply" checked={autoReply} onCheckedChange={handleAutoReplyChange} />
                        <Label htmlFor="auto-reply" className="cursor-pointer flex-1">
                            <span className="block font-medium">Auto reply after upload</span>
                            <span className="block text-xs text-muted-foreground font-normal">
                                Automatically ask AI to summarize the document (Demo Mode)
                            </span>
                        </Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleUpload} disabled={!file || uploading}>
                        {uploading ? (
                            <>
                                <i className="fas fa-spinner animate-spin mr-2" />
                                Uploading...
                            </>
                        ) : (
                            "Upload"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
