import { ArrowUp, Package, HardDrive, DollarSign, Download } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import type { App } from "@/lib/api";

interface AppCardProps {
  app?: App;
  name?: string;
  name_km?: string;
  version?: string;
  description?: string;
  description_km?: string;
  icon?: string;
  icon_url?: string;
  iconBg?: string;
  hasUpdate?: boolean;
  size?: string;
  purchased?: boolean;
}

const getInitialBg = (name: string): string => {
  const colors = [
    "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
    "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
    "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
    "bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400",
    "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400",
    "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

export const AppCard = (props: AppCardProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const name = props.app?.name || props.name || "";
  const nameKm = props.app?.name_km || props.name_km;
  const version = props.app?.latest_version || props.version || "";
  const iconUrl = props.app?.icon_url || props.icon_url;
  const icon = props.icon || "📦";
  const hasUpdate = props.hasUpdate ?? false;

  const category = props.app?.category || "programs";

  const getCategoryDisplay = (cat: string): string => {
    const categories: Record<string, { en: string; km: string }> = {
      programs: { en: "Program", km: "កម្មវិធី" },
      games: { en: "Game", km: "ហ្គេម" },
      extensions: { en: "Extension", km: "ផ្នែកបន្ថែម" },
      os: { en: "OS", km: "ប្រព័ន្ធប្រតិបត្តិការ" },
    };
    return language === "km" ? (categories[cat]?.km || cat) : (categories[cat]?.en || cat);
  };

  const fileSize = props.size || props.app?.versions?.[0]?.file_size;
  const downloadCount = props.app?.download_count || 0;

  const formatDownloadCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const priceValue = props.app?.price;
  const priceNum = typeof priceValue === "string" ? parseFloat(priceValue) : priceValue || 0;
  const isPaidApp = priceNum > 0;

  const displayName = t(nameKm, name);
  const initials = name.slice(0, 2).toUpperCase();
  const colorClass = getInitialBg(name);

  const handleClick = () => {
    if (props.app) {
      const slug = createSlug(props.app.name);
      navigate(`/${props.app.id}-${slug}`, {
        state: { from: location.pathname + location.search },
      });
    }
  };

  return (
    <div
      className={`app-card group ${props.app ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      {/* Update indicator */}
      {hasUpdate && (
        <div className="app-card-update-badge">
          <ArrowUp className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-2">
        {/* Icon — macOS rounded rect */}
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={displayName}
            className="w-14 h-14 rounded-[12px] object-cover shadow-sm flex-shrink-0"
            style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.1), 0 1px 2px hsl(0 0% 0% / 0.06)' }}
          />
        ) : (
          <div
            className={`w-14 h-14 rounded-[12px] flex items-center justify-center flex-shrink-0 ${colorClass}`}
            style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.1), 0 1px 2px hsl(0 0% 0% / 0.06)' }}
          >
            {icon && icon !== "📦" ? (
              <span className="text-2xl">{icon}</span>
            ) : (
              <span className="text-lg font-semibold">{initials || <Package className="w-6 h-6" />}</span>
            )}
          </div>
        )}

        {/* Name */}
        <h3 className="text-[13px] font-medium text-foreground line-clamp-1 group-hover:text-foreground transition-colors leading-tight">
          {displayName}
        </h3>

        {/* Version */}
        {version && (
          <span className="text-[11px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md">
            v{version}
          </span>
        )}

        {/* Category */}
        <p className="text-[11px] text-muted-foreground">{getCategoryDisplay(category)}</p>

        {/* Downloads */}
        {downloadCount > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Download className="w-3 h-3" />
            <span>{formatDownloadCount(downloadCount)}</span>
          </div>
        )}

        {/* Price badge */}
        {props.purchased ? (
          <div className="absolute top-2 right-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
            {language === "km" ? "បានទិញ" : "Owned"}
          </div>
        ) : isPaidApp ? (
          <div className="absolute top-2 right-2 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-primary/20 flex items-center gap-0.5">
            <DollarSign className="w-2.5 h-2.5" />
            <span>{priceNum.toFixed(2)}</span>
          </div>
        ) : (
          <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border">
            {language === "km" ? "ឥតគិតថ្លៃ" : "Free"}
          </div>
        )}

        {/* Size on hover */}
        {fileSize && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-foreground/80 text-background text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <HardDrive className="w-2.5 h-2.5" />
            <span>{fileSize}</span>
          </div>
        )}
      </div>
    </div>
  );
};
