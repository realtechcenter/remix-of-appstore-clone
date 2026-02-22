import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

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

// macOS traffic light dots (red close + green maximize)
const TrafficLights = ({ onMaximize }: { onMaximize?: () => void }) => (
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
    <button
      onClick={onMaximize}
      className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-90 transition-all group relative focus:outline-none"
      aria-label="Maximize"
    >
      <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#006500]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M3 3h6v6H3z" />
      </svg>
    </button>
  </div>
);

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [maximized, setMaximized] = React.useState(false);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 grid border-0 bg-card overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 left-[50%] top-[50%]",
          !maximized && "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className,
        )}
        style={{
          boxShadow: maximized ? 'none' : 'var(--shadow-window)',
          width: maximized ? '100vw' : undefined,
          height: maximized ? '100vh' : undefined,
          maxWidth: maximized ? '100vw' : '32rem',
          maxHeight: maximized ? '100vh' : '85vh',
          borderRadius: maximized ? 0 : '0.75rem',
          transform: maximized
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%)',
          transition: 'width 0.3s ease, height 0.3s ease, max-width 0.3s ease, max-height 0.3s ease, border-radius 0.3s ease, box-shadow 0.3s ease',
        }}
        {...props}
      >
        {/* macOS title bar */}
        <div className="flex items-center px-4 py-2.5 bg-muted/60 border-b border-border/50 shrink-0">
          <TrafficLights onMaximize={() => setMaximized(m => !m)} />
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
