import { ArrowUp, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
}

const getGradientFromName = (name: string): string => {
  const gradients = [
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-green-500 to-emerald-600",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-indigo-500 to-purple-600",
    "bg-gradient-to-br from-amber-500 to-yellow-600",
    "bg-gradient-to-br from-cyan-500 to-blue-600",
    "bg-gradient-to-br from-rose-500 to-pink-600",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

// Helper to create URL-friendly slug
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const AppCard = (props: AppCardProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const name = props.app?.name || props.name || "";
  const nameKm = props.app?.name_km || props.name_km;
  const version = props.app?.latest_version || props.version || "";
  const description = props.app?.description || props.description || "";
  const descriptionKm = props.app?.description_km || props.description_km;
  const iconUrl = props.app?.icon_url || props.icon_url;
  const icon = props.icon || "📦";
  const iconBg = props.iconBg || getGradientFromName(name);
  const hasUpdate = props.hasUpdate ?? false;

  const displayName = t(nameKm, name);
  const displayDescription = t(descriptionKm, description);

  const handleClick = () => {
    if (props.app) {
      // Navigate to app detail page with URL format: /123-app-name
      const slug = createSlug(props.app.name);
      navigate(`/${props.app.id}-${slug}`);
    }
  };

  return (
    <div 
      className={`app-card group ${props.app ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {hasUpdate && (
        <div className="app-card-update-badge">
          <ArrowUp className="w-3 h-3 text-white" />
        </div>
      )}
      
      <div className="flex flex-col items-center text-center">
        {iconUrl ? (
          <div className="relative mb-3 sm:mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img 
              src={iconUrl} 
              alt={displayName}
              className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 object-cover"
            />
          </div>
        ) : (
          <div className="relative mb-3 sm:mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div 
              className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-xl sm:rounded-2xl ${iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}
            >
              {icon ? (
                <span className="text-2xl sm:text-3xl">{icon}</span>
              ) : (
                <Package className="w-7 h-7 sm:w-8 sm:h-8 text-white/90" />
              )}
            </div>
          </div>
        )}

        <h3 className="text-foreground font-semibold mb-1 group-hover:text-primary transition-colors duration-300 line-clamp-1 text-sm sm:text-base">
          {displayName}
        </h3>

        {version && (
          <span className="inline-block text-[10px] sm:text-xs text-muted-foreground mb-1.5 bg-accent/50 px-2 py-0.5 rounded-full">
            v{version}
          </span>
        )}

        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed">{displayDescription}</p>
      </div>
      
      {/* Hover shine effect */}
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </div>
    </div>
  );
};
