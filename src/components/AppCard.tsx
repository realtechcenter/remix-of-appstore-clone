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
      className="launchpad-item group"
      onClick={handleClick}
    >
      {/* Icon */}
      <div className="relative">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={displayName}
            className="launchpad-icon"
          />
        ) : (
          <div className={`launchpad-icon flex items-center justify-center ${colorClass}`}>
            {icon && icon !== "📦" ? (
              <span className="text-3xl">{icon}</span>
            ) : (
              <span className="text-xl font-semibold">{initials || <Package className="w-8 h-8" />}</span>
            )}
          </div>
        )}

        {/* Update badge */}
        {hasUpdate && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
            <ArrowUp className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
        )}

        {/* Price badge */}
        {props.purchased ? (
          <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
            ✓
          </div>
        ) : isPaidApp ? (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-foreground/80 text-background text-[9px] font-semibold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <DollarSign className="w-2.5 h-2.5" />
            {priceNum.toFixed(2)}
          </div>
        ) : null}
      </div>

      {/* Name */}
      <span className="launchpad-label">
        {displayName}
      </span>
    </div>
  );
};
