import { PageLayout } from "../components/layout/PageLayout";
import type { PageType } from "../App";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  MapPin,
  Calendar,
  Star,
  BookOpen,
  Clock,
  Edit,
  Share2,
  Mail,
} from "lucide-react";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { formatTemplate } from "../language";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMyProfile, type UserProfileDto } from "../api/user";
import { fetchMySkills, type SkillDto } from "../api/skills";
import {
  createReview,
  fetchMyGivenReviews,
  fetchMyGivenRatingSummary,
  fetchMyReceivedReviews,
  fetchMyRatingSummary,
  type ReviewDto,
  type UserRatingSummaryDto,
} from "../api/reviews";
import {
  fetchReceivedExchangeRequests,
  fetchSentExchangeRequests,
  type ExchangeRequestDto,
} from "../api/exchange";
import { initialsFromFullName } from "../lib/initials";
import { resolveSkillCoverImageUrl } from "../lib/skillCoverImageUrl";
import { apiErrorDisplayMessage } from "../api/client";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../components/ui/modal";

interface ProfilePageProps {
  onNavigate?: (page: PageType) => void;
  onOpenSkillDetail?: (skillId: string) => void;
}

function formatCreditMinutes(minutes: number, locale: string): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "tr") {
    if (h > 0 && m === 0) return `${h} saat`;
    if (h > 0) return `${h} sa ${m} dk`;
    return `${m} dk`;
  }
  if (h > 0 && m === 0) return `${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function skillCardDescriptionPreview(description: string): string {
  const sep = "\n\n———\n";
  const idx = description.indexOf(sep);
  if (idx >= 0) {
    return description.slice(0, idx).trim();
  }

  // Fallback for legacy rows where metadata was saved inline without separator.
  const filtered = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const lower = line.toLowerCase();
      return !(
        lower.startsWith("session type") ||
        lower.startsWith("oturum türü") ||
        lower.startsWith("location") ||
        lower.startsWith("konum") ||
        lower.startsWith("available days") ||
        lower.startsWith("müsait günler") ||
        lower.startsWith("available from") ||
        lower.startsWith("başlangıç") ||
        lower.startsWith("available until") ||
        lower.startsWith("bitiş") ||
        lower.startsWith("tags") ||
        lower.startsWith("etiketler")
      );
    });

  return filtered.join(" ").trim();
}

function fallbackSessionTypeFromDescription(description: string): string | null {
  const m = description.match(
    /(?:Session Type \*|Oturum türü \*)\s*:\s*([^\n]+)/i,
  );
  return m?.[1]?.trim() || null;
}

function fallbackLocationFromDescription(description: string): string | null {
  const m = description.match(/(?:Location|Konum)\s*:\s*([^\n]+)/i);
  return m?.[1]?.trim() || null;
}

function formatSessionTime(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSkillAvailability(
  skill: SkillDto,
  dayLabels: string[],
): string | null {
  const days = skill.availableDays ?? [];
  const from = skill.availableFrom;
  const until = skill.availableUntil;
  if (!days.length || !from || !until) return null;
  const dayIndex: Record<string, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6,
  };
  const localizedDays = days
    .map((d) => dayLabels[dayIndex[d]] ?? d)
    .filter(Boolean)
    .join(", ");
  return `${localizedDays} · ${from} - ${until}`;
}

function fallbackAvailabilityFromDescription(
  description: string,
  dayLabels: string[],
): string | null {
  const raw =
    description.match(
      /(Available Days \*|Müsait günler \*):\s*([^\n]+?)\s+(Available From \*|Başlangıç \*)[–-](Available Until \*|Bitiş \*):\s*(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/i,
    ) ??
    description.match(
      /(Available Days \*|Müsait günler \*):\s*([^\n]+)\n(?:.*)\s*(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/i,
    );
  if (!raw) return null;
  const daysRaw = raw[2]?.trim();
  const from = raw[5] ?? raw[3];
  const until = raw[6] ?? raw[4];
  if (!daysRaw || !from || !until) return null;
  const normalizedDays = daysRaw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const upper = d.toUpperCase();
      const dayIndex: Record<string, number> = {
        MONDAY: 0,
        TUESDAY: 1,
        WEDNESDAY: 2,
        THURSDAY: 3,
        FRIDAY: 4,
        SATURDAY: 5,
        SUNDAY: 6,
      };
      return dayLabels[dayIndex[upper]] ?? d;
    })
    .join(", ");
  return `${normalizedDays} · ${from} - ${until}`;
}

export function ProfilePage({
  onNavigate,
  onOpenSkillDetail,
}: ProfilePageProps) {
  const { t, locale } = useLanguage();
  const p = t.profile;
  const dayLabels = t.addSkill.days;
  const catLabels = t.browse.categoryLabels;
  const { user, token } = useAuth();

  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [mySkills, setMySkills] = useState<SkillDto[]>([]);
  const [receivedBookings, setReceivedBookings] = useState<ExchangeRequestDto[]>(
    [],
  );
  const [sentBookings, setSentBookings] = useState<ExchangeRequestDto[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewDto[]>([]);
  const [myGivenReviews, setMyGivenReviews] = useState<ReviewDto[]>([]);
  const [ratingSummary, setRatingSummary] =
    useState<UserRatingSummaryDto | null>(null);
  const [givenSummary, setGivenSummary] =
    useState<UserRatingSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    exchangeId: string;
    skillTitle: string;
    instructorName: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [mainTab, setMainTab] = useState<
    "teaching" | "learning" | "reviews"
  >("teaching");

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const settled = await Promise.allSettled([
      fetchMyProfile(token),
      fetchMySkills(token),
      fetchReceivedExchangeRequests(token),
      fetchSentExchangeRequests(token),
      fetchMyReceivedReviews(token),
      fetchMyRatingSummary(token),
      fetchMyGivenReviews(token),
      fetchMyGivenRatingSummary(token),
    ]);
    if (settled[0].status === "fulfilled") {
      setProfile(settled[0].value);
    } else {
      setProfile(null);
    }
    if (settled[1].status === "fulfilled") {
      setMySkills(settled[1].value);
    } else {
      setMySkills([]);
    }
    if (settled[2].status === "fulfilled") {
      setReceivedBookings(settled[2].value);
    } else {
      setReceivedBookings([]);
    }
    if (settled[3].status === "fulfilled") {
      setSentBookings(settled[3].value);
    } else {
      setSentBookings([]);
    }
    if (settled[4].status === "fulfilled") {
      setMyReviews(settled[4].value);
    } else {
      setMyReviews([]);
    }
    if (settled[5].status === "fulfilled") {
      setRatingSummary(settled[5].value);
    } else {
      setRatingSummary(null);
    }
    if (settled[6].status === "fulfilled") {
      setMyGivenReviews(settled[6].value);
    } else {
      setMyGivenReviews([]);
    }
    if (settled[7].status === "fulfilled") {
      setGivenSummary(settled[7].value);
    } else {
      setGivenSummary(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      const t = sessionStorage.getItem("timelink_profile_tab");
      if (t === "teaching" || t === "learning" || t === "reviews") {
        setMainTab(t);
        sessionStorage.removeItem("timelink_profile_tab");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const displayName = profile?.fullName ?? user?.name ?? "";
  const displayEmail = profile?.email?.trim() || user?.email?.trim() || "";
  /** API + oturum (kayıttan hemen sonra profil isteği gecikse bile pp görünsün) */
  const avatarSrc =
    profile?.avatarUrl?.trim() || user?.avatarUrl?.trim() || null;
  const creditLabel = profile
    ? formatCreditMinutes(profile.timeCreditMinutes, locale)
    : "—";

  const memberDateStr =
    profile?.createdAt != null
      ? new Date(profile.createdAt).toLocaleDateString(
          locale === "tr" ? "tr-TR" : "en-US",
          { year: "numeric", month: "long", day: "numeric" },
        )
      : null;

  const showRating =
    ratingSummary != null &&
    ratingSummary.totalReviews > 0 &&
    Number.isFinite(ratingSummary.averageRating);

  const learningBookings = useMemo(
    () =>
      sentBookings.filter(
        (b) => b.status === "ACCEPTED" || b.status === "COMPLETED",
      ),
    [sentBookings],
  );

  const teachingBookingsBySkill = useMemo(() => {
    const map = new Map<string, ExchangeRequestDto[]>();
    for (const b of receivedBookings) {
      if (!(b.status === "ACCEPTED" || b.status === "COMPLETED")) continue;
      const arr = map.get(b.skillId) ?? [];
      arr.push(b);
      map.set(b.skillId, arr);
    }
    return map;
  }, [receivedBookings]);

  const givenByExchangeId = useMemo(() => {
    const m = new Map<string, ReviewDto>();
    for (const r of myGivenReviews) {
      m.set(r.exchangeRequestId, r);
    }
    return m;
  }, [myGivenReviews]);

  const submitReview = async () => {
    if (!token || !reviewTarget || reviewRating < 1) {
      setReviewError(p.reviewSelectStars);
      return;
    }
    setReviewSaving(true);
    setReviewError(null);
    try {
      await createReview(token, reviewTarget.exchangeId, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewModalOpen(false);
      setReviewTarget(null);
      setReviewRating(0);
      setReviewComment("");
      await load();
    } catch (e) {
      setReviewError(apiErrorDisplayMessage(e, p.reviewError));
    } finally {
      setReviewSaving(false);
    }
  };

  const openReviewModal = (b: ExchangeRequestDto) => {
    setReviewTarget({
      exchangeId: b.id,
      skillTitle: b.skillTitle,
      instructorName: b.ownerName,
    });
    setReviewRating(0);
    setReviewComment("");
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const showGivenSummary =
    givenSummary != null &&
    givenSummary.totalReviews > 0 &&
    Number.isFinite(givenSummary.averageRating);

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {avatarSrc ? (
              <ImageWithFallback
                src={avatarSrc}
                alt=""
                className="w-32 h-32 rounded-2xl border-4 border-white object-cover shadow-2xl shrink-0"
              />
            ) : (
              <div
                className="w-32 h-32 rounded-2xl shadow-2xl border-4 border-white flex items-center justify-center text-3xl font-semibold text-white bg-white/20 shrink-0"
                aria-hidden
              >
                {initialsFromFullName(displayName)}
              </div>
            )}

            <div className="flex-1 text-white">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl mb-2">{displayName || "—"}</h1>
                  {displayEmail ? (
                    <div className="mb-3 flex items-center gap-2 text-white/90">
                      <Mail className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-sm sm:text-base break-all">
                        {displayEmail}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 mb-3 min-h-[28px]">
                    {showRating ? (
                      <>
                        <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                        <span className="text-lg">
                          {formatTemplate(p.reviewsCount, {
                            rating: ratingSummary.averageRating.toFixed(1),
                            count: String(ratingSummary.totalReviews),
                          })}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg text-white/80">
                        {p.noRatingsYet}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-card text-primary hover:bg-accent"
                    onClick={() => onNavigate?.("edit-profile")}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {p.editProfile}
                  </Button>
                </div>
              </div>

              {profile?.bio ? (
                <p className="text-white/90 mb-4 max-w-2xl">{profile.bio}</p>
              ) : null}

              <div className="flex flex-wrap gap-4 text-sm">
                {profile?.location ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{profile.location}</span>
                  </div>
                ) : null}
                {memberDateStr ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>
                      {formatTemplate(p.memberSince, { date: memberDateStr })}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {formatTemplate(p.timeCreditsLine, { time: creditLabel })}
                  </span>
                </div>
                {profile?.languages ? (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>{profile.languages}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
        {loading ? (
          <p className="text-muted-foreground py-8">{t.common.loading}</p>
        ) : (
          <Tabs
            value={mainTab}
            onValueChange={(v) =>
              setMainTab(v as "teaching" | "learning" | "reviews")
            }
            className="space-y-6"
          >
            <TabsList className="rounded-xl border border-border bg-muted p-1 shadow-lg">
              <TabsTrigger value="teaching" className="rounded-lg">
                {p.tabTeaching}
              </TabsTrigger>
              <TabsTrigger value="learning" className="rounded-lg">
                {p.tabLearning}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-lg">
                {p.tabReviews}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teaching" className="space-y-4">
              <Card className="rounded-2xl border-0 p-6 shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl text-foreground">{p.skillsTeach}</h2>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    onClick={() => onNavigate?.("add-skill")}
                  >
                    {p.addNewSkill}
                  </Button>
                </div>

                {mySkills.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">
                    {p.emptyTeaching}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mySkills.map((skill) => {
                      const skillBookings =
                        teachingBookingsBySkill.get(skill.id) ?? [];
                      const learnersCount = new Set(
                        skillBookings.map((b) => b.requesterId),
                      ).size;
                      const levelKey = skill.level
                        ? (`${skill.level.charAt(0).toUpperCase()}${skill.level.slice(1).toLowerCase()}` as keyof typeof p.skillLevels)
                        : null;
                      const levelText =
                        levelKey && levelKey in p.skillLevels
                          ? p.skillLevels[levelKey]
                          : skill.level;
                      const categoryLabel =
                        skill.category &&
                        (catLabels[
                          skill.category as keyof typeof catLabels
                        ] ?? skill.category);
                      const preview = skillCardDescriptionPreview(
                        skill.description,
                      );
                      const sessionTypeText =
                        skill.sessionTypes && skill.sessionTypes.length > 0
                          ? skill.sessionTypes
                              .map((v) =>
                                v === "in-person"
                                  ? t.addSkill.inPerson
                                  : t.addSkill.online,
                              )
                              .join(", ")
                          : fallbackSessionTypeFromDescription(skill.description);
                      const locationText =
                        (skill.inPersonLocation || "").trim() ||
                        fallbackLocationFromDescription(skill.description);
                      const availability = formatSkillAvailability(
                        skill,
                        dayLabels,
                      ) ?? fallbackAvailabilityFromDescription(skill.description, dayLabels);

                      const coverUrl = resolveSkillCoverImageUrl(skill);
                      return (
                        <Card
                          key={skill.id}
                          className="overflow-hidden rounded-xl border border-border bg-muted/25 p-0"
                        >
                          <div className="relative h-40 w-full overflow-hidden sm:h-44">
                            {coverUrl ? (
                              <ImageWithFallback
                                src={coverUrl}
                                alt={skill.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div
                                className="h-full w-full bg-gradient-to-br from-blue-500/35 via-purple-500/30 to-indigo-600/35"
                                aria-hidden
                              />
                            )}
                          </div>
                          <div className="p-5">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 pr-2">
                              <h3 className="text-lg text-foreground">
                                {skill.title}
                              </h3>
                              {categoryLabel ? (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {categoryLabel}
                                </p>
                              ) : null}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {levelText ? (
                                  <Badge variant="secondary">
                                    {levelText}
                                  </Badge>
                                ) : null}
                                {sessionTypeText ? (
                                  <Badge variant="outline">
                                    {sessionTypeText}
                                  </Badge>
                                ) : null}
                                {locationText ? (
                                  <Badge variant="outline">
                                    {locationText}
                                  </Badge>
                                ) : null}
                                {availability ? (
                                  <Badge variant="outline">{availability}</Badge>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm text-muted-foreground">
                                {p.ratingPending}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4 shrink-0" />
                              <span>
                                {formatTemplate(p.studentsLabel, {
                                  n: String(learnersCount),
                                })}
                              </span>
                            </div>
                          </div>

                          {preview ? (
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                              {preview}
                            </p>
                          ) : null}

                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => onNavigate?.("add-skill")}
                            >
                              {t.common.edit}
                            </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenSkillDetail?.(skill.id)}
                          >
                            {p.viewDetails}
                          </Button>
                          </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="learning" className="space-y-4">
              <Card className="rounded-2xl border-0 p-6 shadow-lg">
                <h2 className="mb-6 text-xl text-foreground">
                  {p.skillsLearning}
                </h2>
                {learningBookings.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">
                    {p.emptyLearning}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {learningBookings.map((b) => {
                      const statusLabel =
                        b.status === "COMPLETED"
                          ? p.learningStatusCompleted
                          : p.learningStatusAccepted;
                      const totalTimeLabel = formatCreditMinutes(
                        b.bookedMinutes,
                        locale,
                      );
                      return (
                        <Card
                          key={b.id}
                          className="rounded-xl border border-border bg-muted/25 p-5"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg text-foreground">
                                {b.skillTitle}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {p.learningInstructor}: {b.ownerName}
                              </p>
                            </div>
                            <Badge variant="secondary">{statusLabel}</Badge>
                          </div>
                          <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 shrink-0" />
                              <span>
                                {p.learningSession}:{" "}
                                {formatSessionTime(
                                  b.scheduledStartAt ?? null,
                                  locale,
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 shrink-0" />
                              <span>
                                {formatTemplate(p.learningTotalTime, {
                                  time: totalTimeLabel,
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() =>
                                  onOpenSkillDetail?.(b.skillId)
                                }
                              >
                                {p.viewDetails}
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                onClick={() => onNavigate?.("messages")}
                              >
                                {p.continueLearning}
                              </Button>
                            </div>
                            {b.status === "COMPLETED" ? (
                              givenByExchangeId.has(b.id) ? (
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                  <span>{p.alreadyRated}</span>
                                  <div
                                    className="flex items-center gap-0.5"
                                    aria-hidden
                                  >
                                    {Array.from(
                                      {
                                        length:
                                          givenByExchangeId.get(b.id)!
                                            .rating,
                                      },
                                      (_, i) => (
                                        <Star
                                          key={i}
                                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                                        />
                                      ),
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="w-full"
                                  type="button"
                                  onClick={() => openReviewModal(b)}
                                >
                                  {p.rateSession}
                                </Button>
                              )
                            ) : null}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              <Card className="rounded-2xl border-0 p-6 shadow-lg">
                <h2 className="mb-6 text-xl text-foreground">
                  {p.studentReviews}
                </h2>

                <div className="space-y-8">
                  <section>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {p.reviewsFromStudents}
                    </h3>
                    {myReviews.length === 0 ? (
                      <p className="py-6 text-center text-muted-foreground">
                        {p.emptyReviews}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {myReviews.map((review) => (
                          <Card
                            key={review.id}
                            className="rounded-xl border border-border bg-muted/25 p-5"
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                                aria-hidden
                              >
                                {initialsFromFullName(review.reviewerName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div>
                                    <h4 className="text-foreground">
                                      {review.reviewerName}
                                    </h4>
                                    {review.skillTitle ? (
                                      <p className="text-xs text-muted-foreground">
                                        {review.skillTitle}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-0.5">
                                    {Array.from(
                                      { length: review.rating },
                                      (_, i) => (
                                        <Star
                                          key={i}
                                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                                        />
                                      ),
                                    )}
                                  </div>
                                </div>
                                {review.comment ? (
                                  <p className="mb-2 text-foreground/90">
                                    {review.comment}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    review.createdAt,
                                  ).toLocaleDateString(
                                    locale === "tr" ? "tr-TR" : "en-US",
                                  )}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {p.reviewsIGave}
                    </h3>
                    {showGivenSummary ? (
                      <p className="mb-4 text-sm text-muted-foreground">
                        {formatTemplate(p.reviewsGivenSummaryLine, {
                          n: String(givenSummary!.totalReviews),
                          rating: givenSummary!.averageRating.toFixed(1),
                        })}
                      </p>
                    ) : null}
                    {myGivenReviews.length === 0 ? (
                      <p className="py-6 text-center text-muted-foreground">
                        {p.emptyReviewsIGave}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {myGivenReviews.map((review) => (
                          <Card
                            key={review.id}
                            className="rounded-xl border border-border bg-muted/25 p-5"
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                                aria-hidden
                              >
                                {initialsFromFullName(
                                  review.reviewedUserName,
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div>
                                    <h4 className="text-foreground">
                                      {review.reviewedUserName}
                                    </h4>
                                    {review.skillTitle ? (
                                      <p className="text-xs text-muted-foreground">
                                        {review.skillTitle}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-0.5">
                                    {Array.from(
                                      { length: review.rating },
                                      (_, i) => (
                                        <Star
                                          key={i}
                                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                                        />
                                      ),
                                    )}
                                  </div>
                                </div>
                                {review.comment ? (
                                  <p className="mb-2 text-foreground/90">
                                    {review.comment}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    review.createdAt,
                                  ).toLocaleDateString(
                                    locale === "tr" ? "tr-TR" : "en-US",
                                  )}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Modal
        open={reviewModalOpen}
        onOpenChange={(open) => {
          setReviewModalOpen(open);
          if (!open) {
            setReviewTarget(null);
            setReviewRating(0);
            setReviewComment("");
            setReviewError(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{p.reviewModalTitle}</ModalTitle>
            {reviewTarget ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {reviewTarget.skillTitle} · {reviewTarget.instructorName}
              </p>
            ) : null}
          </ModalHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{p.reviewSelectStars}</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="rounded p-1 transition-opacity hover:opacity-90"
                    onClick={() => {
                      setReviewRating(n);
                      setReviewError(null);
                    }}
                    aria-label={`${n}`}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        n <= reviewRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-comment" className="mb-2 block">
                {p.reviewCommentLabel}
              </Label>
              <Textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                maxLength={1000}
                className="resize-none"
              />
            </div>
            {reviewError ? (
              <p className="text-sm text-destructive" role="alert">
                {reviewError}
              </p>
            ) : null}
          </div>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              disabled={reviewSaving}
            >
              {p.reviewCancel}
            </Button>
            <Button
              type="button"
              onClick={() => void submitReview()}
              disabled={reviewSaving || reviewRating < 1}
            >
              {p.reviewSubmit}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageLayout>
  );
}
