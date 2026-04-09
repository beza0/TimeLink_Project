import type { ReactNode } from "react";
import type { PageType } from "../../App";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface PageLayoutProps {
  children: ReactNode;
  onNavigate?: (page: PageType) => void;
  className?: string;
}

export function PageLayout({ children, onNavigate, className }: PageLayoutProps) {
  return (
    <div className={className ?? "min-h-screen"}>
      <Navbar onNavigate={onNavigate} />
      {children}
      <Footer />
    </div>
  );
}
