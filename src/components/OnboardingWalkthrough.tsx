import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Search, Grid3X3, CreditCard, User, ChevronRight, ChevronLeft, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "onboarding-walkthrough-dismissed";

interface Step {
  icon: React.ReactNode;
  titleEn: string;
  titleKm: string;
  descEn: string;
  descKm: string;
}

const steps: Step[] = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    titleEn: "Welcome to Macsofy!",
    titleKm: "សូមស្វាគមន៍មកកាន់ Macsofy!",
    descEn: "Your one-stop destination for macOS apps. Let us show you around!",
    descKm: "គោលដៅតែមួយគត់សម្រាប់កម្មវិធី macOS។ សូមឱ្យយើងបង្ហាញអ្នក!",
  },
  {
    icon: <Search className="w-6 h-6" />,
    titleEn: "Search & Browse",
    titleKm: "ស្វែងរក និងរុករក",
    descEn: "Use the search bar at the top to find apps, or browse categories from the sidebar.",
    descKm: "ប្រើរបារស្វែងរកខាងលើដើម្បីរកកម្មវិធី ឬរុករកប្រភេទពីរបារចំហៀង។",
  },
  {
    icon: <Grid3X3 className="w-6 h-6" />,
    titleEn: "Categories",
    titleKm: "ប្រភេទ",
    descEn: "Explore Programs, Games, Extensions, and more from the sidebar menu on the left.",
    descKm: "រុករកកម្មវិធី ហ្គេម ផ្នែកបន្ថែម និងអ្វីៗជាច្រើនទៀតពីម៉ឺនុយចំហៀងខាងឆ្វេង។",
  },
  {
    icon: <Download className="w-6 h-6" />,
    titleEn: "Download Apps",
    titleKm: "ទាញយកកម្មវិធី",
    descEn: "Click any app to view details, screenshots, and download links. Some apps are free, others require purchase.",
    descKm: "ចុចលើកម្មវិធីណាមួយដើម្បីមើលព័ត៌មានលម្អិត រូបថតអេក្រង់ និងតំណទាញយក។ កម្មវិធីខ្លះឥតគិតថ្លៃ ខ្លះទៀតត្រូវទិញ។",
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    titleEn: "Payment History",
    titleKm: "ប្រវត្តិបង់ប្រាក់",
    descEn: "After purchasing, track all your transactions in Payment History from your profile menu.",
    descKm: "បន្ទាប់ពីទិញ តាមដានប្រតិបត្តិការទាំងអស់នៅក្នុងប្រវត្តិបង់ប្រាក់ពីម៉ឺនុយប្រវត្តិរូបរបស់អ្នក។",
  },
  {
    icon: <User className="w-6 h-6" />,
    titleEn: "Your Profile",
    titleKm: "ប្រវត្តិរូបរបស់អ្នក",
    descEn: "Sign in to access your profile, wishlist, purchases, and personalized recommendations.",
    descKm: "ចូលគណនីដើម្បីចូលប្រវត្តិរូប បញ្ជីចង់បាន ការទិញ និងការណែនាំផ្ទាល់ខ្លួន។",
  },
];

export const OnboardingWalkthrough = () => {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-sm overflow-hidden animate-scale-in">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm hover:bg-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
            {step.icon}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {language === "km" ? step.titleKm : step.titleEn}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {language === "km" ? step.descKm : step.descEn}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 py-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentStep ? "bg-primary w-4" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5">
          {isFirst ? (
            <Button variant="ghost" size="sm" className="text-xs" onClick={dismiss}>
              {language === "km" ? "រំលង" : "Skip"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              <ChevronLeft className="w-3 h-3" />
              {language === "km" ? "ថយក្រោយ" : "Back"}
            </Button>
          )}

          {isLast ? (
            <Button size="sm" className="text-xs px-5" onClick={dismiss}>
              {language === "km" ? "ចាប់ផ្ដើមរុករក!" : "Start Exploring!"}
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs gap-1 px-4"
              onClick={() => setCurrentStep((s) => s + 1)}
            >
              {language === "km" ? "បន្ទាប់" : "Next"}
              <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
