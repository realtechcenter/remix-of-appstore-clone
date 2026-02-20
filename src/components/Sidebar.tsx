import { Gamepad2, Puzzle, HardDrive, FileText, ShoppingBag, LayoutGrid, Box, ChevronDown } from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";

interface SidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({ activeCategory, onCategoryChange, isOpen = false, onToggle }: SidebarProps) => {
  const { language } = useLanguage();
  const t = useTranslations();

  const navItems = [
    { id: "all", label: language === "km" ? "ទាំងអស់" : "All Apps", icon: LayoutGrid },
    { id: "programs", label: t.programs, icon: Box },
    { id: "games", label: t.games, icon: Gamepad2 },
    { id: "extensions", label: t.extensions, icon: Puzzle },
    { id: "os", label: t.os, icon: HardDrive },
    { id: "articles", label: t.articles, icon: FileText },
    { id: "goods", label: t.goods, icon: ShoppingBag },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-60 flex flex-col z-50 transform transition-transform duration-200 lg:translate-x-0 border-r border-border bg-sidebar-background ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Workspace header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-primary-foreground text-xs font-bold">M</span>
        </div>
        <span className="text-sm font-bold text-foreground truncate">Macsofy</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 select-none">
          {language === "km" ? "ប្រភេទ" : "Categories"}
        </p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onCategoryChange(item.id)}
            className={`sidebar-nav-item ${activeCategory === item.id ? "active" : ""}`}
          >
            <item.icon className={`w-4 h-4 flex-shrink-0 ${activeCategory === item.id ? "opacity-100" : "opacity-60"}`} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
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
