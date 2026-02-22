import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Maximize, PanelLeft, PanelRight, Minimize2 } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type WindowMode = 'normal' | 'fullscreen' | 'left' | 'right';

// Green button dropdown menu
const GreenButtonMenu = ({
  mode,
  onSelect,
}: {
  mode: WindowMode;
  onSelect: (mode: WindowMode) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const isFullscreen = mode === 'fullscreen' || mode === 'left' || mode === 'right';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-90 transition-all group relative focus:outline-none"
        aria-label="Window options"
      >
        <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#006500]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          {isFullscreen ? (
            <>
              <path d="M4 8L2 10M8 4l2-2" />
              <path d="M2 7v3h3M10 5V2H7" />
            </>
          ) : (
            <>
              <path d="M3.5 2v3.5H2M8.5 10V6.5H10" />
              <path d="M2 5.5L5.5 2M10 6.5L6.5 10" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg py-1 z-[60] animate-fade-in">
          {isFullscreen ? (
            <button
              onClick={() => { onSelect('normal'); setOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
            >
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
              Exit Full Screen
            </button>
          ) : (
            <button
              onClick={() => { onSelect('fullscreen'); setOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
            >
              <Maximize className="w-4 h-4 text-muted-foreground" />
              Enter Full Screen
            </button>
          )}

          <div className="border-t border-border/50 my-1" />

          <button
            onClick={() => { onSelect(mode === 'left' ? 'normal' : 'left'); setOpen(false); }}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors",
              mode === 'left' ? "text-primary bg-accent" : "text-popover-foreground hover:bg-accent"
            )}
          >
            <PanelLeft className="w-4 h-4 text-muted-foreground" />
            Tile Window to Left of Screen
          </button>

          <button
            onClick={() => { onSelect(mode === 'right' ? 'normal' : 'right'); setOpen(false); }}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors",
              mode === 'right' ? "text-primary bg-accent" : "text-popover-foreground hover:bg-accent"
            )}
          >
            <PanelRight className="w-4 h-4 text-muted-foreground" />
            Tile Window to Right of Screen
          </button>
        </div>
      )}
    </div>
  );
};

// macOS traffic light dots
const TrafficLights = ({ mode, onModeChange }: { mode: WindowMode; onModeChange: (mode: WindowMode) => void }) => (
  <div className="flex items-center gap-2">
    <DialogPrimitive.Close asChild>
      <button
        className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all group relative focus:outline-none"
        aria-label="Close"
      >
        <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#4a0002]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
        </svg>
      </button>
    </DialogPrimitive.Close>
    <GreenButtonMenu mode={mode} onSelect={onModeChange} />
  </div>
);

const getWindowStyles = (mode: WindowMode): React.CSSProperties => {
  const transition = 'width 0.3s ease, height 0.3s ease, max-width 0.3s ease, max-height 0.3s ease, border-radius 0.3s ease, box-shadow 0.3s ease, left 0.3s ease, top 0.3s ease, transform 0.3s ease';

  switch (mode) {
    case 'fullscreen':
      return {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        borderRadius: 0,
        boxShadow: 'none',
        transform: 'translate(-50%, -50%)',
        transition,
      };
    case 'left':
      return {
        width: '50vw',
        height: '100vh',
        maxWidth: '50vw',
        maxHeight: '100vh',
        borderRadius: 0,
        boxShadow: 'none',
        left: '25%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        transition,
      };
    case 'right':
      return {
        width: '50vw',
        height: '100vh',
        maxWidth: '50vw',
        maxHeight: '100vh',
        borderRadius: 0,
        boxShadow: 'none',
        left: '75%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        transition,
      };
    default:
      return {
        maxWidth: '32rem',
        maxHeight: '85vh',
        borderRadius: '0.75rem',
        boxShadow: 'var(--shadow-window)',
        transform: 'translate(-50%, -50%)',
        transition,
      };
  }
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [mode, setMode] = React.useState<WindowMode>('normal');

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 grid w-full border-0 bg-card overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 left-[50%] top-[50%]",
          mode === 'normal' && "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className,
        )}
        style={getWindowStyles(mode)}
        {...props}
      >
        {/* macOS title bar */}
        <div className="flex items-center px-4 py-2.5 bg-muted/60 border-b border-border/50 shrink-0">
          <TrafficLights mode={mode} onModeChange={setMode} />
        </div>
        {/* Content area */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
