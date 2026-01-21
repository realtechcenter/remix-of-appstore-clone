import { Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { DownloadState } from "@/hooks/useDownload";

interface DownloadProgressProps {
  state: DownloadState;
  onClose: () => void;
}

export const DownloadProgress = ({ state, onClose }: DownloadProgressProps) => {
  const { isDownloading, progress, fileName, fileSize, status } = state;

  return (
    <Dialog open={isDownloading} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center py-6">
          {/* Status Icon */}
          <div className="mb-6">
            {status === "downloading" && (
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  <Download className="w-4 h-4 text-primary" />
                </div>
              </div>
            )}
            {status === "complete" && (
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center animate-scale-in">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
            )}
            {status === "error" && (
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-destructive" />
              </div>
            )}
          </div>

          {/* File Info */}
          <h3 className="text-lg font-semibold text-foreground mb-1 text-center truncate max-w-full px-4">
            {fileName}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {fileSize}
          </p>

          {/* Progress Bar */}
          <div className="w-full space-y-2 px-4">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {status === "downloading" && "Downloading..."}
                {status === "complete" && "Download complete!"}
                {status === "error" && "Download failed"}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Actions */}
          {status === "complete" && (
            <Button 
              onClick={onClose} 
              className="mt-6 bg-green-600 hover:bg-green-700 text-white"
            >
              Done
            </Button>
          )}
          {status === "error" && (
            <Button 
              onClick={onClose} 
              variant="outline"
              className="mt-6"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
