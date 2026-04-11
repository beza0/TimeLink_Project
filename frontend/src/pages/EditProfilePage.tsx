import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { Camera, Trash2 } from "lucide-react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMyProfile, updateMyProfile } from "../api/user";
import { ApiError } from "../api/client";
import { initialsFromFullName } from "../lib/initials";
import { fileToResizedJpegDataUrl } from "../lib/resizeImageToDataUrl";

const ONBOARDING_KEY = "timelink_profile_onboarding";

interface EditProfilePageProps {
  onNavigate?: (page: PageType) => void;
}

/** Profil fotoğrafı ham dosya üst sınırı (yaygın standart: 2 MiB) */
const MAX_AVATAR_FILE_BYTES = 2 * 1024 * 1024;

export function EditProfilePage({ onNavigate }: EditProfilePageProps) {
  const { t } = useLanguage();
  const e = t.editProfile;
  const { token, patchUser, user, logout } = useAuth();

  const [fullName, setFullName] = useState(() => user?.name ?? "");
  const [email, setEmail] = useState(() => user?.email ?? "");

  const [onboarding, setOnboarding] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(ONBOARDING_KEY) === "1",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [languages, setLanguages] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = await fetchMyProfile(token);
      setFullName(p.fullName?.trim() || user?.name || "");
      setEmail(p.email?.trim() || user?.email || "");
      setBio(p.bio ?? "");
      setLocation(p.location ?? "");
      setPhone(p.phone ?? "");
      setLanguages(p.languages ?? "");
      setWebsite(p.website ?? "");
      setLinkedin(p.linkedin ?? "");
      setTwitter(p.twitter ?? "");
      setAvatarUrl(p.avatarUrl ?? null);
      setAvatarError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        logout();
        onNavigate?.("login");
        return;
      }
      setFullName((n) => n.trim() || user?.name || "");
      setEmail((em) => em.trim() || user?.email || "");
    } finally {
      setLoading(false);
    }
  }, [token, user?.name, user?.email, logout, onNavigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const finishOnboarding = () => {
    sessionStorage.removeItem(ONBOARDING_KEY);
    setOnboarding(false);
  };

  const handleSkip = () => {
    finishOnboarding();
    onNavigate?.("dashboard");
  };

  const handlePickPhoto = () => {
    setAvatarError(null);
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      if (file) setAvatarError(e.photoInvalidType);
      return;
    }
    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setAvatarError(e.photoTooLarge);
      return;
    }
    try {
      const dataUrl = await fileToResizedJpegDataUrl(file, 512, 0.88);
      setAvatarUrl(dataUrl);
      setAvatarError(null);
    } catch {
      setAvatarError(e.photoInvalidType);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    setAvatarError(null);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const saved = await updateMyProfile(token, {
        fullName: fullName.trim(),
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        location: location.trim() || null,
        languages: languages.trim() || null,
        website: website.trim() || null,
        linkedin: linkedin.trim() || null,
        twitter: twitter.trim() || null,
        avatarUrl: avatarUrl,
      });
      patchUser({
        id: saved.id,
        name: saved.fullName,
        email: saved.email,
        avatarUrl: saved.avatarUrl ?? null,
      });
      if (onboarding) {
        finishOnboarding();
      }
      queueMicrotask(() => onNavigate?.("profile"));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        logout();
        onNavigate?.("login");
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl text-foreground">{e.title}</h1>
            <p className="text-muted-foreground">
              {onboarding ? e.onboardingSubtitle : e.subtitle}
            </p>
          </div>

          {onboarding ? (
            <div
              className="mb-6 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"
              role="status"
            >
              {e.onboardingHint}
            </div>
          ) : null}

          <Card className="rounded-2xl border-0 p-8 shadow-lg">
            {loading ? (
              <p className="text-muted-foreground">{t.common.loading}</p>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="flex flex-col items-center mb-6">
                  {/* Görünmez: yalnızca kamera butonu .click() ile tetiklenir (native "Dosya Seç" satırı çıkmaz) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    tabIndex={-1}
                    onChange={handlePhotoSelected}
                  />
                  <div className="relative h-32 w-32 shrink-0">
                    {avatarUrl ? (
                      <ImageWithFallback
                        src={avatarUrl}
                        alt=""
                        className="h-32 w-32 rounded-full object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div
                        className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-semibold text-white ring-2 ring-border"
                        aria-hidden
                      >
                        {initialsFromFullName(fullName)}
                      </div>
                    )}
                    <button
                      type="button"
                      className="absolute bottom-0 left-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transition-opacity hover:opacity-90"
                      aria-label={e.photoChangeAria}
                      onClick={handlePickPhoto}
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    {avatarUrl ? (
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-destructive shadow-md transition-opacity hover:opacity-90"
                        aria-label={e.photoRemove}
                        onClick={handleRemovePhoto}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    ) : null}
                  </div>
                  {avatarError ? (
                    <p className="mt-2 text-sm text-destructive" role="alert">
                      {avatarError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="name">{e.fullName}</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(ev) => setFullName(ev.target.value)}
                    className="mt-2"
                    required
                    autoComplete="name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">{e.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email || user?.email || ""}
                    readOnly
                    className="mt-2 bg-muted/50"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">{e.bio}</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(ev) => setBio(ev.target.value)}
                    className="mt-2 min-h-24"
                    placeholder={e.bioPh}
                  />
                </div>

                <div>
                  <Label htmlFor="location">{e.location}</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(ev) => setLocation(ev.target.value)}
                    placeholder={e.locationPh}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{e.phone}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(ev) => setPhone(ev.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="languages">{e.languages}</Label>
                  <Input
                    id="languages"
                    value={languages}
                    onChange={(ev) => setLanguages(ev.target.value)}
                    placeholder={e.languagesPh}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="website">{e.website}</Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(ev) => setWebsite(ev.target.value)}
                    placeholder={e.websitePh}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedin">{e.linkedin}</Label>
                    <Input
                      id="linkedin"
                      value={linkedin}
                      onChange={(ev) => setLinkedin(ev.target.value)}
                      placeholder={e.linkedinPh}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter">{e.twitter}</Label>
                    <Input
                      id="twitter"
                      value={twitter}
                      onChange={(ev) => setTwitter(ev.target.value)}
                      placeholder={e.twitterPh}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:gap-4">
                  {onboarding ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleSkip}
                      disabled={saving}
                    >
                      {e.skipLater}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onNavigate?.("profile")}
                      disabled={saving}
                    >
                      {t.common.cancel}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    disabled={saving}
                  >
                    {saving ? t.common.loading : t.common.saveChanges}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
