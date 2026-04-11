import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "../components/ui/modal";
import {
  Star,
  Clock,
  Users,
  Award,
  Video,
  MessageCircle,
} from "lucide-react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { formatTemplate } from "../language";
import { useEffect, useMemo, useState } from "react";
import { fetchSkillById, type SkillDto } from "../api/skills";
import { createExchangeRequest } from "../api/exchange";
import { apiErrorDisplayMessage } from "../api/client";
import { initialsFromFullName } from "../lib/initials";

interface SkillDetailPageProps {
  onNavigate?: (page: PageType) => void;
  skillId: string | null;
}

function descriptionMain(desc: string): string {
  const sep = "\n\n———\n";
  const i = desc.indexOf(sep);
  return (i >= 0 ? desc.slice(0, i) : desc).trim();
}

function descriptionMeta(desc: string): string {
  const sep = "\n\n———\n";
  const i = desc.indexOf(sep);
  return i >= 0 ? desc.slice(i + sep.length).trim() : "";
}

function tomorrowDateStr(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** Yerel tarih + saat → ISO (UTC) string */
function localDateTimeToUtcIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const parts = timeStr.split(":");
  const hh = Number(parts[0] ?? 0);
  const mm = Number(parts[1] ?? 0);
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return local.toISOString();
}

