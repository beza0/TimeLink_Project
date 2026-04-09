import { PageLayout } from "../components/layout/PageLayout";
import type { PageType } from "../App";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  UserPlus,
  Search,
  BookOpen,
  Clock,
  Award,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const stepIcons = [UserPlus, Search, BookOpen, Award] as const;

interface HowItWorksPageProps {
  onNavigate?: (page: PageType) => void;
}

export function HowItWorksPage({ onNavigate }: HowItWorksPageProps) {
  const { t } = useLanguage();
  const h = t.howItWorks;

  return (
    <PageLayout onNavigate={onNavigate} className="min-h-screen bg-gray-50">
      
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl text-white mb-6">
            {h.heroTitle}
          </h1>
          <p className="text-xl text-white/90 mb-8">
            {h.heroSubtitle}
          </p>
          <Button
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100 shadow-xl px-8 py-6 rounded-full"
            onClick={() => onNavigate?.("signup")}
          >
            {h.getStartedFree}
          </Button>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
            {h.stepsTitle}
          </h2>
          <p className="text-lg text-gray-600">
            {h.stepsSubtitle}
          </p>
        </div>
        
        <div className="space-y-12">
          {h.steps.map((step, index) => {
            const Icon = stepIcons[index];
            const gradients = [
              "from-blue-500 to-cyan-500",
              "from-purple-500 to-pink-500",
              "from-orange-500 to-red-500",
              "from-green-500 to-emerald-500",
            ] as const;
            const isEven = index % 2 === 0;
            
            return (
              <div 
                key={index}
                className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center`}
              >
                <div className="flex-1">
                  <Card className="p-8 rounded-3xl border-0 shadow-xl hover:shadow-2xl transition-shadow">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradients[index]} flex items-center justify-center mb-6 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className={`text-6xl opacity-10 ${isEven ? '' : 'text-right'} mb-4`}>
                      {step.number}
                    </div>
                    
                    <h3 className="text-2xl text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    
                    <p className="text-gray-600 text-lg">
                      {step.description}
                    </p>
                  </Card>
                </div>
                
                {index < h.steps.length - 1 && (
                  <div className={`hidden md:block ${isEven ? '' : 'order-first'}`}>
                    <ArrowRight className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl text-gray-900 mb-6">
                {h.creditsTitle}
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                {h.creditsIntro}
              </p>
              
              <div className="space-y-4">
                <Card className="p-4 rounded-xl bg-blue-50 border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-900">{h.teachHour}</p>
                      <p className="text-sm text-gray-600">{h.teachHourSub}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 rounded-xl bg-purple-50 border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-900">{h.learnHour}</p>
                      <p className="text-sm text-gray-600">{h.learnHourSub}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
            
            <Card className="p-8 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 border-0 shadow-2xl text-white">
              <h3 className="text-2xl mb-4">{h.bonusTitle}</h3>
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-xl mb-2">{h.bonusCredits}</p>
              <p className="text-white/80 mb-6">
                {h.bonusDesc}
              </p>
              <Button
                className="bg-white text-purple-600 hover:bg-gray-100 w-full"
                onClick={() => onNavigate?.("signup")}
              >
                {h.claimBonus}
              </Button>
            </Card>
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
            {h.whyTitle}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {h.benefits.map((benefit, index) => (
            <Card key={index} className="p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <p className="text-gray-700">{benefit}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
              {h.faqTitle}
            </h2>
          </div>
          
          <div className="space-y-4">
            {h.faqs.map((faq, index) => (
              <Card key={index} className="p-6 rounded-2xl border-0 shadow-lg">
                <h3 className="text-lg text-gray-900 mb-2">
                  {faq.q}
                </h3>
                <p className="text-gray-600">
                  {faq.a}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl text-white mb-6">
            {h.ctaTitle}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {h.ctaSubtitle}
          </p>
          <Button
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100 shadow-xl px-8 py-6 rounded-full"
            onClick={() => onNavigate?.("signup")}
          >
            {h.ctaButton}
          </Button>
        </div>
      </div>
      
    </PageLayout>
  );
}
