
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Modal({ open, onOpenChange, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70"
        onClick={() => onOpenChange(false)}
      />
      
      <div className="relative z-50 w-full max-w-lg mx-4">
        <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-card text-card-foreground shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ModalContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

export function ModalHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function ModalTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl text-card-foreground">{children}</h2>;
}

export function ModalDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>;
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-3">{children}</div>;
}
