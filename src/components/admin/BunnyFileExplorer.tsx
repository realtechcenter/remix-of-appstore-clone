import { useState, useEffect, useRef, useCallback } from "react";
import {
  Folder, FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode,
  ArrowLeft, Upload, FolderPlus, Trash2, Loader2, RefreshCw, Copy,
  ExternalLink, ChevronRight, Home, LayoutGrid, LayoutList, Search,
  Download, Eye, MoreVertical, HardDrive, File
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { bunnyApi, type BunnyFile } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function getFileIcon(file: BunnyFile) {
  if (file.is_directory) return Folder;
  const ext = getFileExtension(file.name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) return FileImage;
  if (["mp4", "webm", "avi", "mov", "mkv", "flv"].includes(ext)) return FileVideo;
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return FileAudio;
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "dmg", "iso"].includes(ext)) return FileArchive;
  if (["js", "ts", "jsx", "tsx", "html", "css", "json", "xml", "py", "php", "rb", "go", "rs", "swift", "java", "c", "cpp", "h", "sh", "yml", "yaml", "toml", "md"].includes(ext)) return FileCode;
  if (["txt", "doc", "docx", "pdf", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(ext)) return FileText;
  return File;
}

function getFileIconColor(file: BunnyFile): string {
  if (file.is_directory) return "text-primary";
  const ext = getFileExtension(file.name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) return "text-pink-500";
  if (["mp4", "webm", "avi", "mov", "mkv", "flv"].includes(ext)) return "text-purple-500";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) return "text-amber-500";
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "dmg", "iso"].includes(ext)) return "text-orange-500";
  if (["js", "ts", "jsx", "tsx", "html", "css", "json", "xml", "py", "php"].includes(ext)) return "text-emerald-500";
  return "text-muted-foreground";
}

