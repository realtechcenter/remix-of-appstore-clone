import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Edit, Trash2, LogOut, Package, Layers, Search, X, Save, ArrowLeft, 
  ChevronLeft, ChevronRight, Users, BarChart3, Bell, Shield, Activity, 
  UserX, Link, Tag, Play, Home, Menu, Download, Star, TrendingUp, Settings2, Loader2, ClipboardPaste, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { appsApi, versionsApi, authApi, type App, type AppVersion, type AppDownloadLinkInput, type VersionInput } from "@/lib/api";
import { FileUpload, ScreenshotUpload } from "@/components/FileUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import { UserManagement } from "@/components/admin/UserManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { AppReviewSystem } from "@/components/admin/AppReviewSystem";
import { NotificationSystem } from "@/components/admin/NotificationSystem";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { ActivityLogs } from "@/components/admin/ActivityLogs";
import { UserStatusManagement } from "@/components/admin/UserStatusManagement";
import { CouponManagement } from "@/components/admin/CouponManagement";
import { PaymentHistoryAdmin } from "@/components/admin/PaymentHistoryAdmin";
import { cn } from "@/lib/utils";
import { SystemSettingsPanel } from "@/components/admin/SystemSettings";
import { useAuth } from "@/contexts/AuthContext";


// ─── Types ────────────────────────────────────────────────────────────────────
type AppFormData = Omit<Partial<App>, 'screenshots' | 'videos'> & {
  screenshots?: string[];
  videos?: { title: string; youtube_url: string }[];
};

interface AppFormProps {
  app?: App;
  onSave: (data: AppFormData) => Promise<void>;
  onCancel: () => void;
}

