import { useState, useCallback } from "react";

export interface DownloadState {
  isDownloading: boolean;
  progress: number;
  fileName: string;
  fileSize: string;
  status: "idle" | "downloading" | "complete" | "error";
  error?: string;
}

export const useDownload = () => {
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0,
    fileName: "",
    fileSize: "",
    status: "idle",
  });

  const startDownload = useCallback((url: string, fileName: string, fileSize: string) => {
    setState({
      isDownloading: true,
      progress: 0,
      fileName,
      fileSize,
      status: "downloading",
    });

    // Simulate download progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setState(prev => ({
          ...prev,
          progress: 100,
          status: "complete",
        }));

        // Open the actual download link after a brief delay
        setTimeout(() => {
          window.open(url, "_blank");
        }, 500);
      } else {
        setState(prev => ({
          ...prev,
          progress: Math.min(progress, 99),
        }));
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const reset = useCallback(() => {
    setState({
      isDownloading: false,
      progress: 0,
      fileName: "",
      fileSize: "",
      status: "idle",
    });
  }, []);

  return {
    ...state,
    startDownload,
    reset,
  };
};
