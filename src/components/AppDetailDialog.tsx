import { useState } from "react";
import { Download, Calendar, HardDrive, ExternalLink, Package, ChevronLeft, ChevronRight, X, Images } from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { appsApi, versionsApi, type App, type AppVersion } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

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

const VersionItem = ({ version }: { version: AppVersion }) => {
  const { t } = useLanguage();
  
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">v{version.version}</span>
          {version.is_latest && (
            <Badge variant="default" className="text-xs">Latest</Badge>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {t(version.changelog_km, version.changelog)}
          </p>
        )}
      </div>

      {version.download_url && (
        <a
          href={version.download_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Download
          </Button>
        </a>
      )}
    </div>
  );
};

// Screenshot Gallery Component
const ScreenshotGallery = ({ screenshots }: { screenshots: { image_url: string; sort_order: number }[] }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  if (!screenshots || screenshots.length === 0) return null;

  const sortedScreenshots = [...screenshots].sort((a, b) => a.sort_order - b.sort_order);

  const handlePrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? sortedScreenshots.length - 1 : selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === sortedScreenshots.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  return (
    <>
      <div className="space-y-2 mb-4">
        <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
          <Images className="w-4 h-4" />
          Screenshots
          <Badge variant="outline" className="text-xs">{sortedScreenshots.length}</Badge>
        </h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sortedScreenshots.map((screenshot, index) => (
            <button
              key={screenshot.image_url}
              onClick={() => setSelectedIndex(index)}
              className="flex-shrink-0 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors focus:outline-none focus:border-primary"
            >
              <img
                src={screenshot.image_url}
                alt={`Screenshot ${index + 1}`}
                className="w-24 h-16 object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      {selectedIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <img
            src={sortedScreenshots[selectedIndex].image_url}
            alt={`Screenshot ${selectedIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          
          <div className="absolute bottom-4 text-white/70 text-sm">
            {selectedIndex + 1} / {sortedScreenshots.length}
          </div>
        </div>
      )}
    </>
  );
};

interface AppDetailDialogProps {
  app: App | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AppDetailDialog = ({ app, open, onOpenChange }: AppDetailDialogProps) => {
  const { t } = useLanguage();
  const translations = useTranslations();
  
  // Fetch full app details including screenshots
  const { data: fullAppData, isLoading: appLoading } = useQuery({
    queryKey: ["app", app?.id],
    queryFn: () => appsApi.getById(app!.id),
    enabled: !!app?.id && open,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["versions", app?.id],
    queryFn: () => versionsApi.getByAppId(app!.id),
    enabled: !!app?.id && open,
  });

  if (!app) return null;

  // Use full app data if available, otherwise fall back to passed app prop
  const appData = fullAppData || app;
  const displayName = t(appData.name_km, appData.name);
  const displayDescription = t(appData.description_km, appData.description);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex gap-4">
            {/* App Icon */}
            {appData.icon_url ? (
              <img
                src={appData.icon_url}
                alt={displayName}
                className="w-16 h-16 rounded-xl shadow-md object-cover shrink-0"
              />
            ) : (
              <div className={`w-16 h-16 rounded-xl ${getGradientFromName(appData.name)} flex items-center justify-center shadow-md shrink-0`}>
                <Package className="w-8 h-8 text-white/80" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold text-left mb-1">
                {displayName}
              </DialogTitle>
              
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                {appData.developer && <span>{appData.developer}</span>}
                {appData.latest_version && (
                  <Badge variant="secondary" className="text-xs">v{appData.latest_version}</Badge>
                )}
              </div>

              {appData.website && (
                <a
                  href={appData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                >
                  <ExternalLink className="w-3 h-3" />
                  Website
                </a>
              )}
            </div>
          </div>

          {displayDescription && (
            <p className="text-sm text-muted-foreground mt-3">{displayDescription}</p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 pb-6">
            {/* Screenshots Gallery */}
            {appLoading ? (
              <div className="space-y-2 mb-4">
                <Skeleton className="h-5 w-24" />
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="w-24 h-16 rounded-lg" />
                  ))}
                </div>
              </div>
            ) : appData.screenshots && appData.screenshots.length > 0 ? (
              <ScreenshotGallery screenshots={appData.screenshots} />
            ) : null}

            <h4 className="font-medium text-sm text-foreground mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" />
              {translations.versions}
              {versions && versions.length > 0 && (
                <Badge variant="outline" className="text-xs">{versions.length}</Badge>
              )}
            </h4>

            {versionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-3">
                {versions
                  .sort((a, b) => (b.is_latest ? 1 : 0) - (a.is_latest ? 1 : 0))
                  .map((version) => (
                    <VersionItem key={version.id} version={version} />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                {translations.noVersions}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};