export function SkillDetailPage({ onNavigate, skillId }: SkillDetailPageProps) {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const s = t.skillDetail;
  const b = t.browse;
  const [skill, setSkill] = useState<SkillDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  const [bookMessage, setBookMessage] = useState("");
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookErr, setBookErr] = useState<string | null>(null);
  const [bookDate, setBookDate] = useState(() => tomorrowDateStr());
  const [bookTime, setBookTime] = useState("10:00");

  useEffect(() => {
    if (!skillId) {
      setSkill(null);
      return;
    }
    let c = false;
    setLoading(true);
    fetchSkillById(skillId)
      .then((data) => {
        if (!c) setSkill(data);
      })
      .catch(() => {
        if (!c) setSkill(null);
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, [skillId]);

  useEffect(() => {
    setSessionCount(1);
    setBookMessage("");
    setBookSuccess(false);
    setBookErr(null);
    setBookDate(tomorrowDateStr());
    setBookTime("10:00");
  }, [skillId]);

  const maxSessions = useMemo(() => {
    if (!skill) return 1;
    return Math.max(
      1,
      Math.min(48, Math.floor(14400 / skill.durationMinutes)),
    );
  }, [skill]);

  useEffect(() => {
    setSessionCount((c) => Math.min(c, maxSessions));
  }, [maxSessions]);

  const handleBookClick = () => {
    setBookErr(null);
    if (!token) {
      onNavigate?.("login");
      return;
    }
    setBookOpen(true);
  };

  const handleBookModalChange = (open: boolean) => {
    if (!open && bookSubmitting) return;
    setBookOpen(open);
    if (!open) setBookErr(null);
  };

  const submitBookRequest = async () => {
    if (!token || !skill) return;
    setBookSubmitting(true);
    setBookErr(null);
    const scheduledStartAt = localDateTimeToUtcIso(bookDate, bookTime);
    const minMs = Date.now() + 60 * 60 * 1000;
    if (new Date(scheduledStartAt).getTime() < minMs) {
      setBookErr(s.bookTooSoon);
      setBookSubmitting(false);
      return;
    }
    try {
      const created = await createExchangeRequest(token, skill.id, {
        message: bookMessage.trim() || s.bookDefaultMessage,
        bookedMinutes: sessionCount * skill.durationMinutes,
        scheduledStartAt,
      });
      try {
        sessionStorage.setItem("timelink_open_exchange", created.id);
      } catch {
        /* ignore */
      }
      setBookSuccess(true);
      setBookErr(null);
      setBookOpen(false);
      setBookMessage("");
      onNavigate?.("messages");
    } catch (err) {
      setBookErr(apiErrorDisplayMessage(err, s.bookError));
    } finally {
      setBookSubmitting(false);
    }
  };

  if (!skillId) {
    return (
      <PageLayout onNavigate={onNavigate}>
        <div className="pt-28 pb-20 px-4 text-center">
          <p className="text-muted-foreground mb-6">{s.pickBrowse}</p>
          <Button
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
            onClick={() => onNavigate?.("browse")}
          >
            {s.backToBrowse}
          </Button>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout onNavigate={onNavigate}>
        <div className="pt-28 pb-20 px-4 text-center text-muted-foreground">
          {s.loading}
        </div>
      </PageLayout>
    );
  }

  if (!skill) {
    return (
      <PageLayout onNavigate={onNavigate}>
        <div className="pt-28 pb-20 px-4 text-center">
          <p className="text-muted-foreground mb-6">{s.notFound}</p>
          <Button variant="outline" onClick={() => onNavigate?.("browse")}>
            {s.backToBrowse}
          </Button>
        </div>
      </PageLayout>
    );
  }

  const catKey = skill.category?.trim() || "Programming";
  const categoryLabel =
    b.categoryLabels[catKey as keyof typeof b.categoryLabels] ??
    catKey ??
    s.categoryProgramming;
  const mainDesc = descriptionMain(skill.description);
  const metaBlock = descriptionMeta(skill.description);
  const levelLabel = skill.level
    ? skill.level.charAt(0).toUpperCase() + skill.level.slice(1).toLowerCase()
    : "";

  const isOwnListing =
    Boolean(user?.id) && skill.ownerId === user?.id;

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-2xl border-0 p-8 shadow-lg">
                <Badge className="mb-4">{categoryLabel}</Badge>
                <h1 className="mb-4 text-3xl text-foreground">{skill.title}</h1>

                <div className="mb-6 flex flex-wrap items-center gap-6 text-foreground">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-muted-foreground text-sm">
                      {s.noReviews}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>
                      {formatTemplate(s.studentsCount, { n: "0" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>
                      {formatTemplate(s.perSession, {
                        n: String(skill.durationMinutes),
                      })}
                    </span>
                  </div>
                  {levelLabel ? (
                    <Badge variant="secondary">{levelLabel}</Badge>
                  ) : null}
                </div>

                <Tabs defaultValue="about" className="mt-6">
                  <TabsList className="border border-border bg-muted">
                    <TabsTrigger value="about">{s.tabAbout}</TabsTrigger>
                    <TabsTrigger value="curriculum">{s.tabCurriculum}</TabsTrigger>
                    <TabsTrigger value="reviews">{s.tabReviews}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="mt-6 space-y-4">
                    <div>
                      <h3 className="mb-2 text-lg text-foreground">
                        {s.whatYouLearn}
                      </h3>
                      {s.learnItems.length > 0 ? (
                        <ul className="space-y-2 text-muted-foreground">
                          {s.learnItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-500">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">{s.learnEmpty}</p>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-2 text-lg text-foreground">
                        {s.descriptionTitle}
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {mainDesc || s.learnEmpty}
                      </p>
                    </div>

                    {metaBlock ? (
                      <div>
                        <h3 className="mb-2 text-lg text-foreground">
                          {s.prerequisitesTitle}
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-line text-sm">
                          {metaBlock}
                        </p>
                      </div>
                    ) : s.prerequisitesBody ? (
                      <div>
                        <h3 className="mb-2 text-lg text-foreground">
                          {s.prerequisitesTitle}
                        </h3>
                        <p className="text-muted-foreground">
                          {s.prerequisitesBody}
                        </p>
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="curriculum" className="mt-6 space-y-3">
                    {s.curriculum.length > 0 ? (
                      s.curriculum.map((week, i) => (
                        <Card
                          key={i}
                          className="rounded-xl border border-border bg-muted/30 p-4"
                        >
                          <h4 className="mb-1 text-foreground">{week.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {week.desc}
                          </p>
                        </Card>
                      ))
                    ) : (
                      <p className="text-muted-foreground">{s.curriculumEmpty}</p>
                    )}
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-6">
                    <p className="text-muted-foreground">{s.noReviews}</p>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24 rounded-2xl border-0 p-6 shadow-lg">
                <div className="mb-6 flex items-center gap-4 border-b border-border pb-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
                    {initialsFromFullName(skill.ownerName)}
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      {s.instructor}
                    </p>
                    <h3 className="text-foreground">{skill.ownerName}</h3>
                    <div className="mt-1 flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-muted-foreground">
                        {s.noReviews}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl text-transparent">
                    {formatTemplate(s.perSession, {
                      n: String(skill.durationMinutes),
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.perSessionLabel}
                  </p>
                </div>

                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground/90">{s.detailOnline}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground/90">{s.detailSchedule}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground/90">{s.detailCert}</span>
                  </div>
                </div>

                {!isOwnListing ? (
                  <div className="space-y-3">
                    {bookSuccess ? (
                      <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200">
                        {s.bookSuccess}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 py-6 text-white"
                      onClick={handleBookClick}
                    >
                      {token ? s.bookSession : s.bookLogin}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => onNavigate?.("messages")}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {s.messageInstructor}
                    </Button>
                  </div>
                ) : null}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {skill && !isOwnListing ? (
        <Modal open={bookOpen} onOpenChange={handleBookModalChange}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{s.bookModalTitle}</ModalTitle>
            </ModalHeader>
            {bookErr ? (
              <div
                className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {bookErr}
              </div>
            ) : null}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {formatTemplate(s.bookSessionHint, {
                  minutes: String(skill.durationMinutes),
                  total: String(sessionCount * skill.durationMinutes),
                })}
              </p>
              <p className="text-sm text-muted-foreground">{s.bookScheduleHint}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="book-date">{s.bookDateLabel}</Label>
                  <Input
                    id="book-date"
                    type="date"
                    className="mt-2"
                    value={bookDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setBookDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="book-time">{s.bookTimeLabel}</Label>
                  <Input
                    id="book-time"
                    type="time"
                    className="mt-2"
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="book-sessions">{s.bookSessionCount}</Label>
                <Select
                  value={String(sessionCount)}
                  onValueChange={(v) => setSessionCount(parseInt(v, 10))}
                >
                  <SelectTrigger id="book-sessions" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxSessions }, (_, i) => i + 1).map(
                      (n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="book-msg">{s.bookMessage}</Label>
                <Textarea
                  id="book-msg"
                  value={bookMessage}
                  onChange={(e) => setBookMessage(e.target.value)}
                  placeholder={s.bookMessagePh}
                  className="mt-2 min-h-24"
                  maxLength={1000}
                />
              </div>
            </div>
            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleBookModalChange(false)}
                disabled={bookSubmitting}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                onClick={() => void submitBookRequest()}
                disabled={bookSubmitting}
              >
                {bookSubmitting ? t.common.loading : s.bookSubmit}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      ) : null}
    </PageLayout>
  );
}
