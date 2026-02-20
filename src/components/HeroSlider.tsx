import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const slides = [
  {
    id: 1,
    badge: "FEATURED",
    badge_km: "ពិសេស",
    title: "Office 365 Subscription",
    title_km: "ការជាវ Office 365",
    subtitle: "Best productivity suite for your work",
    subtitle_km: "ឧបករណ៍ផលិតភាពល្អបំផុតសម្រាប់ការងាររបស់អ្នក",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=400&fit=crop",
  },
  {
    id: 2,
    badge: "NEW",
    badge_km: "ថ្មី",
    title: "Exclusive Games",
    title_km: "ហ្គេមផ្តាច់មុខ",
    subtitle: "Top rated games available now",
    subtitle_km: "ហ្គេមដែលមានការវាយតម្លៃខ្ពស់បំផុត",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=400&fit=crop",
  },
  {
    id: 3,
    badge: "PROMOTION",
    badge_km: "ការផ្សព្វផ្សាយ",
    title: "Premium Protection",
    title_km: "ការការពារកម្រិតខ្ពស់",
    subtitle: "Keep your system safe and secure",
    subtitle_km: "រក្សាប្រព័ន្ធរបស់អ្នកឱ្យមានសុវត្ថិភាព",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=400&fit=crop",
  },
];

export const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { language } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[currentSlide];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative mt-4 mb-6 group overflow-hidden border border-border" style={{ borderRadius: 'var(--radius)' }}>
      <div className="relative h-44 sm:h-52 md:h-64 flex items-end">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${slide.image})` }}
        />
        {/* Subtle dark overlay for text */}
        <div className="absolute inset-0 bg-foreground/50" />

        {/* Content */}
        <div className="relative z-10 p-5 sm:p-6 w-full">
          <span className="inline-block text-[10px] font-semibold text-background/80 bg-background/20 border border-background/20 px-2 py-0.5 rounded-sm mb-2 uppercase tracking-wider">
            {language === "km" ? slide.badge_km : slide.badge}
          </span>
          <h2 className="text-lg sm:text-xl font-semibold text-background mb-1">
            {language === "km" ? slide.title_km : slide.title}
          </h2>
          <p className="text-sm text-background/70 mb-3">
            {language === "km" ? slide.subtitle_km : slide.subtitle}
          </p>
          <button className="text-sm font-medium text-background border border-background/30 bg-background/10 hover:bg-background/20 px-3 py-1.5 rounded-sm transition-colors">
            {language === "km" ? "មើលបន្ថែម" : "Learn More"}
          </button>
        </div>

        {/* Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-sm bg-background/10 hover:bg-background/25 flex items-center justify-center text-background opacity-0 group-hover:opacity-100 transition-opacity border border-background/20"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-sm bg-background/10 hover:bg-background/25 flex items-center justify-center text-background opacity-0 group-hover:opacity-100 transition-opacity border border-background/20"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-3 right-4 flex gap-1">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1 rounded-full transition-all duration-300 ${
              index === currentSlide ? "bg-background w-6" : "bg-background/40 w-3 hover:bg-background/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
