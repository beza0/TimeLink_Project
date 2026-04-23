import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useCallback, useEffect, useState } from "react";
import type { PageType } from "../App";
import {
  fetchPublicUserProfile,
  PUBLIC_PROFILE_USER_ID_KEY,
  type PublicUserProfileDto,
} from "../api/user";
import { apiErrorDisplayMessage } from "../api/client";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { Star, MapPin, ArrowLeft, Calendar, Link2, Globe } from "lucide-react";
import { initialsFromFullName } from "../lib/initials";

type Props = { onNavigate?: (page: PageType) => void };

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

export function PublicUserProfilePage({ onNavigate }: Props) {
  const { t, locale } = useLanguage();
  const p = t.publicUserProfile;
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<PublicUserProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(PUBLIC_PROFILE_USER_ID_KEY);
    } catch {
      /* ignore */
    }
    if (!id) {
      setError(p.notFound);
      setProfile(null);
      setLoading(false);
      return;
    }
    if (user?.id && id.toLowerCase() === user.id.toLowerCase()) {
      onNavigate?.("profile");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicUserProfile(token, id);
      setProfile(data);
    } catch (e) {
      setError(apiErrorDisplayMessage(e, p.loadError));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, onNavigate, p.loadError, p.notFound]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          className="mb-4"
          onClick={() => onNavigate?.("messages")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {p.backToMessages}
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        ) : null}
        {error && !loading ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {profile && !loading ? (
          <Card className="p-6">
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="shrink-0">
                {profile.avatarUrl ? (
                  <ImageWithFallback
                    src={profile.avatarUrl}
                    alt=""
                    className="h-28 w-28 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                    {initialsFromFullName(profile.fullName)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-foreground">
                  {profile.fullName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {profile.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {profile.location}
                    </span>
                  ) : null}
                  {profile.memberSince ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" aria-hidden />
                      {p.memberSince}:{" "}
                      {new Date(profile.memberSince).toLocaleDateString(
                        locale === "tr" ? "tr-TR" : "en-US",
                        { year: "numeric", month: "long" },
                      )}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
                  <Star
                    className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500"
                    aria-hidden
                  />
                  <span>
                    {profile.averageRating.toFixed(1)} · {p.averageLabel} ·{" "}
                    {profile.totalReviews} {t.common.reviews}
                  </span>
                </div>
                <p className="mt-4 text-sm text-foreground whitespace-pre-wrap">
                  {profile.bio?.trim() ? profile.bio : p.noBio}
                </p>
                {profile.languages?.trim() ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {profile.languages}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {profile.website?.trim() ? (
                    <a
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      href={normalizeUrl(profile.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4" />
                      {profile.website}
                    </a>
                  ) : null}
                  {profile.linkedin?.trim() ? (
                    <a
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      href={normalizeUrl(profile.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Link2 className="h-4 w-4" />
                      LinkedIn
                    </a>
                  ) : null}
                  {profile.twitter?.trim() ? (
                    <a
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      href={normalizeUrl(profile.twitter)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Link2 className="h-4 w-4" />
                      X / Twitter
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </PageLayout>
  );
}
