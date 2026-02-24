import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export interface CoachStep {
  target: string; // data-tour attribute value
  titleEn: string;
  titleKm: string;
  descEn: string;
  descKm: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface CoachMarksProps {
  steps: CoachStep[];
  storageKey: string;
  onComplete?: () => void;
}

export const CoachMarks = ({ steps, storageKey, onComplete }: CoachMarksProps) => {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const globalDismissed = localStorage.getItem("coach-marks-global-shown");
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed && !globalDismissed) {
      // Small delay so DOM is ready
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const measureTarget = useCallback(() => {
    if (!visible || !steps[current]) return;
    const el = document.querySelector(`[data-tour="${steps[current].target}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      // Auto-skip to next step if target not found
      if (current < steps.length - 1) {
        setCurrent((s) => s + 1);
      } else {
        setRect(null);
      }
    }
  }, [visible, current, steps]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(storageKey, "true");
    localStorage.setItem("coach-marks-global-shown", "true");
    onComplete?.();
  }, [storageKey, onComplete]);

  const next = () => {
    if (current < steps.length - 1) setCurrent((s) => s + 1);
    else dismiss();
  };

  const prev = () => {
    if (current > 0) setCurrent((s) => s - 1);
  };

  if (!visible || !rect) return null;

  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;
  const pad = 6;

  // Tooltip position
  const placement = step.placement || "bottom";
  let tooltipStyle: React.CSSProperties = { position: "fixed", zIndex: 10001 };

  if (placement === "bottom") {
    tooltipStyle.top = rect.bottom + pad + 8;
    tooltipStyle.left = Math.max(12, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 312));
  } else if (placement === "top") {
    tooltipStyle.bottom = window.innerHeight - rect.top + pad + 8;
    tooltipStyle.left = Math.max(12, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 312));
  } else if (placement === "right") {
    tooltipStyle.top = Math.max(12, rect.top + rect.height / 2 - 50);
    tooltipStyle.left = rect.right + pad + 8;
  } else {
    tooltipStyle.top = Math.max(12, rect.top + rect.height / 2 - 50);
    tooltipStyle.right = window.innerWidth - rect.left + pad + 8;
  }

  return createPortal(
    <>
      {/* Overlay with cutout */}
      <div className="fixed inset-0 z-[10000] pointer-events-auto" onClick={dismiss}>
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="coach-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - pad}
                y={rect.top - pad}
                width={rect.width + pad * 2}
                height={rect.height + pad * 2}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="hsl(0 0% 0% / 0.5)"
            mask="url(#coach-mask)"
          />
        </svg>

        {/* Highlight ring */}
        <div
          className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      </div>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="w-[300px] bg-card border border-border rounded-lg shadow-lg z-[10001] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-xs text-muted-foreground">
            {current + 1} / {steps.length}
          </span>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm hover:bg-accent"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-2">
          <h4 className="text-sm font-semibold text-foreground mb-1">
            {language === "km" ? step.titleKm : step.titleEn}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {language === "km" ? step.descKm : step.descEn}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 pb-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={isFirst}
            onClick={prev}
          >
            <ChevronLeft className="w-3 h-3" />
            {language === "km" ? "ថយក្រោយ" : "Back"}
          </Button>

          {isLast ? (
            <Button size="sm" className="h-7 text-xs px-4" onClick={dismiss}>
              {language === "km" ? "រួចរាល់!" : "Done!"}
            </Button>
          ) : (
            <Button size="sm" className="h-7 text-xs gap-1 px-4" onClick={next}>
              {language === "km" ? "បន្ទាប់" : "Next"}
              <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};
