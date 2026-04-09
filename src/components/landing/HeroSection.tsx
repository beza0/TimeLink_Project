import { Button } from "../ui/button";
import { Clock, Users, Sparkles } from "lucide-react";
import type { PageType } from "../../App";
import { useLanguage } from "../../contexts/LanguageContext";

interface HeroSectionProps {
  onNavigate?: (page: PageType) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  const { t } = useLanguage();
  const h = t.landing.hero;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 pt-24 pb-16 sm:pt-28 sm:pb-20">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 animate-pulse">
          <Clock className="w-16 h-16 text-white" />
        </div>
        <div className="absolute top-40 right-20 animate-pulse delay-75">
          <Users className="w-20 h-20 text-white" />
        </div>
        <div className="absolute bottom-32 left-1/4 animate-pulse delay-150">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <div className="absolute bottom-20 right-1/3 animate-pulse delay-100">
          <Clock className="w-14 h-14 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-6">
          <span className="inline-block px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30">
            {h.badge}
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white mb-6 tracking-tight">
          {h.line1} <br />
          <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
            {h.line2Earn}
          </span>{" "}
          <br />
          {h.line3}
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
          {h.subtitle}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90 shadow-xl px-8 py-6 rounded-full"
            onClick={() => onNavigate?.("signup")}
          >
            {h.joinNow}
          </Button>
          <Button 
            size="lg" 
            className="rounded-full border-2 border-primary/80 bg-card px-8 py-6 text-primary hover:bg-accent"
            onClick={() => onNavigate?.("how-it-works")}
          >
            {h.howItWorks}
          </Button>
        </div>
        
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm sm:text-base">{h.statMembers}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-sm sm:text-base">{h.statCategories}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
            <span className="text-sm sm:text-base">{h.statHours}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
