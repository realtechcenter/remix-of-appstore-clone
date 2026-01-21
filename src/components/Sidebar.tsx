import { Gamepad2, Puzzle, HardDrive, FileText, ShoppingBag, LayoutGrid, Sparkles } from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";

interface SidebarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  isOpen?: boolean;
}

export const Sidebar = ({ activeCategory, onCategoryChange, isOpen = false }: SidebarProps) => {
  const { language } = useLanguage();
  const t = useTranslations();

  const navItems = [
    { id: "all", label: language === "km" ? "ទាំងអស់" : "All", icon: LayoutGrid, badge: false },
    { id: "games", label: t.games, icon: Gamepad2, badge: true },
    { id: "extensions", label: t.extensions, icon: Puzzle, badge: true },
    { id: "os", label: t.os, icon: HardDrive, badge: true },
    { id: "articles", label: t.articles, icon: FileText, badge: false },
    { id: "goods", label: t.goods, icon: ShoppingBag, badge: false },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full w-64 bg-background/95 backdrop-blur-xl py-6 px-4 flex flex-col z-50 transform transition-all duration-300 lg:translate-x-0 border-r border-border/50 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-xl font-bold">
            <span className="gradient-text">apps</span>
            <span className="text-muted-foreground">torrent</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onCategoryChange(item.id)}
            className={`sidebar-nav-item w-full group`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`p-2 rounded-lg transition-all duration-300 ${
              activeCategory === item.id 
                ? 'bg-primary/20 text-primary' 
                : 'bg-accent/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
            }`}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className={`flex-1 text-left font-medium transition-colors duration-300 ${
              activeCategory === item.id ? 'text-foreground' : ''
            }`}>
              {item.label}
            </span>
            {item.badge && (
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                activeCategory === item.id 
                  ? 'bg-primary shadow-lg shadow-primary/50' 
                  : 'bg-muted-foreground/30'
              }`} />
            )}
          </button>
        ))}
      </nav>

      {/* Footer text */}
      <div className="px-4 py-4 bg-accent/30 rounded-xl border border-border/50">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {language === "km" ? (
            <>ការបោះពុម្ភផ្សាយដែលបានជ្រើសរើស និងបិទនឹងមានបន្ទាប់ពី <span className="text-primary cursor-pointer hover:underline font-medium">ចុះឈ្មោះ</span></>
          ) : (
            <>Favorites available after <span className="text-primary cursor-pointer hover:underline font-medium">Registration</span></>
          )}
        </p>
      </div>

      {/* Bottom links */}
      <div className="mt-4 px-4 text-xs text-muted-foreground flex flex-wrap gap-2">
        {['DMCA', 'Privacy', 'FAQ', 'Contact'].map((link) => (
          <span key={link} className="hover:text-primary cursor-pointer transition-colors duration-300">{link}</span>
        ))}
        <span className="hover:text-red-400 cursor-pointer transition-colors duration-300">Donate ❤️</span>
      </div>
    </aside>
  );
};