function isImageFile(name: string): boolean {
  const ext = getFileExtension(name);
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BunnyFileExplorer = () => {
  const [files, setFiles] = useState<BunnyFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<BunnyFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<BunnyFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    setLoading(true);
    try {
      const result = await bunnyApi.listFiles(path);
      const sorted = result.files.sort((a: BunnyFile, b: BunnyFile) => {
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

  const navigateTo = (path: string) => {
    setSearchQuery("");
    setCurrentPath(path);
  };

  const goUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const breadcrumbs = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const folderCount = filteredFiles.filter(f => f.is_directory).length;
  const fileCount = filteredFiles.filter(f => !f.is_directory).length;
  const totalSize = filteredFiles.reduce((sum, f) => sum + (f.is_directory ? 0 : f.size), 0);

  // ─── Upload ───────────────────────────────────────────────────────────────

  const processUpload = useCallback(async (fileList: FileList | File[]) => {
    const filesToUpload = Array.from(fileList);
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    let completed = 0;
    try {
      for (const file of filesToUpload) {
        await bunnyApi.uploadFile(file, currentPath);
        completed++;
        setUploadProgress(Math.round((completed / filesToUpload.length) * 100));
      }
      toast.success(`${completed} file${completed !== 1 ? "s" : ""} uploaded successfully`);
      loadFiles(currentPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [currentPath]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processUpload(e.target.files);
  };

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processUpload(e.dataTransfer.files);
    }
  }, [processUpload]);

  // ─── Actions ──────────────────────────────────────────────────────────────

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
    toast.success("CDN URL copied to clipboard");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={dropRef}
        className="relative flex flex-col h-full min-h-[600px]"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary rounded-xl backdrop-blur-sm">
            <div className="text-center">
              <Upload className="w-12 h-12 text-primary mx-auto mb-3 animate-bounce" />
              <p className="text-lg font-semibold text-primary">Drop files here to upload</p>
              <p className="text-sm text-muted-foreground mt-1">Files will be uploaded to: /{currentPath || "root"}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">File Explorer</h2>
            <p className="text-sm text-muted-foreground">Browse, upload, and manage your CDN files</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border border-border rounded-t-xl bg-card">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-wrap">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateTo("")}>
                    <Home className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Home</TooltipContent>
              </Tooltip>
              {currentPath && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goUp}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Go back</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-0.5 text-sm flex-1 min-w-0 overflow-x-auto px-2 py-1 bg-muted/40 rounded-lg">
              <span
                className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors shrink-0"
                onClick={() => navigateTo("")}
              >
                Storage
              </span>
              {breadcrumbs.map((part, i) => (
                <span key={i} className="flex items-center gap-0.5 shrink-0">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span
                    className={cn(
                      "font-medium cursor-pointer transition-colors whitespace-nowrap",
                      i === breadcrumbs.length - 1
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => navigateTo(breadcrumbs.slice(0, i + 1).join("/"))}
                  >
                    {part}
                  </span>
                </span>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter..."
                className="h-8 w-40 pl-8 text-sm"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-none", viewMode === "list" && "bg-muted")}
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-none", viewMode === "grid" && "bg-muted")}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => loadFiles(currentPath)} disabled={loading}>
                    <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowNewFolder(true)}>
                <FolderPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Folder</span>
              </Button>
              <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
              <Button size="sm" className="h-8 gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{uploading ? `${uploadProgress}%` : "Upload"}</span>
              </Button>
            </div>
          </div>

          {/* Upload progress bar */}
          {uploading && (
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Column headers (list view) */}
          {viewMode === "list" && (
            <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/20">
              <div className="flex-1">Name</div>
              <div className="w-20 text-right hidden md:block">Size</div>
              <div className="w-40 text-right hidden lg:block">Modified</div>
              <div className="w-24 text-right">Actions</div>
            </div>
          )}

          {/* File content area */}
          <div className="min-h-[400px]">
            {loading && files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">Loading files...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No files match "{searchQuery}"</p>
                    <Button variant="link" size="sm" onClick={() => setSearchQuery("")} className="mt-1">Clear search</Button>
                  </>
                ) : (
                  <>
                    <Folder className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">This folder is empty</p>
                    <p className="text-xs mt-1">Drag and drop files here or click Upload</p>
                  </>
                )}
              </div>
            ) : viewMode === "list" ? (
              <div className="divide-y divide-border">
                {filteredFiles.map((file) => {
                  const IconComponent = getFileIcon(file);
                  const iconColor = getFileIconColor(file);
                  return (
                    <div
                      key={file.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 transition-colors group",
                        file.is_directory
                          ? "cursor-pointer hover:bg-primary/5"
                          : "hover:bg-muted/40"
                      )}
                      onClick={() => file.is_directory && navigateTo(file.path)}
                    >
                      {/* Thumbnail or icon */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/50">
                        {!file.is_directory && isImageFile(file.name) && file.cdn_url ? (
                          <img
                            src={file.cdn_url}
                            alt={file.name}
                            className="w-8 h-8 rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <IconComponent className={cn("w-4 h-4", iconColor)} />
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{file.name}</span>
                        {file.is_directory && (
                          <span className="text-xs text-muted-foreground">Folder</span>
                        )}
                      </div>

                      {/* Size */}
                      <span className="text-xs text-muted-foreground w-20 text-right hidden md:block tabular-nums">
                        {file.is_directory ? "—" : formatBytes(file.size)}
                      </span>

                      {/* Date */}
                      <span className="text-xs text-muted-foreground w-40 text-right hidden lg:block">
                        {formatDate(file.last_changed)}
                      </span>

                      {/* Actions */}
                      <div className="w-24 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {file.cdn_url && !file.is_directory && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); copyUrl(file.cdn_url!); }}>
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy CDN URL</TooltipContent>
                            </Tooltip>
                            {isImageFile(file.name) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}>
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Preview</TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.cdn_url && (
                              <>
                                <DropdownMenuItem onClick={() => copyUrl(file.cdn_url!)}>
                                  <Copy className="w-3.5 h-3.5 mr-2" /> Copy CDN URL
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={file.cdn_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open in Browser
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(file)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Grid view */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
                {filteredFiles.map((file) => {
                  const IconComponent = getFileIcon(file);
                  const iconColor = getFileIconColor(file);
                  return (
                    <div
                      key={file.path}
                      className={cn(
                        "group relative flex flex-col items-center p-3 rounded-xl border border-transparent transition-all",
                        file.is_directory
                          ? "cursor-pointer hover:bg-primary/5 hover:border-primary/20"
                          : "hover:bg-muted/50 hover:border-border"
                      )}
                      onClick={() => file.is_directory && navigateTo(file.path)}
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-2 bg-muted/40">
                        {!file.is_directory && isImageFile(file.name) && file.cdn_url ? (
                          <img
                            src={file.cdn_url}
                            alt={file.name}
                            className="w-16 h-16 rounded-xl object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <IconComponent className={cn("w-8 h-8", iconColor)} />
                        )}
                      </div>

                      {/* Name */}
                      <p className="text-xs font-medium text-center w-full truncate" title={file.name}>
                        {file.name}
                      </p>
                      {!file.is_directory && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
                      )}

                      {/* Hover actions */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="secondary" size="icon" className="h-6 w-6 shadow-sm">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.cdn_url && (
                              <>
                                <DropdownMenuItem onClick={() => copyUrl(file.cdn_url!)}>
                                  <Copy className="w-3.5 h-3.5 mr-2" /> Copy URL
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={file.cdn_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open
                                  </a>
                                </DropdownMenuItem>
                                {isImageFile(file.name) && (
                                  <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                                    <Eye className="w-3.5 h-3.5 mr-2" /> Preview
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(file)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {folderCount > 0 && (
                <span>{folderCount} folder{folderCount !== 1 ? "s" : ""}</span>
              )}
              {fileCount > 0 && (
                <span>{fileCount} file{fileCount !== 1 ? "s" : ""}</span>
              )}
              {fileCount === 0 && folderCount === 0 && <span>Empty</span>}
            </div>
            {totalSize > 0 && (
              <span>{formatBytes(totalSize)}</span>
            )}
          </div>
        </div>

        {/* ─── Dialogs ─────────────────────────────────────────────────────── */}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleteTarget?.is_directory ? "Folder" : "File"}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
                {deleteTarget?.is_directory && " This will delete all contents inside."}
                <br />This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Folder Dialog */}
        <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                Create New Folder
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Creating in: <span className="font-medium text-foreground">/{currentPath || "root"}</span>
              </p>
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}>
                {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FolderPlus className="w-4 h-4 mr-1.5" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Preview Dialog */}
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{previewFile?.name}</DialogTitle>
            </DialogHeader>
            {previewFile?.cdn_url && (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center min-h-[200px]">
                  <img
                    src={previewFile.cdn_url}
                    alt={previewFile.name}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatBytes(previewFile.size)}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyUrl(previewFile.cdn_url!)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy URL
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={previewFile.cdn_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
