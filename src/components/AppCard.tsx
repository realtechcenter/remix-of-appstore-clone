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
    "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300",
    "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300",
    "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300",
    "bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300",
    "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300",
    "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
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
          <ArrowUp className="w-2.5 h-2.5 text-background" />
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-2">
        {/* Icon */}
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={displayName}
            className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0"
          />
        ) : (
          <div
            className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 border border-border/50 ${colorClass}`}
          >
            {icon && icon !== "📦" ? (
              <span className="text-2xl">{icon}</span>
            ) : (
              <span className="text-lg font-semibold">{initials || <Package className="w-6 h-6" />}</span>
            )}
          </div>
        )}

        {/* Name */}
        <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-foreground transition-colors leading-tight">
          {displayName}
        </h3>

        {/* Version */}
        {version && (
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
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
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <HardDrive className="w-2.5 h-2.5" />
            <span>{fileSize}</span>
          </div>
        )}
      </div>
    </div>
  );
};
