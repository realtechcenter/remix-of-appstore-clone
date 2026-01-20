import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Zap, Gift, Shield } from "lucide-react";
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
    gradient: "from-blue-600 via-indigo-500 to-purple-600",
    icon: Sparkles,
  },
  {
    id: 2,
    badge: "NEW",
    badge_km: "ថ្មី",
    title: "Exclusive Games",
    title_km: "ហ្គេមផ្តាច់មុខ",
    subtitle: "Top rated games available now",
    subtitle_km: "ហ្គេមដែលមានការវាយតម្លៃខ្ពស់បំផុត",
    gradient: "from-purple-600 via-pink-500 to-rose-500",
    icon: Zap,
  },
  {
    id: 3,
    badge: "PROMOTION",
    badge_km: "ការផ្សព្វផ្សាយ",
    title: "Premium Protection",
    title_km: "ការការពារកម្រិតខ្ពស់",
    subtitle: "Keep your system safe and secure",
    subtitle_km: "រក្សាប្រព័ន្ធរបស់អ្នកឱ្យមានសុវត្ថិភាព",
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    icon: Shield,
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
  const SlideIcon = slide.icon;

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative mb-6 sm:mb-8 group">
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${slide.gradient} h-48 sm:h-56 md:h-72 flex items-center justify-between px-6 sm:px-8 md:px-12 transition-all duration-700`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        </div>

        {/* Content */}
        <div className="z-10 flex-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 mb-2 sm:mb-3 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <Gift className="w-3 h-3" />
            {language === 'km' ? slide.badge_km : slide.badge}
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 drop-shadow-lg">
            {language === 'km' ? slide.title_km : slide.title}
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-white/90 mb-4 sm:mb-6 max-w-md">
            {language === 'km' ? slide.subtitle_km : slide.subtitle}
          </p>
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl border border-white/20">
            {language === 'km' ? 'មើលបន្ថែម' : 'Learn More'}
          </button>
        </div>

        {/* Decorative icon */}
        <div className="relative hidden sm:flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-3xl blur-2xl scale-150" />
            <div className="relative w-28 md:w-36 h-28 md:h-36 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl animate-float">
              <SlideIcon className="w-12 md:w-16 h-12 md:h-16 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/20 hover:scale-110"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/20 hover:scale-110"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === currentSlide ? 'bg-white w-8' : 'bg-white/30 w-4 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
