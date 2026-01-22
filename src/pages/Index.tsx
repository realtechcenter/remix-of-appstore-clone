import { useState } from "react";

import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { HeroSlider } from "@/components/HeroSlider";
import { AppGrid } from "@/components/AppGrid";
import { GamesGrid } from "@/components/GamesGrid";
import { PageTransition } from "@/components/PageTransition";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { language } = useLanguage();
  const t = useTranslations();

  // Render content based on active category
  const renderContent = () => {
    // When searching, show all categories
    if (searchQuery) {
      return (
        <>
          <AppGrid searchQuery={searchQuery} />
          <GamesGrid searchQuery={searchQuery} />
        </>
      );
    }

    switch (activeCategory) {
      case "programs":
        return <AppGrid searchQuery={searchQuery} showViewAll={false} />;
      case "games":
        return <GamesGrid searchQuery={searchQuery} />;
      case "extensions":
        return (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">{language === 'km' ? 'មិនមានផ្នែកបន្ថែមនៅឡើយ' : 'No extensions available yet'}</p>
          </div>
        );
      case "os":
        return (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">{language === 'km' ? 'មិនមានប្រព័ន្ធប្រតិបត្តិការនៅឡើយ' : 'No operating systems available yet'}</p>
          </div>
        );
      case "articles":
        return (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">{language === 'km' ? 'មិនមានអត្ថបទនៅឡើយ' : 'No articles available yet'}</p>
          </div>
        );
      case "goods":
        return (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">{language === 'km' ? 'មិនមានទំនិញនៅឡើយ' : 'No goods available yet'}</p>
          </div>
        );
      default:
        // "all" or any other - show both programs and games
        return (
          <>
            <AppGrid searchQuery={searchQuery} />
            <GamesGrid searchQuery={searchQuery} />
          </>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-background ${language === 'km' ? 'font-khmer' : ''}`}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        activeCategory={activeCategory} 
        onCategoryChange={(category) => {
          setActiveCategory(category);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <main className="lg:ml-64 px-4 sm:px-6 lg:px-8 pb-12">
        <Header 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />
        {!searchQuery && activeCategory === "all" && <HeroSlider />}
        <PageTransition transitionKey={`${activeCategory}-${searchQuery}`}>
          {renderContent()}
        </PageTransition>
      </main>
    </div>
  );
};

export default Index;
