import { useState, useEffect, useRef } from "react";
import {
  Folder, File, ArrowLeft, Upload, FolderPlus, Trash2, Loader2,
  RefreshCw, Copy, ExternalLink, ChevronRight, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { bunnyApi, type BunnyFile } from "@/lib/api";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export const BunnyFileExplorer = () => {
  const [files, setFiles] = useState<BunnyFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BunnyFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    setLoading(true);
    try {
      const result = await bunnyApi.listFiles(path);
      // Sort: folders first, then alphabetical
      const sorted = result.files.sort((a, b) => {
        if (a.is_directory !== b.is_directory) return a.is_directory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(sorted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path: string) => setCurrentPath(path);

  const goUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const breadcrumbs = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    let successCount = 0;
    try {
      for (const file of Array.from(fileList)) {
        await bunnyApi.uploadFile(file, currentPath);
        successCount++;
      }
      toast.success(`${successCount} file(s) uploaded`);
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bunnyApi.deleteFile(deleteTarget.path, deleteTarget.is_directory);
      toast.success(`${deleteTarget.is_directory ? "Folder" : "File"} deleted`);
      setDeleteTarget(null);
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const folderPath = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim();
      await bunnyApi.createFolder(folderPath);
      toast.success("Folder created");
      setShowNewFolder(false);
      setNewFolderName("");
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigateTo("")} className="gap-1.5 px-2">
          <Home className="w-4 h-4" />
        </Button>
        {currentPath && (
          <Button variant="ghost" size="sm" onClick={goUp} className="gap-1.5 px-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1 min-w-0 overflow-x-auto">
          <span className="font-medium text-foreground cursor-pointer hover:underline" onClick={() => navigateTo("")}>
            root
          </span>
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span
                className="font-medium text-foreground cursor-pointer hover:underline whitespace-nowrap"
                onClick={() => navigateTo(breadcrumbs.slice(0, i + 1).join("/"))}
              >
                {part}
              </span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => loadFiles(currentPath)} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)} className="gap-1.5">
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Folder</span>
          </Button>
          <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{uploading ? "Uploading..." : "Upload"}</span>
          </Button>
        </div>
      </div>

      {/* File list */}
      <div className="divide-y divide-border">
        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Folder className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">This folder is empty</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group"
            >
              {/* Icon + Name */}
              <div
                className={`flex items-center gap-2.5 flex-1 min-w-0 ${file.is_directory ? "cursor-pointer" : ""}`}
                onClick={() => file.is_directory && navigateTo(file.path)}
              >
                {file.is_directory ? (
                  <Folder className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <File className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span className="truncate text-sm font-medium">{file.name}</span>
              </div>

              {/* Size */}
              <span className="text-xs text-muted-foreground w-20 text-right hidden md:block">
                {file.is_directory ? "—" : formatBytes(file.size)}
              </span>

              {/* Date */}
              <span className="text-xs text-muted-foreground w-36 text-right hidden lg:block">
                {formatDate(file.last_changed)}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {file.cdn_url && (
                  <>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyUrl(file.cdn_url!)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a href={file.cdn_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(file)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        {files.length} item{files.length !== 1 ? "s" : ""}
        {files.length > 0 && (
          <span className="ml-2">
            · {formatBytes(files.reduce((sum, f) => sum + (f.is_directory ? 0 : f.size), 0))} total
          </span>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.is_directory ? "Folder" : "File"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              {deleteTarget?.is_directory && " This will delete all contents inside."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}>
              {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FolderPlus className="w-4 h-4 mr-1" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
