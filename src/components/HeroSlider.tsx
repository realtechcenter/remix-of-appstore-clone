import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const slides = [
  {
    id: 1,
    badge: "FEATURED",
    badge_km: "ពិសេស",
    title: "Office 365 Subscription",
    title_km: "ការជាវ Office 365",
    subtitle: "The ultimate productivity suite for creators & professionals",
    subtitle_km: "ឧបករណ៍ផលិតភាពល្អបំផុតសម្រាប់ការងាររបស់អ្នក",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1400&h=500&fit=crop&q=90",
    gradient: "from-slate-900/90 via-slate-800/60 to-transparent",
    accent: "#E40046",
  },
  {
    id: 2,
    badge: "NEW",
    badge_km: "ថ្មី",
    title: "Exclusive Games",
    title_km: "ហ្គេមផ្តាច់មុខ",
    subtitle: "Top-rated titles you can't find anywhere else",
    subtitle_km: "ហ្គេមដែលមានការវាយតម្លៃខ្ពស់បំផុត",
    image: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1400&h=500&fit=crop&q=90",
    gradient: "from-indigo-950/90 via-purple-900/60 to-transparent",
    accent: "#7C3AED",
  },
  {
    id: 3,
    badge: "PROMOTION",
    badge_km: "ការផ្សព្វផ្សាយ",
    title: "Premium Security Suite",
    title_km: "ការការពារកម្រិតខ្ពស់",
    subtitle: "Military-grade protection for your digital life",
    subtitle_km: "រក្សាប្រព័ន្ធរបស់អ្នកឱ្យមានសុវត្ថិភាព",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1400&h=500&fit=crop&q=90",
    gradient: "from-emerald-950/90 via-teal-900/60 to-transparent",
    accent: "#059669",
  },
  {
    id: 4,
    badge: "POPULAR",
    badge_km: "ពេញនិយម",
    title: "Creative Design Tools",
    title_km: "ឧបករណ៍រចនាប័ទ្ម",
    subtitle: "Bring your creative vision to life with pro-grade apps",
    subtitle_km: "ឧបករណ៍រចនាកម្រិតខ្ពស់សម្រាប់អ្នកច្នៃប្រឌិត",
    image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1400&h=500&fit=crop&q=90",
    gradient: "from-orange-950/90 via-red-900/60 to-transparent",
    accent: "#EA580C",
  },
];

const INTERVAL = 5000;

export const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { language } = useLanguage();
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToSlide = (index: number) => {
    if (animating || index === currentSlide) return;
    setPrevSlide(currentSlide);
    setAnimating(true);
    setCurrentSlide(index);
    setProgress(0);
    setTimeout(() => setAnimating(false), 600);
  };

  const nextSlide = () => goToSlide((currentSlide + 1) % slides.length);
  const prevSlideBtn = () => goToSlide((currentSlide - 1 + slides.length) % slides.length);

  // Progress bar + auto-advance
  useEffect(() => {
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const step = 100 / (INTERVAL / 50);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 50);

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        setPrevSlide(prev);
        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);
        setProgress(0);
        return (prev + 1) % slides.length;
      });
    }, INTERVAL);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSlide]);

  const slide = slides[currentSlide];
  const prev = prevSlide !== null ? slides[prevSlide] : null;

  return (
    <div
      className="relative mt-4 mb-8 group overflow-hidden border border-border shadow-md"
      style={{ borderRadius: "var(--radius)" }}
    >
      <div className="relative h-52 sm:h-64 md:h-80">

        {/* Previous slide (fades out) */}
        {prev && animating && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${prev.image})`,
              animation: "hero-fade-out 0.6s ease forwards",
            }}
          />
        )}

        {/* Current slide image (fades in) */}
        <div
          key={currentSlide}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${slide.image})`,
            animation: "hero-fade-in 0.7s ease forwards",
          }}
        />

        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}
          style={{ transition: "opacity 0.6s ease" }}
        />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Content */}
        <div
          key={`content-${currentSlide}`}
          className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 z-10"
          style={{ animation: "hero-content-up 0.6s ease forwards" }}
        >
          {/* Badge */}
          <span
            className="inline-flex items-center self-start text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 uppercase tracking-widest text-white"
            style={{ backgroundColor: slide.accent, boxShadow: `0 0 12px ${slide.accent}60` }}
          >
            {language === "km" ? slide.badge_km : slide.badge}
          </span>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1.5 leading-tight drop-shadow-sm">
            {language === "km" ? slide.title_km : slide.title}
          </h2>
          <p className="text-sm sm:text-base text-white/75 mb-4 max-w-md leading-relaxed">
            {language === "km" ? slide.subtitle_km : slide.subtitle}
          </p>
          <button
            className="self-start text-sm font-semibold text-white px-4 py-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: slide.accent,
              boxShadow: `0 4px 14px ${slide.accent}50`,
            }}
          >
            {language === "km" ? "មើលបន្ថែម" : "Learn More"}
          </button>
        </div>

        {/* Arrow buttons */}
        <button
          onClick={prevSlideBtn}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/25 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/20 hover:scale-110 z-20"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/25 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/20 hover:scale-110 z-20"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Slide counter */}
        <div className="absolute top-3 right-4 text-[11px] font-medium text-white/60 z-20 tabular-nums">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>

      {/* Progress bar + dot indicators */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Dot indicators */}
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className="transition-all duration-300"
              style={{
                height: "6px",
                borderRadius: "3px",
                width: index === currentSlide ? "20px" : "6px",
                backgroundColor: index === currentSlide ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes hero-fade-in {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes hero-fade-out {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.97); }
        }
        @keyframes hero-content-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
