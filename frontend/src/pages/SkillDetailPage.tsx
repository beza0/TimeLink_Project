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
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { cn } from "../components/ui/utils";
import { enUS, tr as trLocale } from "react-day-picker/locale";
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
  CalendarIcon,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import type { PageType } from "../App";
import { useParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { formatTemplate } from "../language";
import { useEffect, useMemo, useState } from "react";
import { fetchSkillById, type SkillDto } from "../api/skills";
import { fetchMyProfile } from "../api/user";
import {
  createExchangeRequest,
  fetchReceivedExchangeRequests,
  type ExchangeRequestDto,
} from "../api/exchange";
import { apiErrorDisplayMessage } from "../api/client";
import { initialsFromFullName } from "../lib/initials";

interface SkillDetailPageProps {
  onNavigate?: (page: PageType) => void;
  /** Book için oturum yokken girişe git; giriş sonrası bu sayfaya dönmek için App kullanır */
  onLoginRequired?: () => void;
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

function isWithinAvailability(skill: SkillDto, dateStr: string, timeStr: string): boolean {
  const days = skill.availableDays ?? [];
  const from = skill.availableFrom;
  const until = skill.availableUntil;
  if (!days.length || !from || !until) return true;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayKeys = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const weekday = dayKeys[new Date(y, m - 1, d).getDay()];
  if (!days.includes(weekday)) return false;
  return timeStr >= from && timeStr < until;
}

function parseMetaField(meta: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escaped}\\s*:\\s*([^\\n]+)`, "i");
    const m = meta.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function pad2(v: number): string {
  return String(v).padStart(2, "0");
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

function dateToYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Yerel öğlen — timezone kayması olmadan takvim seçimi */
function ymdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function buildHalfHourSlots(from: string, until: string): string[] {
  const out: string[] = [];
  let cur = toMinutes(from);
  const end = toMinutes(until);
  while (cur < end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    out.push(`${pad2(h)}:${pad2(m)}`);
    cur += 30;
  }
  return out;
}

const BOOKING_HORIZON_DAYS = 365;

export function SkillDetailPage({
  onNavigate,
  onLoginRequired,
}: SkillDetailPageProps) {
  const { skillId: paramSkillId } = useParams<{ skillId: string }>();
  const skillId: string | null = paramSkillId?.trim() ? paramSkillId : null;
  const { t, locale } = useLanguage();
  const { user, token } = useAuth();
  const s = t.skillDetail;
  const b = t.browse;
  const p = t.profile;
  const [skill, setSkill] = useState<SkillDto | null>(null);
  const [receivedTeachingForSkill, setReceivedTeachingForSkill] = useState<
    ExchangeRequestDto[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookMessage, setBookMessage] = useState("");
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookErr, setBookErr] = useState<string | null>(null);
  const [bookDate, setBookDate] = useState(() => tomorrowDateStr());
  const [bookTime, setBookTime] = useState("10:00");
  const [bookDurationMinutes, setBookDurationMinutes] = useState("60");
  const [myTimeCreditMinutes, setMyTimeCreditMinutes] = useState<number>(0);
  const [bookDatePopoverOpen, setBookDatePopoverOpen] = useState(false);
  const [bookCalendarMonth, setBookCalendarMonth] = useState<Date>(() =>
    ymdToLocalDate(tomorrowDateStr()),
  );

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
    if (!token || !skill || !user?.id || skill.ownerId !== user.id) {
      setReceivedTeachingForSkill([]);
      return;
    }
    let cancelled = false;
    fetchReceivedExchangeRequests(token)
      .then((list) => {
        if (cancelled) return;
        setReceivedTeachingForSkill(
          list.filter(
            (req) =>
              req.skillId === skill.id &&
              (req.status === "ACCEPTED" || req.status === "COMPLETED"),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setReceivedTeachingForSkill([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, skill?.id, skill?.ownerId, user?.id]);

  useEffect(() => {
    setBookMessage("");
    setBookSuccess(false);
    setBookErr(null);
    setBookDate(tomorrowDateStr());
    setBookTime("10:00");
    setBookDurationMinutes("60");
    setMyTimeCreditMinutes(0);
    setBookCalendarMonth(ymdToLocalDate(tomorrowDateStr()));
  }, [skillId]);

  useEffect(() => {
    if (!token) {
      setMyTimeCreditMinutes(0);
      return;
    }
    let cancelled = false;
    fetchMyProfile(token)
      .then((profile) => {
        if (!cancelled) {
          setMyTimeCreditMinutes(profile.timeCreditMinutes);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMyTimeCreditMinutes(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const hasAvailabilityConstraints = useMemo(
    () =>
      Boolean(skill?.availableDays?.length) &&
      Boolean(skill?.availableFrom) &&
      Boolean(skill?.availableUntil),
    [skill],
  );

  const allowedDays = useMemo(
    () => new Set(skill?.availableDays ?? []),
    [skill?.availableDays],
  );

  const dateOptions = useMemo(() => {
    if (
      !skill ||
      !hasAvailabilityConstraints ||
      !skill.availableFrom ||
      !skill.availableUntil
    ) {
      return [];
    }
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const minMs = now.getTime() + 60 * 60 * 1000;
    const dayKeys = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    const baseSlots = buildHalfHourSlots(skill.availableFrom, skill.availableUntil);
    for (let i = 0; i < BOOKING_HORIZON_DAYS; i++) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      const dayCode = dayKeys[d.getDay()];
      if (!allowedDays.has(dayCode)) continue;
      const ymd = dateToYmd(d);
      const validSlotExists = baseSlots.some((slot) => {
        const candidate = new Date(`${ymd}T${slot}:00`);
        return candidate.getTime() >= minMs;
      });
      if (!validSlotExists) continue;
      options.push({
        value: ymd,
        label: d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      });
    }
    return options;
  }, [
    skill,
    hasAvailabilityConstraints,
    allowedDays,
    locale,
  ]);

  const bookableYmdSet = useMemo(
    () => new Set(dateOptions.map((o) => o.value)),
    [dateOptions],
  );

  const bookDateDisplayLabel = useMemo(() => {
    const opt = dateOptions.find((o) => o.value === bookDate);
    if (opt) return opt.label;
    return ymdToLocalDate(bookDate).toLocaleDateString(
      locale === "tr" ? "tr-TR" : "en-US",
      {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  }, [dateOptions, bookDate, locale]);

  const calendarMonthBounds = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + BOOKING_HORIZON_DAYS);
    return {
      startMonth: new Date(start.getFullYear(), start.getMonth(), 1),
      endMonth: new Date(end.getFullYear(), end.getMonth(), 1),
    };
  }, []);

  const timeOptions = useMemo(() => {
    if (
      !skill ||
      !hasAvailabilityConstraints ||
      !skill.availableFrom ||
      !skill.availableUntil ||
      !bookDate
    ) {
      return [];
    }
    const minMs = Date.now() + 60 * 60 * 1000;
    return buildHalfHourSlots(skill.availableFrom, skill.availableUntil).filter((slot) => {
      const candidate = new Date(`${bookDate}T${slot}:00`);
      return candidate.getTime() >= minMs;
    });
  }, [
    skill,
    hasAvailabilityConstraints,
    bookDate,
  ]);

  const durationOptions = useMemo(() => {
    const byCredit = Math.floor(myTimeCreditMinutes / 30) * 30;
    if (byCredit < 30) return [];

    let maxAllowed = byCredit;
    if (hasAvailabilityConstraints && skill?.availableUntil) {
      const remainingInWindow = toMinutes(skill.availableUntil) - toMinutes(bookTime);
      maxAllowed = Math.min(maxAllowed, Math.floor(remainingInWindow / 30) * 30);
    }

    if (maxAllowed < 30) return [];
    const out: string[] = [];
    for (let m = 30; m <= maxAllowed; m += 30) {
      out.push(String(m));
    }
    return out;
  }, [
    myTimeCreditMinutes,
    hasAvailabilityConstraints,
    skill?.availableUntil,
    bookTime,
  ]);

  useEffect(() => {
    if (!hasAvailabilityConstraints) return;
    if (dateOptions.length === 0) return;
    if (!dateOptions.some((d) => d.value === bookDate)) {
      setBookDate(dateOptions[0].value);
    }
  }, [hasAvailabilityConstraints, dateOptions, bookDate]);

  useEffect(() => {
    if (!hasAvailabilityConstraints) return;
    if (timeOptions.length === 0) return;
    if (!timeOptions.includes(bookTime)) {
      setBookTime(timeOptions[0]);
    }
  }, [hasAvailabilityConstraints, timeOptions, bookTime]);

  useEffect(() => {
    if (durationOptions.length === 0) return;
    if (!durationOptions.includes(bookDurationMinutes)) {
      const preferred = durationOptions.includes("60") ? "60" : durationOptions[0];
      setBookDurationMinutes(preferred);
    }
  }, [durationOptions, bookDurationMinutes]);

  const learnersCountForOwner = useMemo(
    () => new Set(receivedTeachingForSkill.map((b) => b.requesterId)).size,
    [receivedTeachingForSkill],
  );

  const handleBookClick = () => {
    setBookErr(null);
    if (!token) {
      if (onLoginRequired) {
        onLoginRequired();
      } else {
        onNavigate?.("login");
      }
      return;
    }
    setBookOpen(true);
  };

  const handleBookModalChange = (open: boolean) => {
    if (!open && bookSubmitting) return;
    setBookOpen(open);
    if (!open) {
      setBookErr(null);
      setBookDatePopoverOpen(false);
    }
  };

  const handleBookDatePopoverOpenChange = (open: boolean) => {
    setBookDatePopoverOpen(open);
    if (open) {
      setBookCalendarMonth(ymdToLocalDate(bookDate));
    }
  };

  const submitBookRequest = async () => {
    if (!token || !skill) return;
    if (hasAvailabilityConstraints) {
      if (!bookDate || !bookTime || !timeOptions.includes(bookTime)) {
        setBookErr(s.bookOutsideAvailability);
        return;
      }
      if (dateOptions.length === 0) {
        setBookErr(s.bookNoSlots);
        return;
      }
    }
    if (durationOptions.length === 0 || !durationOptions.includes(bookDurationMinutes)) {
      setBookErr(s.bookNotEnoughCredits);
      return;
    }
    setBookSubmitting(true);
    setBookErr(null);
    const scheduledStartAt = localDateTimeToUtcIso(bookDate, bookTime);
    const bookedMinutes = Number(bookDurationMinutes);
    const minMs = Date.now() + 60 * 60 * 1000;
    if (new Date(scheduledStartAt).getTime() < minMs) {
      setBookErr(s.bookTooSoon);
      setBookSubmitting(false);
      return;
    }
    if (!isWithinAvailability(skill, bookDate, bookTime)) {
      setBookErr(s.bookOutsideAvailability);
      setBookSubmitting(false);
      return;
    }
    try {
      const created = await createExchangeRequest(token, skill.id, {
        message: bookMessage.trim() || s.bookDefaultMessage,
        bookedMinutes,
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
  const dayLabels = t.addSkill.days;
  const dayIndex: Record<string, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6,
  };
  const metaSessionType =
    (skill.sessionTypes?.length
      ? skill.sessionTypes
          .map((v) => (v === "in-person" ? t.addSkill.inPerson : t.addSkill.online))
          .join(", ")
      : null) ??
    parseMetaField(metaBlock, ["Session Type *", "Oturum türü *"]);
  const metaLocation =
    skill.inPersonLocation ??
    parseMetaField(metaBlock, ["Location", "Konum"]);
  const metaDays =
    (skill.availableDays?.length
      ? skill.availableDays
          .map((d) => dayLabels[dayIndex[d]] ?? d)
          .join(", ")
      : null) ??
    parseMetaField(metaBlock, ["Available Days *", "Müsait günler *"]);
  const metaTime =
    skill.availableFrom && skill.availableUntil
      ? `${skill.availableFrom} - ${skill.availableUntil}`
      : parseMetaField(
          metaBlock,
          ["Available From *– Available Until *", "Başlangıç *–Bitiş *"],
        );
  const levelLabel = skill.level
    ? skill.level.charAt(0).toUpperCase() + skill.level.slice(1).toLowerCase()
    : "";

  const isOwnListing =
    Boolean(user?.id) && skill.ownerId === user?.id;

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 mb-6 h-auto gap-2 px-2 py-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => onNavigate?.("browse")}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {s.backToBrowse}
          </Button>
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
                      {formatTemplate(s.studentsCount, {
                        n: isOwnListing
                          ? String(learnersCountForOwner)
                          : "0",
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
                    {isOwnListing && receivedTeachingForSkill.length > 0 ? (
                      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {p.activeLearners}
                        </p>
                        <div className="space-y-2">
                          {receivedTeachingForSkill.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="truncate text-foreground">
                                {b.requesterName}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatSessionTime(
                                  b.scheduledStartAt ?? null,
                                  locale,
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

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

                    {metaBlock || metaSessionType || metaLocation || metaDays || metaTime ? (
                      <div>
                        <h3 className="mb-2 text-lg text-foreground">
                          {s.prerequisitesTitle}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {metaSessionType ? (
                            <p>
                              <span className="font-medium text-foreground/80">
                                {t.addSkill.sessionType}:
                              </span>{" "}
                              {metaSessionType}
                            </p>
                          ) : null}
                          {metaDays ? (
                            <p>
                              <span className="font-medium text-foreground/80">
                                {t.addSkill.availableDays}:
                              </span>{" "}
                              {metaDays}
                            </p>
                          ) : null}
                          {metaTime ? (
                            <p>
                              <span className="font-medium text-foreground/80">
                                {locale === "tr" ? "Saat aralığı" : "Time range"}:
                              </span>{" "}
                              {metaTime}
                            </p>
                          ) : null}
                          {metaLocation ? (
                            <p>
                              <span className="font-medium text-foreground/80">
                                {t.addSkill.location}:
                              </span>{" "}
                              {metaLocation}
                            </p>
                          ) : null}
                        </div>
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
            <div className="space-y-4">
              {hasAvailabilityConstraints ? (
                <div className="flex flex-wrap gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                  {metaSessionType ? <Badge variant="secondary">{metaSessionType}</Badge> : null}
                  {metaDays ? <Badge variant="secondary">{metaDays}</Badge> : null}
                  {metaTime ? <Badge variant="secondary">{metaTime}</Badge> : null}
                  {metaLocation ? <Badge variant="secondary">{metaLocation}</Badge> : null}
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">{s.bookScheduleHint}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="min-w-0">
                  <Label htmlFor="book-date-trigger">{s.bookDateLabel}</Label>
                  {hasAvailabilityConstraints ? (
                    <Popover
                      open={bookDatePopoverOpen}
                      onOpenChange={handleBookDatePopoverOpenChange}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="book-date-trigger"
                          type="button"
                          variant="outline"
                          aria-expanded={bookDatePopoverOpen}
                          className={cn(
                            "mt-2 flex h-10 w-full min-w-0 items-center justify-between px-3 font-normal",
                          )}
                        >
                          <span className="truncate text-left">
                            {bookDateDisplayLabel}
                          </span>
                          <CalendarIcon className="ml-2 size-4 shrink-0 opacity-70" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={6}
                        collisionPadding={16}
                        className="w-80 min-w-[18rem] max-h-[min(26rem,calc(100dvh-6rem))] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain border-border p-2 shadow-lg"
                      >
                        <Calendar
                          mode="single"
                          locale={locale === "tr" ? trLocale : enUS}
                          weekStartsOn={locale === "tr" ? 1 : 0}
                          month={bookCalendarMonth}
                          onMonthChange={setBookCalendarMonth}
                          selected={ymdToLocalDate(bookDate)}
                          onSelect={(d) => {
                            if (d) {
                              setBookDate(dateToYmd(d));
                              setBookCalendarMonth(d);
                              setBookDatePopoverOpen(false);
                            }
                          }}
                          disabled={(date) => !bookableYmdSet.has(dateToYmd(date))}
                          defaultMonth={ymdToLocalDate(bookDate)}
                          startMonth={calendarMonthBounds.startMonth}
                          endMonth={calendarMonthBounds.endMonth}
                          className="p-0"
                          classNames={{
                            root: "border-0 bg-transparent shadow-none",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Input
                      id="book-date"
                      type="date"
                      className="mt-2"
                      value={bookDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setBookDate(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="book-time">{s.bookTimeLabel}</Label>
                  {hasAvailabilityConstraints ? (
                    <Select value={bookTime} onValueChange={setBookTime}>
                      <SelectTrigger id="book-time" className="mt-2">
                        <SelectValue placeholder={s.bookTimeLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="book-time"
                      type="time"
                      className="mt-2"
                      value={bookTime}
                      onChange={(e) => setBookTime(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="book-duration">{s.bookDurationLabel}</Label>
                  <Select value={bookDurationMinutes} onValueChange={setBookDurationMinutes}>
                    <SelectTrigger id="book-duration" className="mt-2">
                      <SelectValue placeholder={s.bookDurationLabel} />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {`${opt} dk`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatTemplate(s.bookDurationHint, {
                  credits: String(Math.floor(myTimeCreditMinutes / 30) * 30),
                })}
              </p>
              {hasAvailabilityConstraints && dateOptions.length === 0 ? (
                <p className="text-sm text-destructive">{s.bookNoSlots}</p>
              ) : null}
              {durationOptions.length === 0 ? (
                <p className="text-sm text-destructive">{s.bookNotEnoughCredits}</p>
              ) : null}
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
            {bookErr ? (
              <div
                className="mt-3 flex items-start gap-2 rounded-lg border border-red-600 bg-red-200 px-3 py-2 text-sm text-red-900 shadow-lg shadow-red-500/50 dark:border-red-500 dark:bg-red-950/45 dark:text-red-200"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{bookErr}</span>
              </div>
            ) : null}
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
                disabled={
                  bookSubmitting ||
                  (hasAvailabilityConstraints && dateOptions.length === 0) ||
                  durationOptions.length === 0
                }
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