// ─── App Form ─────────────────────────────────────────────────────────────────
const AppForm = ({ app, onSave, onCancel }: AppFormProps) => {
  const [formData, setFormData] = useState<Partial<App>>({
    name: app?.name || "", name_km: app?.name_km || "",
    description: app?.description || "", description_km: app?.description_km || "",
    category: app?.category || "programs", icon_url: app?.icon_url || "",
    developer: app?.developer || "", website: app?.website || "",
    is_featured: app?.is_featured || false, is_popular: app?.is_popular || false,
    price: app?.price || 0,
  });
  const [screenshots, setScreenshots] = useState<string[]>(app?.screenshots?.map(s => s.image_url) || []);
  const [videos, setVideos] = useState<{ title: string; youtube_url: string }[]>(
    app?.videos?.map(v => ({ title: v.title, youtube_url: v.youtube_url })) || []
  );
  const [saving, setSaving] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState<number | null>(null);

  const fetchYouTubeTitle = async (url: string, index: number) => {
    try {
      setFetchingTitle(index);
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        setVideos(prev => { const u = [...prev]; u[index] = { ...u[index], title: data.title }; return u; });
      } else {
        toast.error("Could not fetch video title");
      }
    } catch { toast.error("Could not fetch video title"); }
    finally { setFetchingTitle(null); }
  };

  const handlePasteYouTubeUrl = async (index: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes("youtube.com") || text.includes("youtu.be"))) {
        setVideos(prev => { const u = [...prev]; u[index] = { ...u[index], youtube_url: text }; return u; });
        await fetchYouTubeTitle(text, index);
      } else {
        toast.error("Clipboard doesn't contain a YouTube URL");
      }
    } catch { toast.error("Cannot access clipboard"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave({ ...formData, screenshots, videos }); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">App Name (English) *</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="name_km">ឈ្មោះកម្មវិធី (ខ្មែរ)</Label>
          <Input id="name_km" value={formData.name_km} onChange={(e) => setFormData({ ...formData, name_km: e.target.value })} className="mt-1.5" />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description (English)</Label>
        <RichTextEditor value={formData.description || ''} onChange={(html) => setFormData({ ...formData, description: html })} minHeight="150px" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="description_km">ការពិពណ៌នា (ខ្មែរ)</Label>
        <RichTextEditor value={formData.description_km || ''} onChange={(html) => setFormData({ ...formData, description_km: html })} minHeight="150px" className="mt-1.5" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as App["category"] })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="programs">Programs</SelectItem>
              <SelectItem value="games">Games</SelectItem>
              <SelectItem value="extensions">Extensions</SelectItem>
              <SelectItem value="os">Operating Systems</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="developer">Developer</Label>
          <Input id="developer" value={formData.developer} onChange={(e) => setFormData({ ...formData, developer: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="website">Website URL</Label>
          <Input id="website" type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input id="price" type="number" min="0" step="0.01" value={formData.price || ""} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="pl-7" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <Label>App Icon</Label>
        <div className="flex items-start gap-4">
          <FileUpload type="icons" currentUrl={formData.icon_url} onUpload={(url) => setFormData({ ...formData, icon_url: url })} label="" />
          <div className="flex-1 space-y-1">
            <Input
              type="text"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
              placeholder="https://example.com/icon.png"
              className="text-sm"
            />
          </div>
        </div>
      </div>
      <ScreenshotUpload screenshots={screenshots} onUpdate={setScreenshots} />
      <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-destructive" />
            <Label className="text-base font-medium">YouTube Videos</Label>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setVideos([...videos, { title: '', youtube_url: '' }])} className="gap-1">
            <Plus className="w-3 h-3" /> Add Video
          </Button>
        </div>
        {videos.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">No videos added.</p>}
        {videos.map((video, index) => {
          const getYouTubeId = (url: string) => {
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
            return match ? match[1] : null;
          };
          const videoId = getYouTubeId(video.youtube_url);
          return (
            <div key={index} className="p-4 bg-background rounded-lg border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Video {index + 1}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setVideos(videos.filter((_, i) => i !== index))}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {videoId && (
                <div className="w-full aspect-video rounded-md overflow-hidden border border-border">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={video.title || "YouTube video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={video.title} onChange={(e) => { const u=[...videos]; u[index]={...u[index],title:e.target.value}; setVideos(u); }} placeholder="Video title (auto-filled on paste)" className="text-sm" />
                  {fetchingTitle === index && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
                </div>
                <div className="flex items-center gap-2">
                  <Input type="url" value={video.youtube_url} onChange={(e) => {
                    const u=[...videos]; u[index]={...u[index],youtube_url:e.target.value}; setVideos(u);
                  }} onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (text && (text.includes("youtube.com") || text.includes("youtu.be"))) {
                      setTimeout(() => fetchYouTubeTitle(text, index), 100);
                    }
                  }} placeholder="https://youtube.com/watch?v=..." className="text-sm" />
                  <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => handlePasteYouTubeUrl(index)} title="Paste from clipboard">
                    <ClipboardPaste className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Switch id="is_featured" checked={formData.is_featured} onCheckedChange={(c) => setFormData({ ...formData, is_featured: c })} />
          <Label htmlFor="is_featured">Featured App</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="is_popular" checked={formData.is_popular} onCheckedChange={(c) => setFormData({ ...formData, is_popular: c })} />
          <Label htmlFor="is_popular">Popular App</Label>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : "Save App"}
        </Button>
      </div>
    </form>
  );
};

// ─── Version Form ─────────────────────────────────────────────────────────────
interface VersionFormProps {
  appId: number;
  version?: AppVersion;
  onSave: (data: VersionInput) => Promise<void>;
  onCancel: () => void;
}

const VersionForm = ({ appId, version, onSave, onCancel }: VersionFormProps) => {
  const [formData, setFormData] = useState<Omit<Partial<AppVersion>, 'download_links'>>({
    app_id: appId, version: version?.version || "",
    release_date: version?.release_date || new Date().toISOString().split("T")[0],
    changelog: version?.changelog || "", changelog_km: version?.changelog_km || "",
    file_size: version?.file_size || "", download_url: version?.download_url || "",
    is_latest: version?.is_latest || false, min_os_version: version?.min_os_version || "",
    architecture: version?.architecture || "",
  });
  const [downloadLinks, setDownloadLinks] = useState<AppDownloadLinkInput[]>(
    version?.download_links?.map(link => ({ id: link.id, title: link.title, url: link.url, link_type: link.link_type || 'direct', sort_order: link.sort_order })) || []
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ ...formData, download_links: downloadLinks }); } finally { setSaving(false); }
  };

  const addDownloadLink = () => setDownloadLinks([...downloadLinks, { title: "", url: "", link_type: 'direct', sort_order: downloadLinks.length }]);
  const updateDownloadLink = (index: number, field: keyof AppDownloadLinkInput, value: string | number) => {
    const updated = [...downloadLinks]; updated[index] = { ...updated[index], [field]: value }; setDownloadLinks(updated);
  };
  const removeDownloadLink = (index: number) => setDownloadLinks(downloadLinks.filter((_, i) => i !== index));
  const moveDownloadLink = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === downloadLinks.length - 1)) return;
    const updated = [...downloadLinks]; const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((link, i) => { link.sort_order = i; }); setDownloadLinks(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="version">Version *</Label>
          <Input id="version" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} placeholder="1.0.0" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="release_date">Release Date</Label>
          <Input id="release_date" type="date" value={formData.release_date} onChange={(e) => setFormData({ ...formData, release_date: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="file_size">File Size</Label>
          <Input id="file_size" value={formData.file_size} onChange={(e) => setFormData({ ...formData, file_size: e.target.value })} placeholder="150 MB" className="mt-1.5" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="min_os_version">Minimum OS Version</Label>
          <Input id="min_os_version" value={formData.min_os_version} onChange={(e) => setFormData({ ...formData, min_os_version: e.target.value })} placeholder="macOS 12.0" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="architecture">Architecture</Label>
          <Select value={formData.architecture || ""} onValueChange={(value) => setFormData({ ...formData, architecture: value })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select architecture" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="x64">x64 (Intel/AMD)</SelectItem>
              <SelectItem value="arm64">ARM64 (Apple Silicon)</SelectItem>
              <SelectItem value="universal">Universal (x64 + ARM64)</SelectItem>
              <SelectItem value="x86">x86 (32-bit)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-3">
        <Label>Legacy Download URL (optional)</Label>
        <div className="flex items-start gap-4">
          <FileUpload type="versions" currentUrl={formData.download_url} onUpload={(url) => setFormData({ ...formData, download_url: url })} label="" />
          <div className="flex-1">
            <Input type="url" value={formData.download_url} onChange={(e) => setFormData({ ...formData, download_url: e.target.value })} placeholder="Or paste download URL..." className="text-sm" />
          </div>
        </div>
      </div>
      <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-primary" />
            <Label className="text-base font-medium">Download Links</Label>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addDownloadLink} className="gap-1">
            <Plus className="w-3 h-3" /> Add Link
          </Button>
        </div>
        {downloadLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No download links yet.</p>
        ) : (
          <div className="space-y-3">
            {downloadLinks.map((link, index) => (
              <div key={index} className="flex items-start gap-2 bg-background p-3 rounded-lg border border-border">
                <div className="flex flex-col gap-1 pt-2">
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDownloadLink(index, 'up')} disabled={index === 0}>
                    <ChevronLeft className="w-3 h-3 rotate-90" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDownloadLink(index, 'down')} disabled={index === downloadLinks.length - 1}>
                    <ChevronRight className="w-3 h-3 rotate-90" />
                  </Button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input value={link.title} onChange={(e) => updateDownloadLink(index, 'title', e.target.value)} placeholder="Link title" className="text-sm" />
                    <Input type="url" value={link.url} onChange={(e) => updateDownloadLink(index, 'url', e.target.value)} placeholder="https://..." className="text-sm" />
                    <select value={link.link_type} onChange={(e) => updateDownloadLink(index, 'link_type', e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="direct">Direct Download</option>
                      <option value="page">Download Page</option>
                    </select>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeDownloadLink(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="changelog">Changelog (English)</Label>
        <RichTextEditor value={formData.changelog || ''} onChange={(html) => setFormData({ ...formData, changelog: html })} minHeight="100px" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="changelog_km">កំណត់ហេតុ (ខ្មែរ)</Label>
        <RichTextEditor value={formData.changelog_km || ''} onChange={(html) => setFormData({ ...formData, changelog_km: html })} minHeight="100px" className="mt-1.5" />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="is_latest" checked={formData.is_latest} onCheckedChange={(c) => setFormData({ ...formData, is_latest: c })} />
        <Label htmlFor="is_latest">Mark as Latest Version</Label>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border sticky bottom-0 bg-background">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : "Save Version"}
        </Button>
      </div>
    </form>
  );
};

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────
type AdminTab = "analytics" | "apps" | "users" | "payments" | "roles" | "notifications" | "activity" | "status" | "coupons" | "reviews" | "settings";

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
  permission?: string; // Required permission to see this tab
}

const navItems: NavItem[] = [
  { id: "analytics", label: "Analytics", icon: BarChart3, permission: "analytics.view" },
  { id: "apps", label: "Apps", icon: Package, permission: "apps.view" },
  { id: "users", label: "Users", icon: Users, permission: "users.view" },
  { id: "payments", label: "Payments", icon: TrendingUp, permission: "orders.view" },
  { id: "reviews", label: "Reviews", icon: Star, permission: "reviews.manage" },
  { id: "roles", label: "Roles", icon: Shield, permission: "roles.manage" },
  { id: "notifications", label: "Notifications", icon: Bell, permission: "notifications.manage" },
  { id: "activity", label: "Activity", icon: Activity, permission: "activity.view" },
  { id: "status", label: "Ban / Suspend", icon: UserX, permission: "user_status.manage" },
  { id: "coupons", label: "Coupons", icon: Tag, permission: "coupons.manage" },
  { id: "settings", label: "Settings", icon: Settings2, permission: "settings.manage" },
];

// ─── Apps Tab ─────────────────────────────────────────────────────────────────
const AppsTab = () => {
  const { isAdmin: isAuthAdmin, hasPermission } = useAuth();
  const isLegacyAdmin = authApi.isAuthenticated();
  const isAdmin = isAuthAdmin || isLegacyAdmin;
  const canDelete = isAdmin || hasPermission('apps.delete');
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [showAppForm, setShowAppForm] = useState(false);
  const [editingApp, setEditingApp] = useState<App | undefined>();
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersion | undefined>();
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApps, setTotalApps] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => { loadApps(); }, [currentPage, searchQuery]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const response = await appsApi.getAll({ page: currentPage, limit: itemsPerPage, search: searchQuery || undefined });
      setApps(response.data || []); setTotalPages(response.pagination?.total_pages || 1); setTotalApps(response.pagination?.total || 0);
    } catch { toast.error("Failed to load apps"); setApps([]); } finally { setLoading(false); }
  };

  const loadAppVersions = async (appId: number) => {
    try { const v = await versionsApi.getByAppId(appId); setAppVersions(v); }
    catch { toast.error("Failed to load versions"); }
  };

  const handleSelectApp = async (app: App) => { setSelectedApp(app); await loadAppVersions(app.id); };

  const [editLoading, setEditLoading] = useState(false);
  const handleEditApp = async (app: App) => {
    setEditLoading(true);
    try { const full = await appsApi.getById(app.id, true); setEditingApp(full); }
    catch { setEditingApp(app); }
    finally { setEditLoading(false); }
    setShowAppForm(true);
  };

  const handleSaveApp = async (data: AppFormData) => {
    try {
      if (editingApp) { await appsApi.update(editingApp.id, data); toast.success("App updated!"); }
      else { await appsApi.create(data); toast.success("App created!"); }
      setShowAppForm(false); setEditingApp(undefined); loadApps();
    } catch { toast.error("Failed to save app"); }
  };

  const [deletingAppId, setDeletingAppId] = useState<number | null>(null);
  const handleDeleteApp = async (app: App) => {
    if (!confirm(`Delete "${app.name}"?`)) return;
    setDeletingAppId(app.id);
    try { await appsApi.delete(app.id); toast.success("App deleted!"); if (selectedApp?.id === app.id) setSelectedApp(null); loadApps(); }
    catch { toast.error("Failed to delete app"); }
    finally { setDeletingAppId(null); }
  };

  const handleSaveVersion = async (data: VersionInput) => {
    try {
      if (editingVersion) { await versionsApi.update(editingVersion.id, data); toast.success("Version updated!"); }
      else { await versionsApi.create(data); toast.success("Version created!"); }
      setShowVersionForm(false); setEditingVersion(undefined);
      if (selectedApp) loadAppVersions(selectedApp.id);
    } catch { toast.error("Failed to save version"); }
  };

  const [deletingVersionId, setDeletingVersionId] = useState<number | null>(null);
  const handleDeleteVersion = async (version: AppVersion) => {
    if (!confirm(`Delete version "${version.version}"?`)) return;
    setDeletingVersionId(version.id);
    try { await versionsApi.delete(version.id); toast.success("Version deleted!"); if (selectedApp) loadAppVersions(selectedApp.id); }
    catch { toast.error("Failed to delete version"); }
    finally { setDeletingVersionId(null); }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
        {/* Left: App List */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-medium">{totalApps} total apps</p>
            <Button size="sm" onClick={() => { setEditingApp(undefined); setShowAppForm(true); }} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New App
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search apps..." className="pl-9" />
          </div>
          <div className="flex flex-col gap-1.5 max-h-[calc(100vh-320px)] overflow-y-auto">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))
            ) : apps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No apps found</div>
            ) : apps.map((app) => (
              <button key={app.id} onClick={() => handleSelectApp(app)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3",
                  selectedApp?.id === app.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40 bg-card hover:bg-accent/30"
                )}>
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{app.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground capitalize">{app.category}</span>
                    {app.is_featured && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">Featured</span>}
                    {app.price && (typeof app.price === 'string' ? parseFloat(app.price) : app.price) > 0 ? (
                      <span className="text-[10px] font-semibold text-foreground">${(typeof app.price === 'string' ? parseFloat(app.price) : app.price).toFixed(2)}</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Free</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Download className="w-3 h-3" />
                  <span>{(app.download_count || 0).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right: App Details */}
        <div className="lg:col-span-3">
          {selectedApp ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* App Hero */}
              <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {selectedApp.icon_url ? (
                      <img src={selectedApp.icon_url} alt={selectedApp.name} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold">{selectedApp.name}</h2>
                      {selectedApp.name_km && <p className="text-muted-foreground text-sm">{selectedApp.name_km}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs capitalize">{selectedApp.category}</Badge>
                        {selectedApp.developer && <span className="text-xs text-muted-foreground">by {selectedApp.developer}</span>}
                        {selectedApp.is_featured && <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Featured</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleEditApp(selectedApp)} disabled={editLoading}>
                      {editLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Edit className="w-3.5 h-3.5 mr-1.5" />}
                      {editLoading ? "Loading..." : "Edit"}
                    </Button>
                    {canDelete && (
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteApp(selectedApp)} disabled={deletingAppId === selectedApp.id}>
                        {deletingAppId === selectedApp.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                        {deletingAppId === selectedApp.id ? "Deleting..." : "Delete"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: "Downloads", value: (selectedApp.download_count || 0).toLocaleString(), icon: Download },
                    { label: "Price", value: selectedApp.price && (typeof selectedApp.price === 'string' ? parseFloat(selectedApp.price) : selectedApp.price) > 0 ? `$${(typeof selectedApp.price === 'string' ? parseFloat(selectedApp.price) : selectedApp.price).toFixed(2)}` : "Free", icon: TrendingUp },
                    { label: "Versions", value: appVersions.length, icon: Layers },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-background/70 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs">{label}</span>
                      </div>
                      <p className="font-semibold text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="p-4">
                <Tabs defaultValue="versions">
                  <TabsList className="mb-4">
                    <TabsTrigger value="versions" className="gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Versions ({appVersions.length})
                    </TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  <TabsContent value="versions" className="space-y-3">
                    <Button size="sm" onClick={() => { setEditingVersion(undefined); setShowVersionForm(true); }} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add Version
                    </Button>
                    {appVersions.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
                        No versions yet. Add the first version!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {appVersions.map((version) => (
                          <div key={version.id} className="p-3 bg-muted/40 rounded-lg flex items-center justify-between border border-border/50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-sm">{version.version}</span>
                                {version.is_latest && <Badge variant="outline" className="text-xs border-primary/30 text-primary">Latest</Badge>}
                                {version.architecture && <Badge variant="secondary" className="text-xs">{version.architecture}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {version.release_date}{version.file_size ? ` • ${version.file_size}` : ""}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingVersion(version); setShowVersionForm(true); }}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              {canDelete && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteVersion(version)} disabled={deletingVersionId === version.id}>
                                  {deletingVersionId === version.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="details">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {[
                        { label: "Category", value: selectedApp.category },
                        { label: "Developer", value: selectedApp.developer || "—" },
                        { label: "Website", value: selectedApp.website || "—" },
                        { label: "Featured", value: selectedApp.is_featured ? "Yes" : "No" },
                        { label: "Popular", value: selectedApp.is_popular ? "Yes" : "No" },
                        { label: "Downloads", value: (selectedApp.download_count || 0).toLocaleString() },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="font-medium capitalize truncate">{value}</p>
                        </div>
                      ))}
                      {selectedApp.description && (
                        <div className="col-span-2 p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Description (EN)</p>
                          <p className="text-sm leading-relaxed">{selectedApp.description}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold">Select an App</h3>
              <p className="text-sm text-muted-foreground mt-1">Choose an app from the list to manage its details and versions</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAppForm} onOpenChange={setShowAppForm}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingApp ? "Edit App" : "Add New App"}</DialogTitle></DialogHeader>
          <AppForm app={editingApp} onSave={handleSaveApp} onCancel={() => { setShowAppForm(false); setEditingApp(undefined); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={showVersionForm} onOpenChange={setShowVersionForm}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingVersion ? "Edit Version" : "Add New Version"}</DialogTitle></DialogHeader>
          {selectedApp && (
            <VersionForm appId={selectedApp.id} version={editingVersion} onSave={handleSaveVersion} onCancel={() => { setShowVersionForm(false); setEditingVersion(undefined); }} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin: isAuthAdmin, isSuperAdmin, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Legacy admin gets full admin access
  const isLegacyAdmin = authApi.isAuthenticated();
  const isAdmin = isAuthAdmin || isLegacyAdmin;

  // Filter nav items based on permissions (legacy admin & admin role see all)
  const visibleNavItems = navItems.filter(item => 
    isAdmin || !item.permission || hasPermission(item.permission)
  );
  const [activeTab, setActiveTab] = useState<AdminTab>(visibleNavItems[0]?.id || "apps");

  const handleLogout = async () => {
    authApi.logout();
    await signOut();
    navigate("/");
  };

  const activeItem = visibleNavItems.find(n => n.id === activeTab);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-none">Admin Panel</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSuperAdmin ? "Super Admin" : isAdmin ? "Administrator" : "Moderator"}
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className={cn(
                    "text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Sidebar Footer */}
        <div className="p-3 border-t border-border space-y-1">
          {user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Moderator"}
                </Badge>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Back to Store</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            {activeItem && <activeItem.icon className="w-4 h-4 text-muted-foreground shrink-0" />}
            <h1 className="font-semibold text-base truncate">{activeItem?.label}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="hidden sm:flex gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Store
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Page Content - tabs are already filtered by visibleNavItems so no need for extra permission checks */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "apps" && <AppsTab />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "payments" && <PaymentHistoryAdmin />}
          {activeTab === "reviews" && <AppReviewSystem />}
          {activeTab === "roles" && <RoleManagement />}
          {activeTab === "notifications" && <NotificationSystem />}
          {activeTab === "activity" && <ActivityLogs />}
          {activeTab === "status" && <UserStatusManagement />}
          {activeTab === "coupons" && <CouponManagement />}
          {activeTab === "settings" && <SystemSettingsPanel />}
        </main>
      </div>
    </div>
  );
};

// ─── Access Denied Page ──────────────────────────────────────────────────────
const AccessDenied = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access the admin panel. Contact an administrator to get the required role.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-2" /> Back to Store
          </Button>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Sign in with another account
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const Admin = () => {
  const { user, loading, isAdminOrModerator } = useAuth();
  const navigate = useNavigate();

  // Also check legacy admin auth for backward compatibility
  const isLegacyAdmin = authApi.isAuthenticated();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user is not logged in at all (no user auth and no legacy admin auth)
  if (!user && !isLegacyAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access the admin panel</p>
          <Button onClick={() => navigate("/auth")} className="w-full">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Legacy admin auth (backward compatible)
  if (isLegacyAdmin) {
    return <AdminDashboard />;
  }

  // User is logged in but doesn't have admin/moderator role
  if (!isAdminOrModerator) {
    return <AccessDenied />;
  }

  return <AdminDashboard />;
};

export default Admin;
