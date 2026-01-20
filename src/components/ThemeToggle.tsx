import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl bg-accent animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative w-10 h-10 rounded-xl bg-accent hover:bg-accent/80 transition-all duration-300 flex items-center justify-center group overflow-hidden"
      aria-label="Toggle theme"
    >
      <Sun className={`w-5 h-5 absolute transition-all duration-500 ${
        theme === "dark" 
          ? "opacity-0 rotate-90 scale-0" 
          : "opacity-100 rotate-0 scale-100 text-amber-500"
      }`} />
      <Moon className={`w-5 h-5 absolute transition-all duration-500 ${
        theme === "dark" 
          ? "opacity-100 rotate-0 scale-100 text-blue-400" 
          : "opacity-0 -rotate-90 scale-0"
      }`} />
      
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
        theme === "dark"
          ? "bg-blue-500/10 opacity-100"
          : "bg-amber-500/10 opacity-100"
      }`} />
    </button>
  );
};
