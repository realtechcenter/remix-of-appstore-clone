import { useState } from "react";
import macsofyLogo from "@/assets/macsofy-logo.png";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  Download, Calendar, HardDrive, ExternalLink, Package, ChevronLeft, 
  ChevronRight, X, Shield, History, ArrowLeft, Home, Search,
  Box, Gamepad2, Puzzle, LayoutGrid, ChevronDown, ShoppingCart, Lock,
  ShoppingBag, Monitor, Cpu, FileDown, Play
} from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { appsApi, versionsApi, activityLogsApi, downloadApi, type AppVersion, type ApplicableCoupon } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PaymentDialog } from "@/components/PaymentDialog";
import { CouponSuggestion } from "@/components/CouponSuggestion";
import { useHasPurchased } from "@/hooks/useOrders";
import { RichContent } from "@/components/RichTextEditor";
import { CoachMarks, type CoachStep } from "@/components/CoachMarks";

const appDetailTourSteps: CoachStep[] = [
  {
    target: "ad-screenshots",
    titleEn: "Screenshots",
    titleKm: "រូបថតអេក្រង់",
    descEn: "Click any screenshot to view it in fullscreen. Use arrows to browse through all images.",
    descKm: "ចុចរូបថតណាមួយដើម្បីមើលពេញអេក្រង់។ ប្រើព្រួញដើម្បីរុករករូបភាពទាំងអស់។",
    placement: "bottom",
  },
  {
    target: "ad-metadata",
    titleEn: "App Details",
    titleKm: "ព័ត៌មានលម្អិតកម្មវិធី",
    descEn: "Here you'll find the version, developer, compatibility, file size, and release date.",
    descKm: "នៅទីនេះអ្នកនឹងឃើញកំណែ អ្នកអភិវឌ្ឍន៍ ភាពឆបគ្នា ទំហំឯកសារ និងកាលបរិច្ឆេទចេញផ្សាយ។",
    placement: "left",
  },
  {
    target: "ad-download-btn",
    titleEn: "Download / Purchase",
    titleKm: "ទាញយក / ទិញ",
    descEn: "Free apps can be downloaded directly. Paid apps require purchase first — click the button to proceed.",
    descKm: "កម្មវិធីឥតគិតថ្លៃអាចទាញយកបានផ្ទាល់។ កម្មវិធីបង់ប្រាក់ត្រូវទិញជាមុនសិន — ចុចប៊ូតុងដើម្បីបន្ត។",
    placement: "left",
  },
  {
    target: "ad-safety-badge",
    titleEn: "Safety Verified",
    titleKm: "សុវត្ថិភាពបានផ្ទៀងផ្ទាត់",
    descEn: "All apps are scanned for safety. Click to verify on VirusTotal for extra peace of mind.",
    descKm: "កម្មវិធីទាំងអស់ត្រូវបានស្កេនសុវត្ថិភាព។ ចុចដើម្បីផ្ទៀងផ្ទាត់នៅ VirusTotal។",
    placement: "left",
  },
  {
    target: "ad-versions",
    titleEn: "Version History",
    titleKm: "ប្រវត្តិកំណែ",
    descEn: "Expand any version to see details, changelogs, and individual download links.",
    descKm: "ពង្រីកកំណែណាមួយដើម្បីមើលព័ត៌មានលម្អិត កំណត់ហេតុផ្លាស់ប្ដូរ និងតំណទាញយកនីមួយៗ។",
    placement: "top",
  },
];

