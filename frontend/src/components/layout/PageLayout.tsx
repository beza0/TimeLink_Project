import type { ReactNode } from "react";
import type { PageType } from "../../App";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { cn } from "../ui/utils";

interface PageLayoutProps {
  children: ReactNode;
  onNavigate?: (page: PageType) => void;
  className?: string;
  /** Tam ekran sayfalar (mesajlar): alt footer gizlenir, içerik kalan yüksekliği doldurur */
  hideFooter?: boolean;
}

export function PageLayout({
  children,
  onNavigate,
  className,
  hideFooter = false,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-background text-foreground antialiased transition-colors",
        hideFooter && "max-h-dvh overflow-hidden",
        className,
      )}
    >
      <Navbar onNavigate={onNavigate} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      {!hideFooter ? <Footer /> : null}
    </div>
  );
}
