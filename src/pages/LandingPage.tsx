import { PageLayout } from "../components/layout/PageLayout";
import { HeroSection } from "../components/landing/HeroSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { CategoriesSection } from "../components/landing/CategoriesSection";
import { TestimonialsSection } from "../components/landing/TestimonialsSection";
import type { PageType } from "../App";

interface LandingPageProps {
  onNavigate?: (page: PageType) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <PageLayout onNavigate={onNavigate}>
      <HeroSection onNavigate={onNavigate} />
      <FeaturesSection />
      <CategoriesSection />
      <TestimonialsSection />
    </PageLayout>
  );
}
