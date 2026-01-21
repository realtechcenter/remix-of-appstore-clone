import { Search, ChevronDown, X, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "km" as const, name: "ខ្មែរ", flag: "🇰🇭" },
  { code: "en" as const, name: "EN", flag: "🇬🇧" },
];

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header = ({ searchQuery, onSearchChange }: HeaderProps) => {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 glass py-3 sm:py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="flex-1 relative group">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.search}
            className="search-input pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 text-sm sm:text-base"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent rounded-full transition-all duration-300 hover:scale-110"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
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

        {/* Auth buttons */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user.email?.split('@')[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-muted-foreground text-xs">
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                {language === 'km' ? 'ចាកចេញ' : 'Sign Out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth">
            <Button size="sm" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{t.login}</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};
