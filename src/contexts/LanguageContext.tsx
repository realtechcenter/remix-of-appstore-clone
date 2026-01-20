import { createContext, useContext, useState, ReactNode, useMemo } from "react";

type Language = "km" | "en";

// Static translations for UI elements
export const translations = {
  km: {
    programs: "កម្មវិធី",
    games: "ល្បែង",
    extensions: "ផ្នែកបន្ថែម",
    os: "ប្រព័ន្ធប្រតិបត្តិការ",
    articles: "អត្ថបទ",
    goods: "ទំនិញ",
    viewAll: "មើលទាំងអស់",
    search: "ស្វែងរកនៅលើគេហទំព័រ",
    login: "ចូល",
    chat: "ជជែក",
    loading: "កំពុងផ្ទុក...",
    noApps: "មិនមានកម្មវិធី",
    featured: "ពិសេស",
    home: "ទំព័រដើម",
    backToHome: "ត្រឡប់ទៅទំព័រដើម",
    download: "ទាញយក",
    versions: "កំណែ",
    noVersions: "មិនមានកំណែ",
    screenshots: "រូបថតអេក្រង់",
    appNotFound: "រកមិនឃើញកម្មវិធី",
  },
  en: {
    programs: "Programs",
    games: "Games",
    extensions: "Extensions",
    os: "Operating Systems",
    articles: "Articles",
    goods: "Goods",
    viewAll: "View all",
    search: "Search the site",
    login: "Login",
    chat: "Chat",
    loading: "Loading...",
    noApps: "No apps found",
    featured: "Featured",
    home: "Home",
    backToHome: "Back to Home",
    download: "Download",
    versions: "Versions",
    noVersions: "No versions available",
    screenshots: "Screenshots",
    appNotFound: "App not found",
  },
};

type TranslationType = typeof translations.km;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (km: string | undefined, en: string | undefined) => string;
  translations: TranslationType;
}

const defaultContextValue: LanguageContextType = {
  language: "km",
  setLanguage: () => {},
  t: (km, en) => km || en || "",
  translations: translations.km,
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("km");

  const value = useMemo((): LanguageContextType => {
    // Translation helper - returns text based on current language
    const t = (km: string | undefined, en: string | undefined): string => {
      if (language === "km") {
        return km || en || "";
      }
      return en || km || "";
    };

    return {
      language,
      setLanguage,
      t,
      translations: translations[language] as TranslationType,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  return useContext(LanguageContext);
};

export const useTranslations = () => {
  const { translations: t } = useContext(LanguageContext);
  return t;
};
