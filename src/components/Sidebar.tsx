import { Gamepad2, Puzzle, HardDrive, FileText, ShoppingBag, LayoutGrid, Box, X, ShoppingCart, CreditCard, Settings, LogIn } from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import macsofyLogo from "@/assets/macsofy-logo.png";

interface SidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({ activeCategory, onCategoryChange, isOpen = false, onToggle }: SidebarProps) => {
  const { language } = useLanguage();
  const t = useTranslations();
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { id: "all", label: language === "km" ? "ទាំងអស់" : "All Apps", icon: LayoutGrid },
    { id: "programs", label: t.programs, icon: Box },
    { id: "games", label: t.games, icon: Gamepad2 },
    { id: "extensions", label: t.extensions, icon: Puzzle },
    { id: "os", label: t.os, icon: HardDrive },
    { id: "articles", label: t.articles, icon: FileText },
    { id: "goods", label: t.goods, icon: ShoppingBag },
  ];

  const userMenuItems = [
    { path: "/my-purchases", label: language === "km" ? "កម្មវិធីដែលបានទិញ" : "My Purchases", icon: ShoppingCart },
    { path: "/payment-history", label: language === "km" ? "ប្រវត្តិបង់ប្រាក់" : "Payment History", icon: CreditCard },
    { path: "/profile", label: language === "km" ? "ការកំណត់គណនី" : "Profile Settings", icon: Settings },
  ];

  const isOnIndex = location.pathname === "/";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transition-transform duration-200",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:flex"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
          <img src={macsofyLogo} alt="Macsofy" className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-none">Macsofy</p>
          <p className="text-xs text-muted-foreground mt-0.5">App Store</p>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="ml-auto lg:hidden p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categories */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-0.5">
          <p className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest select-none">
            {language === "km" ? "ប្រភេទ" : "Categories"}
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isOnIndex && activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onCategoryChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Menu */}
        {user && (
          <div className="space-y-0.5">
            <p className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest select-none">
              {language === "km" ? "គណនី" : "Account"}
            </p>
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => onToggle?.()}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        {!user && (
          <Link
            to="/auth"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all mb-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{language === "km" ? "ចូល" : "Sign In"}</span>
          </Link>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          {["DMCA", "Privacy", "FAQ", "Contact"].map((link) => (
            <span
              key={link}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              {link}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};
