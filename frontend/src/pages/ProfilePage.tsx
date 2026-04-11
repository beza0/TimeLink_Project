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
import { useCallback, useEffect, useState } from "react";
import { fetchMyProfile, type UserProfileDto } from "../api/user";
import { fetchMySkills, type SkillDto } from "../api/skills";
import {
  fetchMyReceivedReviews,
  fetchMyRatingSummary,
  type ReviewDto,
  type UserRatingSummaryDto,
} from "../api/reviews";
import { initialsFromFullName } from "../lib/initials";

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
  return (idx >= 0 ? description.slice(0, idx) : description).trim();
}

export function ProfilePage({
  onNavigate,
  onOpenSkillDetail,
}: ProfilePageProps) {
  const { t, locale } = useLanguage();
  const p = t.profile;
  const catLabels = t.browse.categoryLabels;
  const { user, token } = useAuth();

  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [mySkills, setMySkills] = useState<SkillDto[]>([]);
  const [myReviews, setMyReviews] = useState<ReviewDto[]>([]);
  const [ratingSummary, setRatingSummary] =
    useState<UserRatingSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const settled = await Promise.allSettled([
      fetchMyProfile(token),
      fetchMySkills(token),
      fetchMyReceivedReviews(token),
      fetchMyRatingSummary(token),
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
      setMyReviews(settled[2].value);
    } else {
      setMyReviews([]);
    }
    if (settled[3].status === "fulfilled") {
      setRatingSummary(settled[3].value);
    } else {
      setRatingSummary(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

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
          <Tabs defaultValue="teaching" className="space-y-6">
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
              <TabsTrigger value="achievements" className="rounded-lg">
                {p.tabAchievements}
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

                      return (
                        <Card
                          key={skill.id}
                          className="rounded-xl border border-border bg-muted/25 p-5"
                        >
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
                                <Badge variant="outline">
                                  {formatTemplate(p.sessionDuration, {
                                    n: String(skill.durationMinutes),
                                  })}
                                </Badge>
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
                                {formatTemplate(p.studentsLabel, { n: "0" })}
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
                <p className="py-10 text-center text-muted-foreground">
                  {p.emptyLearning}
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              <Card className="rounded-2xl border-0 p-6 shadow-lg">
                <h2 className="mb-6 text-xl text-foreground">
                  {p.studentReviews}
                </h2>
                {myReviews.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">
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
                            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0"
                            aria-hidden
                          >
                            {initialsFromFullName(review.reviewerName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div>
                                <h4 className="text-foreground">
                                  {review.reviewerName}
                                </h4>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {Array.from({ length: review.rating }, (_, i) => (
                                  <Star
                                    key={i}
                                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="mb-2 text-foreground/90">
                              {review.comment}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString(
                                locale === "tr" ? "tr-TR" : "en-US",
                              )}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <Card className="rounded-2xl border-0 p-6 shadow-lg">
                <h2 className="mb-6 text-xl text-foreground">
                  {p.myAchievements}
                </h2>
                <p className="py-10 text-center text-muted-foreground">
                  {p.emptyAchievements}
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageLayout>
  );
}
