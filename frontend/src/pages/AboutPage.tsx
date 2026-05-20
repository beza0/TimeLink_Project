import { PageLayout } from "../components/layout/PageLayout";
import type { PageType } from "../App";
import {
  Clock,
  Users,
  Heart,
  Award,
  Target,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { fetchPublicPlatformStats, type PublicPlatformStats } from "../api/publicStats";
import "../styles/about.css";

const valueIcons = [Users, Heart, Award, Target, Sparkles, Clock] as const;

const valueIconClasses = [
  "value-icon value-icon-blue",
  "value-icon value-icon-purple",
  "value-icon value-icon-indigo",
  "value-icon value-icon-blue",
  "value-icon value-icon-purple",
  "value-icon value-icon-indigo",
] as const;

interface AboutPageProps {
  onNavigate?: (page: PageType) => void;
}

function formatCount(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function completedHoursRounded(totalMinutes: number): number {
  return Math.round(totalMinutes / 60);
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const { t, locale } = useLanguage();
  const a = t.staticSite.about;
  const [stats, setStats] = useState<PublicPlatformStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatsError(false);
    fetchPublicPlatformStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) {
          setStats(null);
          setStatsError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = useMemo(() => {
    const nfLocale = locale === "tr" ? "tr-TR" : "en-US";
    const dash = "—";
    const loading = "…";

    const members =
      stats != null
        ? formatCount(stats.verifiedMemberCount, locale)
        : statsError
          ? dash
          : loading;
    const skills =
      stats != null
        ? formatCount(stats.skillsListedCount, locale)
        : statsError
          ? dash
          : loading;
    const hours =
      stats != null
        ? formatCount(completedHoursRounded(stats.completedSessionMinutesTotal), locale)
        : statsError
          ? dash
          : loading;
    const satisfaction =
      stats != null
        ? stats.satisfactionPercent != null
          ? `${new Intl.NumberFormat(nfLocale, { maximumFractionDigits: 0 }).format(stats.satisfactionPercent)}%`
          : dash
        : statsError
          ? dash
          : loading;

    return [
      { number: members, label: a.stats.members },
      { number: skills, label: a.stats.skills },
      { number: hours, label: a.stats.hours },
      { number: satisfaction, label: a.stats.satisfaction },
    ];
  }, [a.stats, locale, stats, statsError]);

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="about-page">
        <div className="about-content">
          {/* Hero */}
          <section className="about-hero">
            <div className="about-hero-container">
              <div className="about-hero-icon">
                <Clock className="icon-large" aria-hidden />
              </div>
              <h1 className="about-hero-title">{a.heroTitle}</h1>
              <p className="about-hero-subtitle">{a.heroSubtitle}</p>
            </div>
          </section>

          {/* Mission + stats */}
          <section className="about-section">
            <div className="about-section-container">
              <div className="about-grid-2">
                <div className="about-text-content">
                  <h2 className="about-section-title">{a.missionTitle}</h2>
                  <p className="about-paragraph">{a.missionP1}</p>
                  <p className="about-paragraph">{a.missionP2}</p>
                </div>
                <div className="about-stats-grid">
                  {statCards.map((stat, i) => (
                    <div key={i} className="about-stat-card">
                      <div className="stat-number">{stat.number}</div>
                      <div className="stat-label">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Values */}
          <section className="about-section about-section-gray">
            <div className="about-section-container">
              <h2 className="about-section-title about-section-title-center">
                {a.valuesTitle}
              </h2>
              <div className="about-values-grid">
                {a.values.map((item, index) => {
                  const Icon = valueIcons[index];
                  return (
                    <div key={index} className="about-value-card">
                      <div className={valueIconClasses[index]}>
                        <Icon aria-hidden />
                      </div>
                      <h3 className="value-title">{item.title}</h3>
                      <p className="value-text">{item.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Story */}
          <section className="about-section">
            <div className="about-section-container">
              <div className="about-story">
                <h2 className="about-section-title about-section-title-center">
                  {a.storyTitle}
                </h2>
                <div className="about-story-content">
                  {a.storyParagraphs.map((para, i) => (
                    <p key={i} className="about-paragraph">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="about-cta">
            <div className="about-cta-container">
              <h2 className="about-cta-title">{a.ctaTitle}</h2>
              <p className="about-cta-text">{a.ctaSubtitle}</p>
              <button
                type="button"
                className="about-cta-button"
                onClick={() => onNavigate?.("signup")}
              >
                {a.ctaButton}
              </button>
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
