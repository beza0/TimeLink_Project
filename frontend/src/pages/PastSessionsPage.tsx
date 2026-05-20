import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar, Clock, Star } from "lucide-react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { formatTemplate } from "../language";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchReceivedExchangeRequests,
  fetchSentExchangeRequests,
} from "../api/exchange";
import { fetchMyGivenReviews, type ReviewDto } from "../api/reviews";
import { initialsFromFullName } from "../lib/initials";

interface PastSessionsPageProps {
  onNavigate?: (page: PageType) => void;
}

type SessionRow = {
  id: string;
  kind: "learned" | "taught";
  skillTitle: string;
  otherName: string;
  whenLabel: string;
  durationLabel: string;
  sortTime: number;
  /** Sadece öğrenci (learned) ve değerlendirme verildiyse */
  rated: boolean;
  rating?: number;
  /** Öğrenci puanı vermediyse Profile → Learning sekmesine yönlendir */
  canRate: boolean;
};

type PastSessionsCopy = {
  learnedLine: string;
  taughtLine: string;
  learned: string;
  taught: string;
  youRated: string;
  rateReview: string;
  rateOnProfileHint: string;
};

function formatWhen(
  iso: string | null | undefined,
  loc: string,
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(loc === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(minutes: number, loc: string): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (loc === "tr") {
    if (h > 0 && m === 0) return `${h} sa`;
    if (h > 0) return `${h} sa ${m} dk`;
    return `${m} dk`;
  }
  if (h > 0 && m === 0) return `${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

export function PastSessionsPage({ onNavigate }: PastSessionsPageProps) {
  const { t, locale } = useLanguage();
  const p = t.pastSessions;
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!token || !user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sent, received, given] = await Promise.all([
          fetchSentExchangeRequests(token),
          fetchReceivedExchangeRequests(token),
          fetchMyGivenReviews(token),
        ]);
        if (cancelled) return;
        const givenByEx = new Map<string, ReviewDto>();
        for (const r of given) {
          givenByEx.set(r.exchangeRequestId, r);
        }
        const out: SessionRow[] = [];
        for (const ex of sent) {
          if (ex.status !== "COMPLETED") continue;
          const rev = givenByEx.get(ex.id);
          out.push({
            id: ex.id,
            kind: "learned",
            skillTitle: ex.skillTitle,
            otherName: ex.ownerName,
            whenLabel: formatWhen(ex.scheduledStartAt, locale),
            durationLabel: formatDuration(ex.bookedMinutes, locale),
            sortTime: new Date(ex.createdAt).getTime(),
            rated: rev != null,
            rating: rev?.rating,
            canRate: rev == null,
          });
        }
        for (const ex of received) {
          if (ex.status !== "COMPLETED") continue;
          out.push({
            id: ex.id,
            kind: "taught",
            skillTitle: ex.skillTitle,
            otherName: ex.requesterName,
            whenLabel: formatWhen(ex.scheduledStartAt, locale),
            durationLabel: formatDuration(ex.bookedMinutes, locale),
            sortTime: new Date(ex.createdAt).getTime(),
            rated: true,
            canRate: false,
          });
        }
        out.sort((a, b) => b.sortTime - a.sortTime);
        setRows(out);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id, locale]);

  const learned = useMemo(
    () => rows.filter((r) => r.kind === "learned"),
    [rows],
  );
  const taught = useMemo(
    () => rows.filter((r) => r.kind === "taught"),
    [rows],
  );

  const goProfileLearningToRate = () => {
    try {
      sessionStorage.setItem("timelink_profile_tab", "learning");
    } catch {
      /* ignore */
    }
    onNavigate?.("profile");
  };

  if (loading) {
    return (
      <PageLayout hideFooter onNavigate={onNavigate}>
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-24 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout hideFooter onNavigate={onNavigate}>
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-4 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col min-h-0">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl text-foreground">{p.title}</h1>
            <p className="text-muted-foreground">{p.subtitle}</p>
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1 shadow-lg">
              <TabsTrigger value="all" className="rounded-lg px-2 py-2 text-xs sm:px-3 sm:text-sm">
                {p.tabAll}
              </TabsTrigger>
              <TabsTrigger value="learned" className="rounded-lg px-2 py-2 text-xs sm:px-3 sm:text-sm">
                {p.tabLearned}
              </TabsTrigger>
              <TabsTrigger value="taught" className="rounded-lg px-2 py-2 text-xs sm:px-3 sm:text-sm">
                {p.tabTaught}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {rows.length === 0 ? (
                <EmptySessions message={p.emptyAll} />
              ) : (
                rows.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    p={p}
                    onRate={goProfileLearningToRate}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="learned" className="space-y-4">
              {learned.length === 0 ? (
                <EmptySessions message={p.emptyLearned} />
              ) : (
                learned.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    p={p}
                    onRate={goProfileLearningToRate}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="taught" className="space-y-4">
              {taught.length === 0 ? (
                <EmptySessions message={p.emptyTaught} />
              ) : (
                taught.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    p={p}
                    onRate={goProfileLearningToRate}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}

function EmptySessions({ message }: { message: string }) {
  return (
    <Card className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center sm:px-8 sm:py-12">
      <p className="mx-auto max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
        {message}
      </p>
    </Card>
  );
}

function SessionCard({
  session,
  p,
  onRate,
}: {
  session: SessionRow;
  p: PastSessionsCopy;
  onRate: () => void;
}) {
  return (
    <Card className="rounded-xl border border-border p-6 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
          aria-hidden
        >
          {initialsFromFullName(session.otherName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="min-w-0">
              <h3 className="mb-1 text-lg text-foreground">{session.skillTitle}</h3>
              <p className="text-sm text-muted-foreground">
                {session.kind === "learned"
                  ? formatTemplate(p.learnedLine, { name: session.otherName })
                  : formatTemplate(p.taughtLine, { name: session.otherName })}
              </p>
            </div>
            <Badge
              variant={session.kind === "learned" ? "default" : "secondary"}
              className="shrink-0"
            >
              {session.kind === "learned" ? p.learned : p.taught}
            </Badge>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{session.whenLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{session.durationLabel}</span>
            </div>
          </div>

          {session.kind === "learned" && session.rated && session.rating != null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {Array.from({ length: session.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span>{p.youRated}</span>
            </div>
          ) : null}

          {session.kind === "learned" && session.canRate ? (
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                type="button"
                onClick={onRate}
              >
                {p.rateReview}
              </Button>
              <span className="text-xs text-muted-foreground max-w-sm">
                {p.rateOnProfileHint}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
