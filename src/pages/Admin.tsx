import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, LogOut, Package, Layers, Search, X, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { appsApi, versionsApi, authApi, type App, type AppVersion } from "@/lib/api";
import { FileUpload, ScreenshotUpload } from "@/components/FileUpload";

const AdminLogin = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await authApi.login(username, password);
      toast.success("ចូលបានជោគជ័យ / Login successful");
      onLogin();
    } catch (error) {
      toast.error("ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ / Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl p-6 sm:p-8 border border-border">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">ចូលដើម្បីគ្រប់គ្រងកម្មវិធី / Sign in to manage apps</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="username">ឈ្មោះអ្នកប្រើប្រាស់ / Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">ពាក្យសម្ងាត់ / Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "កំពុងចូល..." : "ចូល / Login"}
          </Button>
        </form>
      </div>
    </div>
  );
};

type AppFormData = Omit<Partial<App>, 'screenshots'> & {
  screenshots?: string[];
};

interface AppFormProps {
  app?: App;
  onSave: (data: AppFormData) => Promise<void>;
  onCancel: () => void;
}

const AppForm = ({ app, onSave, onCancel }: AppFormProps) => {
  const [formData, setFormData] = useState<Partial<App>>({
    name: app?.name || "",
    name_km: app?.name_km || "",
    description: app?.description || "",
    description_km: app?.description_km || "",
    category: app?.category || "programs",
    icon_url: app?.icon_url || "",
    developer: app?.developer || "",
    website: app?.website || "",
    is_featured: app?.is_featured || false,
  });
  // Initialize screenshots from existing app data
  const [screenshots, setScreenshots] = useState<string[]>(
    app?.screenshots?.map(s => s.image_url) || []
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Include screenshots in the save data
      await onSave({ ...formData, screenshots });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">App Name (English) *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="name_km">ឈ្មោះកម្មវិធី (ខ្មែរ)</Label>
          <Input
            id="name_km"
            value={formData.name_km}
            onChange={(e) => setFormData({ ...formData, name_km: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description">Description (English)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="description_km">ការពិពណ៌នា (ខ្មែរ)</Label>
          <Textarea
            id="description_km"
            value={formData.description_km}
            onChange={(e) => setFormData({ ...formData, description_km: e.target.value })}
            rows={3}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value as App["category"] })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
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
          <Input
            id="developer"
            value={formData.developer}
            onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>App Icon</Label>
        <div className="flex items-start gap-4">
          <FileUpload
            type="icons"
            currentUrl={formData.icon_url}
            onUpload={(url) => setFormData({ ...formData, icon_url: url })}
            label=""
          />
          <div className="flex-1">
            <Input
              type="url"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
              placeholder="Or paste icon URL..."
              className="text-sm"
            />
          </div>
        </div>
      </div>

      <ScreenshotUpload
        screenshots={screenshots}
        onUpdate={setScreenshots}
      />

      <div className="flex items-center gap-2">
        <Switch
          id="is_featured"
          checked={formData.is_featured}
          onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
        />
        <Label htmlFor="is_featured">Featured App (បង្ហាញជាពិសេស)</Label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save App"}
        </Button>
      </div>
    </form>
  );
};

interface VersionFormProps {
  appId: number;
  version?: AppVersion;
  onSave: (data: Partial<AppVersion>) => Promise<void>;
  onCancel: () => void;
}

const VersionForm = ({ appId, version, onSave, onCancel }: VersionFormProps) => {
  const [formData, setFormData] = useState<Partial<AppVersion>>({
    app_id: appId,
    version: version?.version || "",
    release_date: version?.release_date || new Date().toISOString().split("T")[0],
    changelog: version?.changelog || "",
    changelog_km: version?.changelog_km || "",
    file_size: version?.file_size || "",
    download_url: version?.download_url || "",
    is_latest: version?.is_latest || false,
    min_os_version: version?.min_os_version || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="version">Version *</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="1.0.0"
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="release_date">Release Date</Label>
          <Input
            id="release_date"
            type="date"
            value={formData.release_date}
            onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="file_size">File Size</Label>
          <Input
            id="file_size"
            value={formData.file_size}
            onChange={(e) => setFormData({ ...formData, file_size: e.target.value })}
            placeholder="150 MB"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Download File</Label>
        <div className="flex items-start gap-4">
          <FileUpload
            type="versions"
            currentUrl={formData.download_url}
            onUpload={(url) => setFormData({ ...formData, download_url: url })}
            label=""
          />
          <div className="flex-1">
            <Input
              type="url"
              value={formData.download_url}
              onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
              placeholder="Or paste download URL..."
              className="text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="min_os_version">Minimum OS Version</Label>
        <Input
          id="min_os_version"
          value={formData.min_os_version}
          onChange={(e) => setFormData({ ...formData, min_os_version: e.target.value })}
          placeholder="macOS 12.0"
          className="mt-1.5"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="changelog">Changelog (English)</Label>
          <Textarea
            id="changelog"
            value={formData.changelog}
            onChange={(e) => setFormData({ ...formData, changelog: e.target.value })}
            rows={3}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="changelog_km">កំណត់ហេតុផ្លាស់ប្តូរ (ខ្មែរ)</Label>
          <Textarea
            id="changelog_km"
            value={formData.changelog_km}
            onChange={(e) => setFormData({ ...formData, changelog_km: e.target.value })}
            rows={3}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="is_latest"
          checked={formData.is_latest}
          onCheckedChange={(checked) => setFormData({ ...formData, is_latest: checked })}
        />
        <Label htmlFor="is_latest">Mark as Latest Version (កំណែចុងក្រោយបំផុត)</Label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Version"}
        </Button>
      </div>
    </form>
  );
};

const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [showAppForm, setShowAppForm] = useState(false);
  const [editingApp, setEditingApp] = useState<App | undefined>();
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersion | undefined>();
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const response = await appsApi.getAll({ limit: 100 });
      setApps(response.data || []);
    } catch (error) {
      toast.error("Failed to load apps");
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAppVersions = async (appId: number) => {
    try {
      const versions = await versionsApi.getByAppId(appId);
      setAppVersions(versions);
    } catch (error) {
      toast.error("Failed to load versions");
    }
  };

  const handleSelectApp = async (app: App) => {
    setSelectedApp(app);
    await loadAppVersions(app.id);
  };

  const handleEditApp = async (app: App) => {
    try {
      // Fetch full app details including screenshots
      const fullAppData = await appsApi.getById(app.id);
      setEditingApp(fullAppData);
      setShowAppForm(true);
    } catch (error) {
      console.error('Failed to load app details:', error);
      // Fallback to using existing data
      setEditingApp(app);
      setShowAppForm(true);
    }
  };

  const handleSaveApp = async (data: AppFormData) => {
    try {
      if (editingApp) {
        await appsApi.update(editingApp.id, data);
        toast.success("App updated successfully!");
      } else {
        await appsApi.create(data);
        toast.success("App created successfully!");
      }
      setShowAppForm(false);
      setEditingApp(undefined);
      loadApps();
    } catch (error) {
      toast.error("Failed to save app");
    }
  };

  const handleDeleteApp = async (app: App) => {
    if (!confirm(`Are you sure you want to delete "${app.name}"?`)) return;
    
    try {
      await appsApi.delete(app.id);
      toast.success("App deleted successfully!");
      if (selectedApp?.id === app.id) {
        setSelectedApp(null);
      }
      loadApps();
    } catch (error) {
      toast.error("Failed to delete app");
    }
  };

  const handleSaveVersion = async (data: Partial<AppVersion>) => {
    try {
      if (editingVersion) {
        await versionsApi.update(editingVersion.id, data);
        toast.success("Version updated successfully!");
      } else {
        await versionsApi.create(data);
        toast.success("Version created successfully!");
      }
      setShowVersionForm(false);
      setEditingVersion(undefined);
      if (selectedApp) {
        loadAppVersions(selectedApp.id);
      }
    } catch (error) {
      toast.error("Failed to save version");
    }
  };

  const handleDeleteVersion = async (version: AppVersion) => {
    if (!confirm(`Are you sure you want to delete version "${version.version}"?`)) return;
    
    try {
      await versionsApi.delete(version.id);
      toast.success("Version deleted successfully!");
      if (selectedApp) {
        loadAppVersions(selectedApp.id);
      }
    } catch (error) {
      toast.error("Failed to delete version");
    }
  };

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.name_km?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    authApi.logout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="hidden xs:block">
                <h1 className="font-semibold text-sm sm:text-base">Admin Panel</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">គ្រប់គ្រងកម្មវិធី / Manage Apps</p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} size="sm" className="gap-1 sm:gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Apps List */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold">Apps ({apps.length})</h2>
              <Button size="sm" onClick={() => { setEditingApp(undefined); setShowAppForm(true); }} className="gap-1">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add App</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps..."
                className="pl-9"
              />
            </div>

            <div className="space-y-2 max-h-[40vh] lg:max-h-[calc(100vh-280px)] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No apps found</div>
              ) : (
                filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleSelectApp(app)}
                    className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedApp?.id === app.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {app.icon_url ? (
                        <img src={app.icon_url} alt={app.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-sm sm:text-base">{app.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{app.name_km}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] sm:text-xs bg-accent px-2 py-0.5 rounded">{app.category}</span>
                          {app.is_featured && (
                            <span className="text-[10px] sm:text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Featured</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* App Details & Versions */}
          <div className="lg:col-span-2">
            {selectedApp ? (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {selectedApp.icon_url ? (
                      <img src={selectedApp.icon_url} alt={selectedApp.name} className="w-20 h-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
                        <Package className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold">{selectedApp.name}</h2>
                      {selectedApp.name_km && <p className="text-muted-foreground">{selectedApp.name_km}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{selectedApp.developer}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditApp(selectedApp)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteApp(selectedApp)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="versions">
                  <TabsList>
                    <TabsTrigger value="versions" className="gap-2">
                      <Layers className="w-4 h-4" />
                      Versions ({appVersions.length})
                    </TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="versions" className="mt-4 space-y-4">
                    <Button size="sm" onClick={() => { setEditingVersion(undefined); setShowVersionForm(true); }}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Version
                    </Button>
                    
                    {appVersions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                        No versions yet. Add the first version!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appVersions.map((version) => (
                          <div
                            key={version.id}
                            className="p-4 bg-accent/50 rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{version.version}</span>
                                {version.is_latest && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Latest</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {version.release_date} • {version.file_size || "Size unknown"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingVersion(version); setShowVersionForm(true); }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteVersion(version)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="details" className="mt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Category:</span>
                        <p className="font-medium capitalize">{selectedApp.category}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Downloads:</span>
                        <p className="font-medium">{selectedApp.download_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Website:</span>
                        <p className="font-medium truncate">{selectedApp.website || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Featured:</span>
                        <p className="font-medium">{selectedApp.is_featured ? "Yes" : "No"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Description (EN):</span>
                        <p className="font-medium mt-1">{selectedApp.description || "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Description (KM):</span>
                        <p className="font-medium mt-1">{selectedApp.description_km || "—"}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Select an app</h3>
                <p className="text-muted-foreground mt-1">Choose an app from the list to view details and manage versions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* App Form Dialog */}
      <Dialog open={showAppForm} onOpenChange={setShowAppForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingApp ? "Edit App" : "Add New App"}</DialogTitle>
          </DialogHeader>
          <AppForm
            app={editingApp}
            onSave={handleSaveApp}
            onCancel={() => { setShowAppForm(false); setEditingApp(undefined); }}
          />
        </DialogContent>
      </Dialog>

      {/* Version Form Dialog */}
      <Dialog open={showVersionForm} onOpenChange={setShowVersionForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVersion ? "Edit Version" : "Add New Version"}</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <VersionForm
              appId={selectedApp.id}
              version={editingVersion}
              onSave={handleSaveVersion}
              onCancel={() => { setShowVersionForm(false); setEditingVersion(undefined); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(authApi.isAuthenticated());

  return isAuthenticated ? (
    <AdminDashboard onLogout={() => setIsAuthenticated(false)} />
  ) : (
    <AdminLogin onLogin={() => setIsAuthenticated(true)} />
  );
};

export default Admin;
