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
    <PageLayout onNavigate={onNavigate}>
      
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
            className="rounded-full bg-card px-8 py-6 text-primary shadow-xl hover:bg-accent"
            onClick={() => onNavigate?.("signup")}
          >
            {h.getStartedFree}
          </Button>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="mb-4 text-3xl text-foreground sm:text-4xl">
            {h.stepsTitle}
          </h2>
          <p className="text-lg text-muted-foreground">
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

            return (
              <div key={index} className="w-full">
                <Card className="rounded-3xl border-0 p-8 shadow-xl transition-shadow hover:shadow-2xl">
                  <div
                    className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[index]} shadow-lg`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  <div className="mb-4 text-left text-6xl font-semibold tabular-nums text-muted-foreground/35">
                    {step.number}
                  </div>

                  <h3 className="mb-3 text-2xl text-foreground">{step.title}</h3>

                  <p className="text-lg text-muted-foreground">{step.description}</p>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-background py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-6 text-3xl text-foreground">
                {h.creditsTitle}
              </h2>
              <p className="mb-6 text-lg text-muted-foreground">
                {h.creditsIntro}
              </p>
              
              <div className="space-y-4">
                <Card className="gap-0 rounded-xl border border-blue-500/25 bg-blue-500/[0.12] p-4 text-card-foreground shadow-sm dark:border-blue-500/35 dark:bg-blue-950/55">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{h.teachHour}</p>
                      <p className="text-sm text-muted-foreground">{h.teachHourSub}</p>
                    </div>
                  </div>
                </Card>

                <Card className="gap-0 rounded-xl border border-purple-500/25 bg-purple-500/[0.12] p-4 text-card-foreground shadow-sm dark:border-purple-500/35 dark:bg-purple-950/55">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{h.learnHour}</p>
                      <p className="text-sm text-muted-foreground">{h.learnHourSub}</p>
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
                className="w-full bg-card text-primary hover:bg-accent"
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
          <h2 className="mb-4 text-3xl text-foreground sm:text-4xl">
            {h.whyTitle}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {h.benefits.map((benefit, index) => (
            <Card key={index} className="rounded-xl border border-border p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
                <p className="text-foreground/90">{benefit}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="bg-muted/50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-3xl text-foreground sm:text-4xl">
              {h.faqTitle}
            </h2>
          </div>
          
          <div className="space-y-4">
            {h.faqs.map((faq, index) => (
              <Card key={index} className="rounded-2xl border-0 p-6 shadow-lg">
                <h3 className="mb-2 text-lg text-foreground">
                  {faq.q}
                </h3>
                <p className="text-muted-foreground">
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
            className="rounded-full bg-card px-8 py-6 text-primary shadow-xl hover:bg-accent"
            onClick={() => onNavigate?.("signup")}
          >
            {h.ctaButton}
          </Button>
        </div>
      </div>
      
    </PageLayout>
  );
}