const getGradientFromName = (name: string | undefined): string => {
  const gradients = [
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-green-500 to-emerald-600",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-indigo-500 to-purple-600",
    "bg-gradient-to-br from-amber-500 to-yellow-600",
  ];
  if (!name) return gradients[0];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

// Extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Collapsible Version Item
const VersionItem = ({ 
  version, 
  canDownload,
  isLatest,
  appId,
  appName
}: { 
  version: AppVersion; 
  canDownload: boolean;
  isLatest?: boolean;
  appId: number;
  appName: string;
}) => {
  const [isOpen, setIsOpen] = useState(isLatest || false);
  const { t, language } = useLanguage();
  const translations = useTranslations();
  
  // Filter out links with null URLs (paid apps where user hasn't purchased)
  const downloadLinks = (version.download_links || []).filter(link => link.url !== null);
  const hasDownloadLinks = downloadLinks.length > 0;
  
  const handleDownloadClick = async (e: React.MouseEvent, linkId?: number) => {
    if (canDownload) {
      e.preventDefault();
      try {
        // Track download
        activityLogsApi.trackDownload(appId, appName, version.version).catch(() => {});
        // Get signed URL
        const result = await downloadApi.getSignedUrl(version.id, linkId);
        if (result.url) {
          window.open(result.url, '_blank');
        }
      } catch (error) {
        console.error('Failed to get download URL:', error);
        // Fallback to direct URL if signed URL fails
        const fallbackUrl = linkId 
          ? downloadLinks.find(l => l.id === linkId)?.url 
          : version.download_url;
        if (fallbackUrl) window.open(fallbackUrl, '_blank');
      }
    }
  };
  
  const isHidden = version.is_visible === false;

  return (
    <Collapsible open={isHidden ? false : isOpen} onOpenChange={isHidden ? undefined : setIsOpen}>
      <CollapsibleTrigger asChild disabled={isHidden}>
        <button className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors text-left ${
          isHidden 
            ? 'bg-muted/30 opacity-50 cursor-not-allowed' 
            : 'bg-muted/50 hover:bg-muted'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isHidden ? 'bg-muted' : 'bg-primary/10'}`}>
              <Package className={`w-5 h-5 ${isHidden ? 'text-muted-foreground' : 'text-primary'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isHidden ? 'text-muted-foreground line-through' : 'text-foreground'}`}>v{version.version}</span>
                {isLatest && !isHidden && (
                  <Badge variant="default" className="text-xs">{translations.latest}</Badge>
                )}
                {isHidden && (
                  <Badge variant="secondary" className="text-xs text-muted-foreground">{language === 'km' ? 'មិនមាន' : 'Unavailable'}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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
            </div>
          </div>
          {!isHidden && <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2 space-y-3 pl-4">
        {/* Version Details */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
          {version.min_os_version && (
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">{translations.compatibility || 'Compatibility'}</div>
                <div className="text-sm font-medium">{version.min_os_version}</div>
              </div>
            </div>
          )}
          
          {version.file_size && (
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">{translations.size}</div>
                <div className="text-sm font-medium">{version.file_size}</div>
              </div>
            </div>
          )}
          
          {version.architecture && (
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">{language === 'km' ? 'ស្ថាបត្យកម្ម' : 'Architecture'}</div>
                <div className="text-sm font-medium">{version.architecture}</div>
              </div>
            </div>
          )}
          
          {version.release_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">{translations.releaseDate}</div>
                <div className="text-sm font-medium">{new Date(version.release_date).toLocaleDateString()}</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Changelog */}
        {(version.changelog || version.changelog_km) && (
          <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
            <RichContent html={t(version.changelog_km, version.changelog) || ''} className="text-sm text-muted-foreground" />
          </div>
        )}
        
        {/* Download Links */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <FileDown className="w-3.5 h-3.5" />
            {language === 'km' ? 'តំណទាញយក' : 'Download Links'}
          </div>
          
          {hasDownloadLinks ? (
            <div className="space-y-2">
              {downloadLinks.map((link) => (
                <a
                  key={link.id}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (canDownload) {
                      handleDownloadClick(e, link.id);
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    canDownload 
                      ? 'bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer' 
                      : 'bg-muted/50 border-border/50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{link.title}</span>
                    {link.link_type === 'page' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {language === 'km' ? 'ទំព័រ' : 'Page'}
                      </Badge>
                    )}
                  </div>
                  {canDownload ? (
                    link.link_type === 'page' ? (
                      <ExternalLink className="w-4 h-4 text-primary" />
                    ) : (
                      <Download className="w-4 h-4 text-primary" />
                    )
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </a>
              ))}
            </div>
          ) : version.download_url ? (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (canDownload) {
                  handleDownloadClick(e);
                }
              }}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                canDownload 
                  ? 'bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer' 
                  : 'bg-muted/50 border-border/50 cursor-not-allowed opacity-60'
              }`}
            >
              <span className="text-sm font-medium">
                {language === 'km' ? 'ទាញយក' : 'Download'} v{version.version}
              </span>
              {canDownload ? (
                <Download className="w-4 h-4 text-primary" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
            </a>
          ) : (
            <div className="text-sm text-muted-foreground italic p-3">
              {language === 'km' ? 'គ្មានតំណទាញយក' : 'No download links available'}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Sort versions by version number (descending) - handles semantic versioning
const sortVersions = (versions: AppVersion[]): AppVersion[] => {
  return [...versions].sort((a, b) => {
    // First, prioritize is_latest
    if (a.is_latest && !b.is_latest) return -1;
    if (!a.is_latest && b.is_latest) return 1;
    
    // Then sort by version number (descending)
    const parseVersion = (v: string) => {
      const parts = v.replace(/^v/i, '').split(/[.-]/).map(p => {
        const num = parseInt(p, 10);
        return isNaN(num) ? 0 : num;
      });
      return parts;
    };
    
    const aParts = parseVersion(a.version);
    const bParts = parseVersion(b.version);
    
    const maxLen = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < maxLen; i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (bVal !== aVal) return bVal - aVal; // Descending order
    }
    
    // Finally, sort by release date if versions are equal
    const aDate = a.release_date ? new Date(a.release_date).getTime() : 0;
    const bDate = b.release_date ? new Date(b.release_date).getTime() : 0;
    return bDate - aDate;
  });
};

// Versions List Component
const VersionsList = ({ 
  versions, 
  canDownload,
  appId,
  appName
}: { 
  versions: AppVersion[]; 
  canDownload: boolean;
  appId: number;
  appName: string;
}) => {
  const { language } = useLanguage();
  const translations = useTranslations();
  
  if (!versions || versions.length === 0) {
    return null;
  }
  
  const sortedVersions = sortVersions(versions);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">
          {language === 'km' ? 'កំណែទាំងអស់' : 'All Versions'}
        </h3>
        <Badge variant="secondary" className="text-xs">{sortedVersions.length}</Badge>
      </div>
      
      <div className="space-y-3">
        {sortedVersions.map((version, index) => (
          <VersionItem 
            key={version.id} 
            version={version} 
            canDownload={canDownload}
            isLatest={index === 0}
            appId={appId}
            appName={appName}
          />
        ))}
      </div>
    </div>
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
  const location = useLocation();
  const { t } = useLanguage();
  const translations = useTranslations();
  const { user } = useAuth();
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<ApplicableCoupon | null>(null);
  const { language, setLanguage } = useLanguage();
  
  // Get the previous location from state or default to home
  const fromPath = (location.state as { from?: string })?.from || '/';
  
  const handleBack = () => {
    // Navigate to the stored path which includes search params (e.g. /?appPage=2)
    if (fromPath) {
      const url = new URL(fromPath, window.location.origin);
      navigate({ pathname: url.pathname, search: url.search });
    } else {
      navigate('/');
    }
  };
  
  const languages = [
    { code: "km" as const, name: "ខ្មែរ", flag: "🇰🇭" },
    { code: "en" as const, name: "EN", flag: "🇬🇧" },
  ];
  const currentLang = languages.find(l => l.code === language) || languages[0];
  const [searchQuery, setSearchQuery] = useState("");
  
  // Extract app ID from URL (format: "123-app-name")
  const appId = id ? parseInt(id.split('-')[0]) : null;
  
  // Check if user has purchased this app
  const { data: hasPurchased, isLoading: purchaseLoading } = useHasPurchased(appId || 0);
  
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
          <h1 className="text-2xl font-bold mb-2">{translations.invalidApp}</h1>
          <Link to="/" className="text-primary hover:underline">{translations.goBackHome}</Link>
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
    extensions: translations.extensions,
    os: translations.os
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-background/95 backdrop-blur-xl py-6 px-4 flex-col z-50 border-r border-border/50 hidden lg:flex">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-4 mb-8">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <img src={macsofyLogo} alt="Macsofy" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-bold text-foreground">Macsofy</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {[
            { id: "all", label: translations.all, icon: LayoutGrid },
            { id: "programs", label: translations.programs, icon: Box },
            { id: "games", label: translations.games, icon: Gamepad2 },
            { id: "extensions", label: translations.extensions, icon: Puzzle },
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
            {/* Back button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {/* Search */}
            <div className="flex-1 relative group">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder={translations.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
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

            {/* User actions */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/my-purchases">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {language === 'km' ? 'កម្មវិធីដែលបានទិញ' : 'My Purchases'}
                    </span>
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to="/auth" className="btn-primary text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-2.5">
                {translations.login}
              </Link>
            )}
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
              <span>{translations.home}</span>
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
              <h1 className="text-2xl font-bold mb-2">{translations.appNotFound}</h1>
              <p className="text-muted-foreground mb-4">{translations.appNotFound}</p>
              <Button onClick={() => navigate('/')} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {translations.backToHome}
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
                    <div className="lg:col-span-2" data-tour="ad-screenshots">
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
                    <div className="space-y-4 p-5 bg-muted/30 rounded-xl border border-border/50" data-tour="ad-metadata">
                      <MetadataItem 
                        label={translations.version} 
                        value={appData.latest_version || latestVersion?.version}
                      />
                      
                      <MetadataItem 
                        label={translations.developer} 
                        value={appData.developer}
                      />
                      
                      {latestVersion?.min_os_version && (
                        <MetadataItem 
                          label={translations.compatibility} 
                          value={latestVersion.min_os_version}
                        />
                      )}
                      
                      {latestVersion?.file_size && (
                        <MetadataItem 
                          label={translations.size} 
                          value={latestVersion.file_size}
                        />
                      )}
                      
                      {latestVersion?.release_date && (
                        <MetadataItem 
                          label={translations.releaseDate} 
                          value={new Date(latestVersion.release_date).toLocaleDateString()}
                        />
                      )}
                      
                    </div>

                    {/* Download/Purchase Button */}
                    <div className="mt-3" data-tour="ad-download-btn">
                    {(() => {
                      // Convert price to number (API may return string)
                      const priceNum = typeof appData.price === 'string' ? parseFloat(appData.price) : (appData.price || 0);
                      const isPaidApp = priceNum > 0;
                      const priceDisplay = isPaidApp ? `$${priceNum.toFixed(2)}` : '';
                      
                      if (isPaidApp && user && purchaseLoading) {
                        return (
                          <Button 
                            className="w-full h-14 text-base font-semibold gap-2"
                            disabled
                          >
                            <Download className="w-5 h-5 animate-pulse" />
                            {language === 'km' ? 'កំពុងពិនិត្យ...' : 'Checking...'}
                          </Button>
                        );
                      }
                      
                      const canDownload = !isPaidApp || hasPurchased === true;
                      
                      // Check if any version exists (not download_url, since it's null for unpurchased paid apps)
                      if (!latestVersion) {
                        return (
                          <Button 
                            className="w-full h-14 text-base font-semibold gap-2"
                            disabled
                          >
                            <Download className="w-5 h-5" />
                            {translations.noVersions}
                          </Button>
                        );
                      }
                      
                      if (isPaidApp && !user) {
                        // Not logged in - show login prompt
                        return (
                          <Link to="/auth">
                            <Button 
                              className="w-full h-14 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                            >
                              <Lock className="w-5 h-5" />
                              {language === 'km' ? 'ចូលគណនីដើម្បីទិញ' : 'Sign In to Buy'} - {priceDisplay}
                            </Button>
                          </Link>
                        );
                      }
                      
                      if (isPaidApp && !hasPurchased) {
                        // Logged in but not purchased - show buy button
                        const finalPrice = selectedCoupon 
                          ? priceNum - selectedCoupon.discount_amount 
                          : priceNum;
                        const finalPriceDisplay = `$${finalPrice.toFixed(2)}`;
                        
                        return (
                          <div className="space-y-3">
                            <Button 
                              className="w-full h-14 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                              onClick={() => setShowPaymentDialog(true)}
                            >
                              <ShoppingCart className="w-5 h-5" />
                              {language === 'km' ? 'ទិញ' : 'Buy Now'} - {selectedCoupon ? (
                                <span className="flex items-center gap-2">
                                  <span className="line-through opacity-60">{priceDisplay}</span>
                                  <span>{finalPriceDisplay}</span>
                                </span>
                              ) : priceDisplay}
                            </Button>
                            
                            <CouponSuggestion
                              price={priceNum}
                              onSelectCoupon={setSelectedCoupon}
                              selectedCoupon={selectedCoupon}
                            />
                          </div>
                        );
                      }
                      
                      // Free app or purchased - show download
                      return (
                        <a href={latestVersion.download_url} target="_blank" rel="noopener noreferrer">
                          <Button 
                            className="w-full h-14 text-base font-semibold gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                          >
                            <Download className="w-5 h-5" />
                            {isPaidApp && hasPurchased 
                              ? (language === 'km' ? 'ទាញយក' : 'Download')
                              : translations.downloadForFree
                            }
                            {latestVersion.file_size && (
                              <span className="text-white/80">({latestVersion.file_size})</span>
                            )}
                          </Button>
                        </a>
                      );
                    })()}
                    </div>

                    {/* Security Badge - 100% Safe with VirusTotal */}
                    <div className="space-y-2" data-tour="ad-safety-badge">
                      <a 
                        href="https://www.virustotal.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm p-3 bg-green-500/10 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-colors"
                      >
                        <Shield className="w-5 h-5 text-green-500" />
                        <div className="flex-1">
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            100% {language === 'km' ? 'សុវត្ថិភាព' : 'Safe'}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {language === 'km' ? 'ពិនិត្យលើ VirusTotal' : 'Verify on VirusTotal'}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                      
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                {displayDescription && (
                  <div className="mt-10">
                    <Separator className="mb-8" />
                    <div>
                      <h2 className="text-xl font-semibold mb-3">{translations.description}</h2>
                      <div className="w-16 h-1 bg-primary rounded-full mb-6" />
                      <RichContent html={displayDescription} className="text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* YouTube Tutorial Videos - Only shown for free apps or after purchase */}
                {(() => {
                  const priceNum = typeof appData.price === 'string' ? parseFloat(appData.price) : (appData.price || 0);
                  const isPaidApp = priceNum > 0;
                  const canViewVideos = !isPaidApp || hasPurchased === true;
                  const videos = appData.videos || [];
                  
                  if (videos.length === 0) return null;
                  
                  if (!canViewVideos) {
                    return (
                      <div className="mt-10">
                        <Separator className="mb-8" />
                        <div>
                          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                            <Play className="w-5 h-5 text-red-500" />
                            {language === 'km' ? 'វីដេអូណែនាំការដំឡើង' : 'Installation Guide'}
                          </h2>
                          <div className="w-16 h-1 bg-red-500 rounded-full mb-6" />
                          <div className="p-6 bg-muted/50 rounded-xl border border-border/50 text-center">
                            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">
                              {language === 'km' 
                                ? 'ទិញកម្មវិធីដើម្បីមើលវីដេអូណែនាំ' 
                                : 'Purchase this app to view installation guides'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {videos.length} {language === 'km' ? 'វីដេអូ' : videos.length === 1 ? 'video' : 'videos'} {language === 'km' ? 'មាន' : 'available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="mt-10">
                      <Separator className="mb-8" />
                      <div>
                        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                          <Play className="w-5 h-5 text-red-500" />
                          {language === 'km' ? 'វីដេអូណែនាំការដំឡើង' : 'Installation Guide'}
                          <Badge variant="secondary" className="text-xs">{videos.length}</Badge>
                        </h2>
                        <div className="w-16 h-1 bg-red-500 rounded-full mb-6" />
                        <div className="space-y-6">
                          {videos.map((video) => {
                            const videoId = getYouTubeVideoId(video.youtube_url);
                            if (!videoId) return null;
                            return (
                              <div key={video.id}>
                                <h3 className="text-base font-medium mb-3">{video.title}</h3>
                                <div className="aspect-video rounded-xl overflow-hidden bg-muted border border-border/50">
                                  <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title={video.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* All Versions Section */}
                {versions && versions.length > 0 && (
                  <div className="mt-10" data-tour="ad-versions">
                    <Separator className="mb-8" />
                    <VersionsList 
                      versions={versions} 
                      canDownload={!appData?.price || appData.price === 0 || !!hasPurchased}
                      appId={appData?.id || 0}
                      appName={displayName}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Payment Dialog */}
      {appData && appData.price && appData.price > 0 && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={(open) => {
            setShowPaymentDialog(open);
            if (!open) setSelectedCoupon(null); // Reset coupon when closing
          }}
          appId={appData.id}
          appName={displayName}
          price={appData.price}
          downloadUrl={latestVersion?.download_url}
          coupon={selectedCoupon}
          onPaymentSuccess={() => {
            // Refresh purchase status - dialog stays open to show success
            setSelectedCoupon(null);
          }}
        />
      )}

      {/* App Detail Coach Marks */}
      {!appLoading && appData && (
        <CoachMarks
          steps={appDetailTourSteps}
          storageKey="app-detail-coach-dismissed"
        />
      )}
    </div>
  );
};

export default AppDetail;
