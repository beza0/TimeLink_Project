import type { ReactNode } from "react";
import type { PageType } from "../../App";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { cn } from "../ui/utils";

interface PageLayoutProps {
  children: ReactNode;
  onNavigate?: (page: PageType) => void;
  className?: string;
}

export function PageLayout({ children, onNavigate, className }: PageLayoutProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground antialiased transition-colors",
        className,
      )}
    >
      <Navbar onNavigate={onNavigate} />
      {children}
      <Footer />
    </div>
  );
}
