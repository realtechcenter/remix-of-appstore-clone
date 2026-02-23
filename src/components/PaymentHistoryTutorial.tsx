import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X, Filter, RefreshCw, MessageCircle, ChevronRight, ChevronLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "payment-history-tutorial-dismissed";

interface Step {
  icon: React.ReactNode;
  titleEn: string;
  titleKm: string;
  descEn: string;
  descKm: string;
}

const steps: Step[] = [
  {
    icon: <Filter className="w-5 h-5" />,
    titleEn: "Filter Orders",
    titleKm: "ត្រងការបញ្ជាទិញ",
    descEn: "Use the tabs above to filter by status — Pending, Paid, Failed, or Expired.",
    descKm: "ប្រើផ្ទាំងខាងលើដើម្បីត្រងតាមស្ថានភាព — រង់ចាំ បានបង់ បរាជ័យ ឬផុតកំណត់។",
  },
  {
    icon: <RefreshCw className="w-5 h-5" />,
    titleEn: "Verify Payment",
    titleKm: "ផ្ទៀងផ្ទាត់ការបង់ប្រាក់",
    descEn: "If your order is pending, tap \"Verify Payment\" on the order card to re-check the status with the server.",
    descKm: "ប្រសិនបើការបញ្ជាទិញរបស់អ្នកកំពុងរង់ចាំ សូមចុច \"ផ្ទៀងផ្ទាត់ការបង់ប្រាក់\" ដើម្បីពិនិត្យស្ថានភាពជាមួយម៉ាស៊ីនមេ។",
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    titleEn: "Need Help?",
    titleKm: "ត្រូវការជំនួយ?",
    descEn: "If it still shows Pending after verifying, contact our Facebook Page for support.",
    descKm: "ប្រសិនបើវានៅតែ Pending បន្ទាប់ពីផ្ទៀងផ្ទាត់ សូមទាក់ទង Facebook Page របស់យើងសម្រាប់ជំនួយ។",
  },
];

export const PaymentHistoryTutorial = () => {
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

  return (
    <div className="border border-primary/20 rounded-md bg-primary/5 dark:bg-primary/10 mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Lightbulb className="w-4 h-4" />
          {language === "km" ? "មគ្គុទ្ទេសក៍រហ័ស" : "Quick Guide"}
          <span className="text-xs text-muted-foreground font-normal">
            {currentStep + 1}/{steps.length}
          </span>
        </div>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm hover:bg-accent"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Step content */}
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
            {step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground">
              {language === "km" ? step.titleKm : step.titleEn}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {language === "km" ? step.descKm : step.descEn}
            </p>
          </div>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-primary/10">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={isFirst}
          onClick={() => setCurrentStep((s) => s - 1)}
        >
          <ChevronLeft className="w-3 h-3" />
          {language === "km" ? "ថយក្រោយ" : "Back"}
        </Button>
        {isLast ? (
          <Button size="sm" className="h-7 text-xs" onClick={dismiss}>
            {language === "km" ? "យល់ហើយ!" : "Got it!"}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setCurrentStep((s) => s + 1)}
          >
            {language === "km" ? "បន្ទាប់" : "Next"}
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
