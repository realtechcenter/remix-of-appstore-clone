import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Download, Calendar, HardDrive, ExternalLink, Package, ChevronLeft, 
  ChevronRight, X, Shield, History, ArrowLeft, Home, Search, Sparkles,
  Box, Gamepad2, Puzzle, LayoutGrid, ChevronDown
} from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { appsApi, versionsApi, type AppVersion } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useDownload } from "@/hooks/useDownload";
import { DownloadProgress } from "@/components/DownloadProgress";

const getGradientFromName = (name: string): string => {
  const gradients = [
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-green-500 to-emerald-600",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-indigo-500 to-purple-600",
    "bg-gradient-to-br from-amber-500 to-yellow-600",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

// Previous Versions Dialog
const PreviousVersionsDialog = ({ 
  versions, 
  open, 
  onOpenChange,
  appName 
}: { 
  versions: AppVersion[]; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  appName: string;
}) => {
  const { t } = useLanguage();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{appName} - Previous Versions</h2>
        </div>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-4">
            {versions.map((version) => (
              <div 
                key={version.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">v{version.version}</span>
                    {version.is_latest && (
                      <Badge variant="default" className="text-xs">Latest</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {version.release_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(version.release_date).toLocaleDateString()}
                      </span>
                    )}
                    {version.file_size && (
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {version.file_size}
                      </span>
                    )}
                  </div>
                  {(version.changelog || version.changelog_km) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(version.changelog_km, version.changelog)}
                    </p>
                  )}
                </div>
                
                {version.download_url && (
                  <a href={version.download_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Screenshot Gallery Component with Lightbox
const ScreenshotGallery = ({ 
  screenshots, 
  selectedIndex, 
  setSelectedIndex 
}: { 
  screenshots: { image_url: string; sort_order: number }[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  if (!screenshots || screenshots.length === 0) return null;

  const sortedScreenshots = [...screenshots].sort((a, b) => a.sort_order - b.sort_order);

  const handlePrev = () => {
    setSelectedIndex(selectedIndex === 0 ? sortedScreenshots.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    setSelectedIndex(selectedIndex === sortedScreenshots.length - 1 ? 0 : selectedIndex + 1);
  };

  return (
    <>
      {/* Main Screenshot Display */}
      <div 
        className="relative aspect-video bg-muted rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={sortedScreenshots[selectedIndex]?.image_url}
          alt={`Screenshot ${selectedIndex + 1}`}
          className="w-full h-full object-contain"
        />
        
        {/* Navigation arrows */}
        {sortedScreenshots.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        
        {/* Counter */}
        {sortedScreenshots.length > 1 && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-md text-white text-xs">
            {selectedIndex + 1} / {sortedScreenshots.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {sortedScreenshots.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {sortedScreenshots.map((screenshot, index) => (
            <button
              key={screenshot.image_url}
              onClick={() => setSelectedIndex(index)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                index === selectedIndex 
                  ? 'border-primary ring-2 ring-primary/30' 
                  : 'border-transparent hover:border-muted-foreground/50'
              }`}
            >
              <img
                src={screenshot.image_url}
                alt={`Thumbnail ${index + 1}`}
                className="w-20 h-14 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          {sortedScreenshots.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          
          <img
            src={sortedScreenshots[selectedIndex].image_url}
            alt={`Screenshot ${selectedIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          {sortedScreenshots.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          
          {sortedScreenshots.length > 1 && (
            <div className="absolute bottom-4 text-white/70 text-sm">
              {selectedIndex + 1} / {sortedScreenshots.length}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Metadata Item Component
const MetadataItem = ({ 
  label, 
  value, 
  expandable 
}: { 
  label: string; 
  value: string | undefined; 
  expandable?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!value) return null;
  
  const isLongValue = value.length > 30;
  const displayValue = expandable && isLongValue && !expanded 
    ? value.substring(0, 30) + '...' 
    : value;
  
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm text-foreground flex items-center gap-1">
        {displayValue}
        {expandable && isLongValue && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-primary hover:text-primary/80 text-xs"
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>
    </div>
  );
};

// Loading Skeleton
const AppDetailSkeleton = () => (
  <div className="p-6">
    <div className="flex items-center gap-4 mb-6">
      <Skeleton className="w-16 h-16 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

const AppDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const translations = useTranslations();
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { language, setLanguage } = useLanguage();
  const download = useDownload();
  
  const languages = [
    { code: "km" as const, name: "ខ្មែរ", flag: "🇰🇭" },
    { code: "en" as const, name: "EN", flag: "🇬🇧" },
  ];
  const currentLang = languages.find(l => l.code === language) || languages[0];
  const [searchQuery, setSearchQuery] = useState("");
  
  // Extract app ID from URL (format: "123-app-name")
  const appId = id ? parseInt(id.split('-')[0]) : null;

  // Fetch app details
  const { data: appData, isLoading: appLoading, error: appError } = useQuery({
    queryKey: ["app", appId],
    queryFn: () => appsApi.getById(appId!),
    enabled: !!appId,
  });

  const { data: versions } = useQuery({
    queryKey: ["versions", appId],
    queryFn: () => versionsApi.getByAppId(appId!),
    enabled: !!appId,
  });

  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid App</h1>
          <Link to="/" className="text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const displayName = appData ? t(appData.name_km, appData.name) : '';
  const displayDescription = appData ? t(appData.description_km, appData.description) : '';
  
  const latestVersion = versions?.find(v => v.is_latest) || versions?.[0];
  const categoryLabels: Record<string, string> = {
    programs: translations.programs,
    games: translations.games,
    extensions: 'Extensions',
    os: 'OS Versions'
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-background/95 backdrop-blur-xl py-6 px-4 flex-col z-50 border-r border-border/50 hidden lg:flex">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-4 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold">
              <span className="gradient-text">apps</span>
              <span className="text-muted-foreground">torrent</span>
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {[
            { id: "all", label: "All", icon: LayoutGrid },
            { id: "programs", label: translations.programs, icon: Box },
            { id: "games", label: translations.games, icon: Gamepad2 },
            { id: "extensions", label: "Extensions", icon: Puzzle },
          ].map((item) => (
            <Link
              key={item.id}
              to={item.id === "all" ? "/" : `/?category=${item.id}`}
              className="sidebar-nav-item w-full group"
            >
              <div className="p-2 rounded-lg transition-all duration-300 bg-accent/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                <item.icon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 glass py-3 sm:py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Back button on mobile */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="lg:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {/* Search */}
            <div className="flex-1 relative group">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder={translations.search}
                className="search-input pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/?search=${(e.target as HTMLInputElement).value}`);
                  }
                }}
              />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language selector */}
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-muted-foreground hover:text-foreground transition-all duration-300 rounded-xl hover:bg-accent"
              >
                <span className="text-base sm:text-lg">{currentLang.flag}</span>
                <span className="text-xs sm:text-sm hidden xs:inline">{currentLang.name}</span>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-card rounded-xl border border-border shadow-xl overflow-hidden min-w-[100px] sm:min-w-[120px] z-50 animate-fade-in">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-accent transition-all duration-300 ${
                          language === lang.code ? 'bg-primary/10 text-primary' : ''
                        }`}
                      >
                        <span className="text-base sm:text-lg">{lang.flag}</span>
                        <span className="text-xs sm:text-sm">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Login button */}
            <Link to="/admin" className="btn-primary text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-2.5">
              {translations.login}
            </Link>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <span>/</span>
            {appData && (
              <>
                <Link 
                  to={`/?category=${appData.category}`} 
                  className="hover:text-foreground transition-colors"
                >
                  {categoryLabels[appData.category] || appData.category}
                </Link>
                <span>/</span>
                <span className="text-foreground">{displayName}</span>
              </>
            )}
          </div>

          {appLoading ? (
            <AppDetailSkeleton />
          ) : appError ? (
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">App Not Found</h1>
              <p className="text-muted-foreground mb-4">The app you're looking for doesn't exist.</p>
              <Button onClick={() => navigate('/')} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </div>
          ) : appData && (
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-6 lg:p-8">
                {/* Header with App Icon and Name */}
                <div className="flex items-start gap-4 mb-8">
                  {appData.icon_url ? (
                    <img
                      src={appData.icon_url}
                      alt={displayName}
                      className="w-20 h-20 rounded-2xl shadow-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-2xl ${getGradientFromName(appData.name)} flex items-center justify-center shadow-lg shrink-0`}>
                      <Package className="w-10 h-10 text-white/80" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{displayName}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link 
                        to={`/?category=${appData.category}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {categoryLabels[appData.category] || appData.category}
                      </Link>
                      {appData.developer && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-primary hover:underline cursor-pointer">
                            {appData.developer}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Side - Screenshot */}
                  <div className="lg:col-span-2">
                    {appData.screenshots && appData.screenshots.length > 0 ? (
                      <ScreenshotGallery 
                        screenshots={appData.screenshots}
                        selectedIndex={selectedScreenshot}
                        setSelectedIndex={setSelectedScreenshot}
                      />
                    ) : (
                      <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                        <Package className="w-20 h-20 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Right Side - Metadata */}
                  <div className="space-y-4">
                    {/* Metadata Grid */}
                    <div className="space-y-4 p-5 bg-muted/30 rounded-xl border border-border/50">
                      <MetadataItem 
                        label="Version" 
                        value={appData.latest_version || latestVersion?.version}
                      />
                      
                      <MetadataItem 
                        label="Developer" 
                        value={appData.developer}
                      />
                      
                      {latestVersion?.min_os_version && (
                        <MetadataItem 
                          label="Compatibility" 
                          value={latestVersion.min_os_version}
                        />
                      )}
                      
                      {latestVersion?.file_size && (
                        <MetadataItem 
                          label="Size" 
                          value={latestVersion.file_size}
                        />
                      )}
                      
                      {latestVersion?.release_date && (
                        <MetadataItem 
                          label="Release Date" 
                          value={new Date(latestVersion.release_date).toLocaleDateString()}
                        />
                      )}
                      
                      {appData.website && (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">Website</div>
                          <a
                            href={appData.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Visit
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Download Button */}
                    {latestVersion?.download_url ? (
                      <Button 
                        className="w-full h-14 text-base font-semibold gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        onClick={() => download.startDownload(
                          latestVersion.download_url!,
                          displayName,
                          latestVersion.file_size || "Unknown size"
                        )}
                      >
                        <Download className="w-5 h-5" />
                        Download for free
                        {latestVersion.file_size && (
                          <span className="text-white/80">({latestVersion.file_size})</span>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full h-14 text-base font-semibold gap-2"
                        disabled
                      >
                        <Download className="w-5 h-5" />
                        {translations.noVersions}
                      </Button>
                    )}

                    {/* Previous Versions Button */}
                    {versions && versions.length > 1 && (
                      <Button 
                        variant="outline"
                        className="w-full h-11 gap-2"
                        onClick={() => setShowVersions(true)}
                      >
                        <History className="w-4 h-4" />
                        Previous versions
                      </Button>
                    )}

                    {/* Security Badge */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>No threats found. <span className="text-primary hover:underline cursor-pointer">Read more...</span></span>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                {displayDescription && (
                  <div className="mt-10">
                    <Separator className="mb-8" />
                    <div>
                      <h2 className="text-xl font-semibold mb-3">Description</h2>
                      <div className="w-16 h-1 bg-primary rounded-full mb-6" />
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-base">
                        {displayDescription}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Previous Versions Dialog */}
      <PreviousVersionsDialog
        versions={versions || []}
        open={showVersions}
        onOpenChange={setShowVersions}
        appName={displayName}
      />

      {/* Download Progress Dialog */}
      <DownloadProgress state={download} onClose={download.reset} />
    </div>
  );
};

export default AppDetail;
