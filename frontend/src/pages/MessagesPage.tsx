import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../components/ui/utils";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../components/ui/modal";
import {
  ArrowLeft,
  Search,
  Send,
  Check,
  X,
  MessageCircle,
  CalendarPlus,
  CalendarIcon,
  AlertTriangle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync, createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { formatTemplate } from "../language";
import { enUS, tr as trLocale } from "react-day-picker/locale";
import {
  acknowledgeOwnerAttendance,
  acknowledgeRequesterAttendance,
  acceptExchangeRequest,
  cancelExchangeRequest,
  createCounterOffer,
  createRequesterCounterOffer,
  fetchExchangeMessages,
  fetchReceivedExchangeRequests,
  fetchSentExchangeRequests,
  postExchangeMessage,
  rejectExchangeRequest,
  createExchangeRequest,
  type ExchangeMessageDto,
  type ExchangeRequestDto,
} from "../api/exchange";
import { apiErrorDisplayMessage } from "../api/client";
import {
  blockUser,
  fetchMyBlockState,
  fetchMyProfile,
  fetchPublicUserProfile,
  type PublicUserProfileDto,
  unblockUser,
} from "../api/user";
import {
  fetchNotifications,
  isNotificationUnread,
  markNotificationRead,
} from "../api/notifications";
import { useBookingAvailabilityFromSkill } from "../hooks/useBookingAvailabilityFromSkill";
import {
  BOOKING_HORIZON_DAYS,
  buildSkillTimeOptionsForDate,
  dateToYmd,
  hasSkillAvailabilityConstraints,
  isWithinSkillAvailability,
} from "../lib/bookingAvailability";
import { initialsFromFullName } from "../lib/initials";

interface MessagesPageProps {
  onNavigate?: (page: PageType) => void;
  /** Sohbet başlığındaki isim/avatar: karşıdaki üyenin herkese açık profil sayfası */
  onViewUserProfile?: (userId: string) => void;
}

const OPEN_EXCHANGE_KEY = "timelink_open_exchange";
const OPEN_USER_KEY = "timelink_open_user";

function tomorrowDateStr(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10);
}

function localDateTimeToUtcIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).toISOString();
}

function ymdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatScheduledAt(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type UiStatus =
  | "pending-incoming"
  | "pending-outgoing"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

type ConversationRow = {
  otherUserId: string;
  otherName: string;
  /** Aynı kişiyle tüm oturum/talepler, en yeni en üstte */
  exchanges: ExchangeRequestDto[];
  listUiStatus: UiStatus;
  lastPreview: string;
  sortTime: number;
};

function getOtherUserId(
  ex: ExchangeRequestDto,
  myId: string | undefined,
): string {
  return sameUserId(ex.requesterId, myId) ? ex.ownerId : ex.requesterId;
}

function normalizeExchangeStatus(status: string | undefined): string {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function isPendingExchangeStatus(status: string | undefined): boolean {
  return normalizeExchangeStatus(status) === "PENDING";
}

function isMessageEnabledStatus(status: string | undefined): boolean {
  const st = normalizeExchangeStatus(status);
  return (
    st === "ACCEPTED" ||
    st === "REJECTED" ||
    st === "CANCELLED" ||
    st === "COMPLETED"
  );
}

function sameUserId(a: string | undefined, b: string | undefined): boolean {
  if (a == null || b == null) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Müsaitlik takvimi: yalnızca talep sahibi (öğrenci) — ilk talep ve öğrenci karşı teklifi.
 * `requesterId` ile `user.id` bazen eşleşmeyebilir (eski oturum / biçim); eğitmen teklifinde
 * yanıtlayan tarafın talep sahibi olduğu durumda yedekleriz.
 */
function isRequesterSkillBookingSide(
  ex: ExchangeRequestDto,
  myId: string | undefined,
): boolean {
  if (!myId) return false;
  if (sameUserId(ex.requesterId, myId)) return true;
  const st = normalizeExchangeStatus(ex.status);
  if (
    ex.pendingFromOwner &&
    (st === "PENDING" || st === "REJECTED") &&
    !sameUserId(ex.ownerId, myId)
  ) {
    return true;
  }
  return false;
}

function isPendingOutgoingForMe(
  ex: ExchangeRequestDto,
  myId: string | undefined,
): boolean {
  const pendingFromOwner = Boolean(ex.pendingFromOwner);
  if (pendingFromOwner) {
    return sameUserId(ex.ownerId, myId);
  }
  return sameUserId(ex.requesterId, myId);
}

function isInitialMessageFromMe(
  ex: ExchangeRequestDto,
  myId: string | undefined,
): boolean {
  if (normalizeExchangeStatus(ex.status) === "PENDING" && ex.pendingFromOwner) {
    return sameUserId(ex.ownerId, myId);
  }
  return sameUserId(ex.requesterId, myId);
}

function toUiStatus(
  ex: ExchangeRequestDto,
  myId: string | undefined,
): UiStatus {
  const st = normalizeExchangeStatus(ex.status);
  if (st === "CANCELLED") return "cancelled";
  if (st === "ACCEPTED") return "accepted";
  if (st === "REJECTED") return "rejected";
  if (st === "COMPLETED") return "completed";
  if (st === "PENDING") {
    if (!myId) return "pending-outgoing";
    return isPendingOutgoingForMe(ex, myId) ? "pending-outgoing" : "pending-incoming";
  }
  return "completed";
}

function canCancelExchange(
  ex: ExchangeRequestDto,
  myId: string | undefined,
): boolean {
  if (!myId) return false;
  const st = normalizeExchangeStatus(ex.status);
  if (st === "PENDING" && sameUserId(ex.requesterId, myId)) return true;
  if (st === "ACCEPTED") {
    if (!sameUserId(ex.requesterId, myId) && !sameUserId(ex.ownerId, myId)) {
      return false;
    }
    if (!ex.scheduledStartAt) return true;
    return Date.now() < new Date(ex.scheduledStartAt).getTime();
  }
  return false;
}

function mergeExchanges(
  sent: ExchangeRequestDto[],
  received: ExchangeRequestDto[],
  myId: string | undefined,
): ConversationRow[] {
  const map = new Map<string, ExchangeRequestDto>();
  for (const e of sent) map.set(e.id, e);
  for (const e of received) map.set(e.id, e);
  const byOther = new Map<string, ExchangeRequestDto[]>();
  for (const ex of map.values()) {
    const oid = getOtherUserId(ex, myId);
    const list = byOther.get(oid) ?? [];
    list.push(ex);
    byOther.set(oid, list);
  }
  const rows: ConversationRow[] = [];
  for (const [oid, exs] of byOther) {
    exs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = exs[0];
    const otherName = sameUserId(latest.requesterId, myId)
      ? latest.ownerName
      : latest.requesterName;
    const sortTime = Math.max(
      ...exs.map((e) => new Date(e.createdAt).getTime()),
    );
    const last =
      latest.message.length > 100
        ? `${latest.message.slice(0, 100)}…`
        : latest.message;
    rows.push({
      otherUserId: oid,
      otherName,
      exchanges: exs,
      listUiStatus: toUiStatus(latest, myId),
      lastPreview: last,
      sortTime,
    });
  }
  rows.sort((a, b) => b.sortTime - a.sortTime);
  return rows;
}

function findExchangeInRows(
  rows: ConversationRow[],
  exchangeId: string,
): ExchangeRequestDto | undefined {
  const id = exchangeId.toLowerCase();
  for (const r of rows) {
    const ex = r.exchanges.find((e) => e.id.toLowerCase() === id);
    if (ex) return ex;
  }
  return undefined;
}

type ThreadLine = {
  id: string;
  kind: "message" | "offer-card";
  sender: "me" | "other";
  text?: string;
  offerStatus?: UiStatus;
  offerSkillTitle?: string;
  offerScheduledAt?: string | null;
  offerMinutes?: number;
  timeLabel: string;
  sortMs: number;
};

export function MessagesPage({ onNavigate, onViewUserProfile }: MessagesPageProps) {
  const { t, locale } = useLanguage();
  const m = t.messagesPage;
  const sd = t.skillDetail;
  const { user, token, patchUser } = useAuth();
  const [resolvedMyUserId, setResolvedMyUserId] = useState<string | null>(null);
  const effectiveMyUserId = user?.id ?? resolvedMyUserId;
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string | null>(
    null,
  );
  const [activeExchangeId, setActiveExchangeId] = useState<string | null>(null);
  const [openFromNavExchangeId, setOpenFromNavExchangeId] = useState<
    string | null
  >(null);
  const [openFromNavUserId, setOpenFromNavUserId] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockedByUserIds, setBlockedByUserIds] = useState<string[]>([]);
  const [userAvatarById, setUserAvatarById] = useState<Record<string, string>>({});
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [threadLines, setThreadLines] = useState<ThreadLine[]>([]);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  /** Dar ekranda geri ile sohbet panelini kapattıysa, listeyi tekrar doldurunca ilk satırı yeniden otomatik seçme */
  const userClosedConversationPaneRef = useRef(false);
  const [loadingThread, setLoadingThread] = useState(false);
  /** Mesaj gönderme / kabul-red vb.; rezervasyon modalı `bookError` kullanır (karışmasın). */
  const [chatActionError, setChatActionError] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookDate, setBookDate] = useState(() => tomorrowDateStr());
  const [bookTime, setBookTime] = useState("10:00");
  const [bookMessage, setBookMessage] = useState("");
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  /** Overlay kapanmasını anında doğru engellemek için (closure’da bookError gecikmesi olmasın). */
  const bookErrorRef = useRef<string | null>(null);
  /** State bir sonraki paint’e kadar gecikebilir; kapanmayı engellemek için ref kullan. */
  const bookSubmittingRef = useRef(false);
  bookErrorRef.current = bookError;
  const [bookDatePopoverOpen, setBookDatePopoverOpen] = useState(false);
  const [bookCalendarMonth, setBookCalendarMonth] = useState<Date>(() =>
    ymdToLocalDate(tomorrowDateStr()),
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockConfirmPending, setBlockConfirmPending] = useState(false);
  /**
   * Modal açılmadan önce `/api/users/me/profile` ile tamamlanan kullanıcı id (öğrenci müsaitlik dalı).
   * Oturumda `user.id` eksikse refuse-and-offer sonrası reddedilmiş talepte bile talep sahibi doğru seçilir.
   */
  const [bookingModalUserId, setBookingModalUserId] = useState<string | null>(
    null,
  );

  const bookDateMin = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const bookDateMax = useMemo(() => {
    const d = new Date(bookDateMin);
    d.setDate(d.getDate() + BOOKING_HORIZON_DAYS);
    return d;
  }, [bookDateMin]);

  const loadList = useCallback(async (): Promise<ConversationRow[]> => {
    if (!token) {
      setRows([]);
      return [];
    }
    setLoadingList(true);
    try {
      const [sent, received] = await Promise.all([
        fetchSentExchangeRequests(token),
        fetchReceivedExchangeRequests(token),
      ]);
      const next = mergeExchanges(
        sent,
        received,
        effectiveMyUserId ?? undefined,
      );
      setRows(next);
      return next;
    } catch {
      setRows([]);
      return [];
    } finally {
      setLoadingList(false);
    }
  }, [token, effectiveMyUserId]);

  const selected = useMemo(() => {
    if (!selectedOtherUserId) return null;
    const row = rows.find((r) => r.otherUserId === selectedOtherUserId) ?? null;
    if (!row) return null;
    const ex =
      row.exchanges.find(
        (e) =>
          activeExchangeId &&
          e.id.toLowerCase() === activeExchangeId.toLowerCase(),
      ) ??
      row.exchanges[0] ??
      null;
    if (!ex) return null;
    return {
      row,
      ex,
      otherName: row.otherName,
      uiStatus: toUiStatus(ex, effectiveMyUserId ?? undefined),
    };
  }, [rows, selectedOtherUserId, activeExchangeId, effectiveMyUserId]);
  const selectedOtherId = selected
    ? getOtherUserId(selected.ex, effectiveMyUserId ?? undefined).toLowerCase()
    : null;
  const isSelectedBlocked = Boolean(
    selectedOtherId && blockedUserIds.includes(selectedOtherId),
  );
  const isBlockedBySelected = Boolean(
    selectedOtherId && blockedByUserIds.includes(selectedOtherId),
  );

  const effectiveBookingUserId = user?.id ?? bookingModalUserId ?? undefined;

  useEffect(() => {
    if (!token) {
      setResolvedMyUserId(null);
      return;
    }
    if (user?.id) {
      setResolvedMyUserId(user.id);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMyProfile(token);
        const id = me?.id?.trim();
        if (!cancelled && id) {
          setResolvedMyUserId(id);
          patchUser({ id });
        }
      } catch {
        if (!cancelled) setResolvedMyUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id, patchUser]);

  const studentUsesSkillAvailability = useMemo(() => {
    if (!selected || !effectiveBookingUserId) return false;
    return isRequesterSkillBookingSide(selected.ex, effectiveBookingUserId);
  }, [selected, effectiveBookingUserId]);

  const availabilityHookEnabled = Boolean(
    token && bookOpen && studentUsesSkillAvailability,
  );

  const {
    skill: bookingSkill,
    ready: bookingSkillReady,
    hasConstraints: bookingSkillHasConstraints,
    bookingDateOptions,
    bookingTimeOptions,
    bookableYmdSet,
    calendarMonthBounds,
  } = useBookingAvailabilityFromSkill({
    skillId: selected?.ex.skillId ?? null,
    enabled: availabilityHookEnabled,
    locale,
    selectedDateYmd: bookDate,
  });

  const hasBookingAvailabilityConstraints =
    studentUsesSkillAvailability && bookingSkillHasConstraints;

  const bookDateDisplayLabel = useMemo(() => {
    if (hasBookingAvailabilityConstraints && bookingDateOptions.length > 0) {
      const opt = bookingDateOptions.find((o) => o.value === bookDate);
      if (opt) return opt.label;
    }
    return ymdToLocalDate(bookDate).toLocaleDateString(
      locale === "tr" ? "tr-TR" : "en-US",
      {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  }, [
    hasBookingAvailabilityConstraints,
    bookingDateOptions,
    bookDate,
    locale,
  ]);

  const bookingMetaSummary = useMemo(() => {
    if (!bookingSkill || !hasSkillAvailabilityConstraints(bookingSkill)) {
      return null;
    }
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
    const metaDays = bookingSkill.availableDays?.length
      ? bookingSkill.availableDays
          .map((d) => dayLabels[dayIndex[d] ?? 0] ?? d)
          .join(", ")
      : null;
    const metaTime =
      bookingSkill.availableFrom && bookingSkill.availableUntil
        ? `${bookingSkill.availableFrom} – ${bookingSkill.availableUntil}`
        : null;
    const metaSessionType = bookingSkill.sessionTypes?.length
      ? bookingSkill.sessionTypes
          .map((v) =>
            v === "in-person" ? t.addSkill.inPerson : t.addSkill.online,
          )
          .join(", ")
      : null;
    const metaLocation = bookingSkill.inPersonLocation?.trim() || null;
    return { metaDays, metaTime, metaSessionType, metaLocation };
  }, [bookingSkill, t.addSkill]);

  const studentDateTimeLoading =
    studentUsesSkillAvailability && !bookingSkillReady;
  const studentFallbackDateTimeInputs = Boolean(
    studentUsesSkillAvailability &&
      bookingSkillReady &&
      bookingSkill &&
      !hasSkillAvailabilityConstraints(bookingSkill),
  );

  useEffect(() => {
    if (!hasBookingAvailabilityConstraints) return;
    if (bookingDateOptions.length === 0) return;
    if (!bookingDateOptions.some((d) => d.value === bookDate)) {
      setBookDate(bookingDateOptions[0].value);
    }
  }, [hasBookingAvailabilityConstraints, bookingDateOptions, bookDate]);

  useEffect(() => {
    if (!hasBookingAvailabilityConstraints) return;
    if (bookingTimeOptions.length === 0) return;
    if (!bookingTimeOptions.includes(bookTime)) {
      setBookTime(bookingTimeOptions[0]);
    }
  }, [hasBookingAvailabilityConstraints, bookingTimeOptions, bookTime]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  /** Bekleyen giden talep: karşı taraf reddettiğinde liste eski kalmasın (çekme hatası / gecikmeli güncelleme). */
  useEffect(() => {
    if (!token || selected?.uiStatus !== "pending-outgoing") return;
    const refresh = () => {
      void loadList();
    };
    const tick = window.setInterval(refresh, 25000);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [token, selected?.uiStatus, loadList]);

  /** Rezervasyon modalı açıkken sohbet şeridinde eski/başka hata kalmasın (API metni karışmasın). */
  useEffect(() => {
    if (bookOpen) {
      setChatActionError(null);
    }
  }, [bookOpen]);

  useEffect(() => {
    try {
      const open = sessionStorage.getItem(OPEN_EXCHANGE_KEY);
      if (open) {
        setOpenFromNavExchangeId(open);
        sessionStorage.removeItem(OPEN_EXCHANGE_KEY);
      }
      const openUser = sessionStorage.getItem(OPEN_USER_KEY);
      if (openUser?.trim()) {
        setOpenFromNavUserId(openUser.trim().toLowerCase());
        sessionStorage.removeItem(OPEN_USER_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const o = searchParams.get("open");
    const u = searchParams.get("user");
    if (o) {
      setOpenFromNavExchangeId(o);
    }
    if (u?.trim()) {
      setOpenFromNavUserId(u.trim().toLowerCase());
    }
    if (o || u) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const hydrateBlockState = useCallback(
    async (authToken: string) => {
      const state = await fetchMyBlockState(authToken);
      const mine = Array.from(
        new Set(
          (state.blockedUserIds ?? [])
            .map((v) => String(v).trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      const blockedMe = Array.from(
        new Set(
          (state.blockedByUserIds ?? [])
            .map((v) => String(v).trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      setBlockedUserIds(mine);
      setBlockedByUserIds(blockedMe);
    },
    [],
  );

  useEffect(() => {
    if (!token) {
      setBlockedUserIds([]);
      setBlockedByUserIds([]);
      return;
    }
    void hydrateBlockState(token).catch(() => {
      setBlockedUserIds([]);
      setBlockedByUserIds([]);
    });
  }, [token, hydrateBlockState]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchNotifications(token);
        if (cancelled) return;
        const unreadMessageNotificationIds = list
          .filter((n) => isNotificationUnread(n) && Boolean(n.exchangeRequestId))
          .map((n) => n.id);
        if (unreadMessageNotificationIds.length === 0) return;
        await Promise.all(
          unreadMessageNotificationIds.map((id) =>
            markNotificationRead(token, id).catch(() => undefined),
          ),
        );
        window.dispatchEvent(new Event("timelink:notifications-changed"));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || rows.length === 0) return;
    const missingIds = Array.from(
      new Set(
        rows
          .map((r) => r.otherUserId.trim().toLowerCase())
          .filter((id) => id && !userAvatarById[id]),
      ),
    );
    if (missingIds.length === 0) return;
    let cancelled = false;
    void (async () => {
      const resolved: Record<string, string> = {};
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const p: PublicUserProfileDto = await fetchPublicUserProfile(token, id);
            const src = p.avatarUrl?.trim();
            if (src) resolved[id] = src;
          } catch {
            /* ignore individual failures */
          }
        }),
      );
      if (cancelled || Object.keys(resolved).length === 0) return;
      setUserAvatarById((prev) => ({ ...prev, ...resolved }));
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, token, userAvatarById]);

  useEffect(() => {
    if (!openFromNavExchangeId || rows.length === 0) return;
    for (const r of rows) {
      if (
        r.exchanges.some(
          (e) =>
            e.id.toLowerCase() === openFromNavExchangeId.toLowerCase(),
        )
      ) {
        setSelectedOtherUserId(r.otherUserId);
        setActiveExchangeId(openFromNavExchangeId);
        setOpenFromNavExchangeId(null);
        return;
      }
    }
    setOpenFromNavExchangeId(null);
  }, [rows, openFromNavExchangeId]);

  useEffect(() => {
    if (!openFromNavUserId || rows.length === 0) return;
    const row = rows.find(
      (r) => r.otherUserId.trim().toLowerCase() === openFromNavUserId,
    );
    if (row) {
      setSelectedOtherUserId(row.otherUserId);
      setActiveExchangeId(row.exchanges[0]?.id ?? null);
    }
    setOpenFromNavUserId(null);
  }, [rows, openFromNavUserId]);

  /** İlk yüklemede (veya sayfa yeniden açıldığında) en güncel konuşmayı sağ panelde aç; bildirim/?open= yönlendirmesi varken bekleme */
  useEffect(() => {
    if (!token || loadingList || rows.length === 0) return;
    if (openFromNavExchangeId || openFromNavUserId) return;
    if (selectedOtherUserId) return;
    if (userClosedConversationPaneRef.current) return;
    const first = rows[0];
    if (!first?.exchanges[0]) return;
    setSelectedOtherUserId(first.otherUserId);
    setActiveExchangeId(first.exchanges[0].id);
  }, [
    token,
    loadingList,
    rows,
    selectedOtherUserId,
    openFromNavExchangeId,
    openFromNavUserId,
  ]);

  useEffect(() => {
    if (!selectedOtherUserId) return;
    const row = rows.find((r) => r.otherUserId === selectedOtherUserId);
    if (!row) {
      setSelectedOtherUserId(null);
      setActiveExchangeId(null);
      return;
    }
    if (
      !activeExchangeId ||
      !row.exchanges.some(
        (e) => e.id.toLowerCase() === activeExchangeId.toLowerCase(),
      )
    ) {
      setActiveExchangeId(row.exchanges[0].id);
    }
  }, [rows, selectedOtherUserId, activeExchangeId]);
  const canCancelSelected = Boolean(
    selected && canCancelExchange(selected.ex, user?.id),
  );
  const isSelectedOwnerSide = Boolean(
    selected && sameUserId(selected.ex.ownerId, user?.id),
  );
  const isSelectedRequesterSide = Boolean(
    selected && sameUserId(selected.ex.requesterId, user?.id),
  );
  const openOtherProfile = useCallback(() => {
    if (!selected) return;
    const oid = getOtherUserId(selected.ex, user?.id);
    if (user?.id && oid.toLowerCase() === user.id.toLowerCase()) {
      onNavigate?.("profile");
      return;
    }
    onViewUserProfile?.(oid);
  }, [onNavigate, onViewUserProfile, selected, user?.id]);

  const toggleBlockSelectedUser = useCallback(async () => {
    if (!selected || !token) return;
    const oid = getOtherUserId(selected.ex, user?.id).toLowerCase();
    if (!oid) return;
    setChatActionError(null);
    try {
      if (blockedUserIds.includes(oid)) {
        const state = await unblockUser(token, oid);
        setBlockedUserIds(
          Array.from(
            new Set(
              (state.blockedUserIds ?? [])
                .map((id) => String(id).trim().toLowerCase())
                .filter(Boolean),
            ),
          ),
        );
      } else {
        const state = await blockUser(token, oid);
        setBlockedUserIds(
          Array.from(
            new Set(
              (state.blockedUserIds ?? [])
                .map((id) => String(id).trim().toLowerCase())
                .filter(Boolean),
            ),
          ),
        );
      }
      await hydrateBlockState(token);
    } catch (e) {
      setChatActionError(apiErrorDisplayMessage(e, m.actionError));
    }
  }, [blockedUserIds, hydrateBlockState, m.actionError, selected, token, user?.id]);

  const handleBlockButtonClick = useCallback(() => {
    if (isSelectedBlocked) {
      void toggleBlockSelectedUser();
      return;
    }
    setBlockConfirmOpen(true);
  }, [isSelectedBlocked, toggleBlockSelectedUser]);

  const confirmBlockSelectedUser = useCallback(async () => {
    setBlockConfirmPending(true);
    try {
      await toggleBlockSelectedUser();
      setBlockConfirmOpen(false);
    } finally {
      setBlockConfirmPending(false);
    }
  }, [toggleBlockSelectedUser]);

  const loadThread = useCallback(
    async (row: ConversationRow | null) => {
      if (!token || !row) {
        setThreadLines([]);
        return;
      }
      setLoadingThread(true);
      setChatActionError(null);
      try {
        const allLines: ThreadLine[] = [];
        const exchangesChrono = [...row.exchanges].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

        for (const ex of exchangesChrono) {
          const createdMs = new Date(ex.createdAt).getTime();
          allLines.push({
            id: `initial-${ex.id}`,
            kind: "message",
            sender: isInitialMessageFromMe(ex, effectiveMyUserId ?? undefined)
              ? "me"
              : "other",
            text: ex.message,
            timeLabel: new Date(ex.createdAt).toLocaleString(
              locale === "tr" ? "tr-TR" : "en-US",
              { dateStyle: "short", timeStyle: "short" },
            ),
            sortMs: createdMs,
          });

          const status = toUiStatus(ex, effectiveMyUserId ?? undefined);
          if (status === "rejected" || status === "pending-incoming" || status === "pending-outgoing") {
            allLines.push({
              id: `offer-${ex.id}`,
              kind: "offer-card",
              sender: "other",
              offerStatus: status,
              offerSkillTitle: ex.skillTitle,
              offerScheduledAt: ex.scheduledStartAt,
              offerMinutes: ex.bookedMinutes,
              timeLabel: new Date(ex.createdAt).toLocaleString(
                locale === "tr" ? "tr-TR" : "en-US",
                { dateStyle: "short", timeStyle: "short" },
              ),
              sortMs: createdMs + 1,
            });
          }

          if (!isMessageEnabledStatus(ex.status)) {
            continue;
          }
          try {
            const apiMsgs = await fetchExchangeMessages(token, ex.id);
            const apiLines: ThreadLine[] = apiMsgs.map((msg: ExchangeMessageDto) => {
              const ms = new Date(msg.createdAt).getTime();
              return {
                id: msg.id,
                kind: "message",
                sender: sameUserId(msg.senderId, effectiveMyUserId ?? undefined)
                  ? "me"
                  : "other",
                text: msg.body,
                timeLabel: new Date(msg.createdAt).toLocaleString(
                  locale === "tr" ? "tr-TR" : "en-US",
                  { dateStyle: "short", timeStyle: "short" },
                ),
                sortMs: ms,
              };
            });
            allLines.push(...apiLines);
          } catch {
            // Keep timeline visible even if one exchange's messages cannot be fetched.
          }
        }

        allLines.sort((a, b) => a.sortMs - b.sortMs);
        setThreadLines(allLines);
      } catch {
        setThreadLines([]);
      } finally {
        setLoadingThread(false);
      }
    },
    [token, effectiveMyUserId, locale],
  );

  useEffect(() => {
    if (selected) void loadThread(selected.row);
  }, [selected, loadThread]);

  useEffect(() => {
    if (!selected) return;
    const node = threadScrollRef.current;
    if (!node) return;
    const raf = window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [selected?.ex.id, threadLines.length, loadingThread]);

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (r.otherName.toLowerCase().includes(q)) return true;
    if (r.lastPreview.toLowerCase().includes(q)) return true;
    return r.exchanges.some(
      (e) =>
        e.skillTitle.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q),
    );
  });

  const focusExchangeAfterList = useCallback(
    (next: ConversationRow[], exchangeId: string) => {
      const r = next.find((row) =>
        row.exchanges.some((e) => e.id === exchangeId),
      );
      if (r) {
        setSelectedOtherUserId(r.otherUserId);
        setActiveExchangeId(exchangeId);
      }
    },
    [],
  );

  const handleAccept = async (id: string) => {
    if (!token) return;
    try {
      await acceptExchangeRequest(token, id);
      const next = await loadList();
      focusExchangeAfterList(next, id);
    } catch (e) {
      setChatActionError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    try {
      await rejectExchangeRequest(token, id);
      const next = await loadList();
      focusExchangeAfterList(next, id);
    } catch (e) {
      setChatActionError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleCancelExchange = async () => {
    if (!token || !selected) return;
    setChatActionError(null);
    setCancelError(null);
    const exId = selected.ex.id;
    try {
      await cancelExchangeRequest(token, exId);
      setCancelOpen(false);
      const next = await loadList();
      focusExchangeAfterList(next, exId);
    } catch (e) {
      const msg = apiErrorDisplayMessage(e, m.actionError);
      const next = await loadList();
      focusExchangeAfterList(next, exId);
      const exAfter = findExchangeInRows(next, exId);
      const st = normalizeExchangeStatus(exAfter?.status);
      if (st === "REJECTED") {
        setCancelOpen(false);
        setCancelError(null);
        setChatActionError(null);
      } else {
        setCancelError(msg);
      }
    }
  };

  const handleRequesterStarted = async () => {
    if (!token || !selected) return;
    setChatActionError(null);
    const exId = selected.ex.id;
    try {
      await acknowledgeRequesterAttendance(token, exId);
      const next = await loadList();
      focusExchangeAfterList(next, exId);
    } catch (e) {
      setChatActionError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleOwnerStarted = async () => {
    if (!token || !selected) return;
    setChatActionError(null);
    const exId = selected.ex.id;
    try {
      await acknowledgeOwnerAttendance(token, exId);
      const next = await loadList();
      focusExchangeAfterList(next, exId);
    } catch (e) {
      setChatActionError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleRejectAndOfferOtherTime = async (id: string) => {
    if (!token || !selected) return;
    let resolvedUserId = user?.id ?? null;
    if (!resolvedUserId) {
      try {
        const p = await fetchMyProfile(token);
        if (p?.id) {
          resolvedUserId = p.id;
          patchUser({ id: p.id });
        }
      } catch {
        /* aşağıda hata */
      }
    }
    if (!resolvedUserId) {
      setChatActionError(m.bookingNeedUserId);
      return;
    }
    setBookingModalUserId(resolvedUserId);
    try {
      await rejectExchangeRequest(token, id);
      const next = await loadList();
      focusExchangeAfterList(next, id);
      setBookDate(tomorrowDateStr());
      setBookTime("10:00");
      setBookCalendarMonth(ymdToLocalDate(tomorrowDateStr()));
      setBookMessage(
        formatTemplate(m.offerOtherTimeDraft, {
          skill: selected.ex.skillTitle,
        }),
      );
      setBookOpen(true);
      setChatActionError(null);
      bookErrorRef.current = null;
      setBookError(null);
    } catch (e) {
      setChatActionError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleSend = async () => {
    if (!token || !selected || !messageText.trim()) return;
    if (isBlockedBySelected) return;
    if (!isMessageEnabledStatus(selected.ex.status)) return;
    setChatActionError(null);
    try {
      await postExchangeMessage(token, selected.ex.id, messageText.trim());
      setMessageText("");
      await loadThread(selected.row);
    } catch (e) {
      setChatActionError(apiErrorDisplayMessage(e, m.actionError));
      return;
    }
    try {
      await loadList();
    } catch {
      /* Konuşma listesi yenilenemese bile mesaj gönderildi; sessizce geç */
    }
  };

  /** Rezervasyon modalını kapatır (İptal / başarı); hata varken backdrop bunu kullanmaz. */
  const closeBookModal = useCallback(() => {
    bookErrorRef.current = null;
    setBookError(null);
    setChatActionError(null);
    setBookDatePopoverOpen(false);
    setBookingModalUserId(null);
    setBookOpen(false);
  }, []);

  const handleBookModalOpenChange = useCallback((open: boolean) => {
    if (!open && bookSubmittingRef.current) return;
    // API / doğrulama hatası varken overlay tıklaması modalı kapatmasın; uyarı kaybolmasın.
    if (!open && bookErrorRef.current) return;
    setBookOpen(open);
    if (!open) {
      bookErrorRef.current = null;
      setBookError(null);
      setBookDatePopoverOpen(false);
      setChatActionError(null);
      setBookingModalUserId(null);
    }
  }, []);

  const handleCreateBooking = async () => {
    if (!token || !selected) return;
    setBookDatePopoverOpen(false);
    setChatActionError(null);
    bookSubmittingRef.current = true;
    setBookSubmitting(true);
    bookErrorRef.current = null;
    setBookError(null);
    try {
      let scheduledStartAt = localDateTimeToUtcIso(bookDate, bookTime);
      const minMs = Date.now() + 60 * 60 * 1000;
      if (
        studentUsesSkillAvailability &&
        bookingSkill &&
        hasSkillAvailabilityConstraints(bookingSkill)
      ) {
        if (bookingDateOptions.length === 0) {
          const err = sd.bookNoSlots;
          bookErrorRef.current = err;
          flushSync(() => {
            setBookError(err);
            setBookOpen(true);
            setBookDatePopoverOpen(true);
          });
          return;
        }
        let effectiveDate = bookDate;
        if (!bookingDateOptions.some((o) => o.value === effectiveDate)) {
          effectiveDate = bookingDateOptions[0].value;
        }
        const slotTimes = buildSkillTimeOptionsForDate(bookingSkill, effectiveDate);
        let effectiveTime = bookTime;
        if (slotTimes.length === 0) {
          const err = sd.bookNoSlots;
          bookErrorRef.current = err;
          flushSync(() => {
            setBookError(err);
            setBookOpen(true);
            setBookDatePopoverOpen(true);
          });
          return;
        }
        if (!slotTimes.includes(effectiveTime)) {
          effectiveTime = slotTimes[0];
        }
        if (
          !isWithinSkillAvailability(bookingSkill, effectiveDate, effectiveTime)
        ) {
          const err = sd.bookOutsideAvailability;
          bookErrorRef.current = err;
          flushSync(() => {
            setBookError(err);
            setBookOpen(true);
            setBookDatePopoverOpen(true);
          });
          return;
        }
        if (effectiveDate !== bookDate) setBookDate(effectiveDate);
        if (effectiveTime !== bookTime) setBookTime(effectiveTime);
        scheduledStartAt = localDateTimeToUtcIso(effectiveDate, effectiveTime);
      }
      if (new Date(scheduledStartAt).getTime() < minMs) {
        const soon = m.bookTooSoon;
        bookErrorRef.current = soon;
        flushSync(() => {
          setBookError(soon);
          setBookOpen(true);
          setBookDatePopoverOpen(true);
        });
        return;
      }
      const payload = {
        message: bookMessage.trim() || selected.ex.message || m.bookFallbackMessage,
        bookedMinutes: selected.ex.bookedMinutes,
        scheduledStartAt,
      };
      const isRejected = selected.uiStatus === "rejected";
      const uidForCounter =
        user?.id ?? bookingModalUserId ?? undefined;
      const shouldRequesterCounterOffer =
        isRejected &&
        Boolean(selected.ex.pendingFromOwner) &&
        Boolean(uidForCounter) &&
        isRequesterSkillBookingSide(selected.ex, uidForCounter);
      /** Öğrenci eğitmen teklifini reddettikten sonra eğitmen yeniden teklif verir (pendingFromOwner true olsa da). */
      const shouldOwnerCounterOffer =
        isRejected && sameUserId(selected.ex.ownerId, user?.id);
      const created = shouldOwnerCounterOffer
        ? await createCounterOffer(token, selected.ex.id, payload)
        : shouldRequesterCounterOffer
          ? await createRequesterCounterOffer(token, selected.ex.id, payload)
          : await createExchangeRequest(token, selected.ex.skillId, payload);
      try {
        sessionStorage.setItem(OPEN_EXCHANGE_KEY, created.id);
      } catch {
        /* ignore */
      }
      closeBookModal();
      const next = await loadList();
      if (shouldOwnerCounterOffer || shouldRequesterCounterOffer) {
        focusExchangeAfterList(next, created.id);
      } else {
        setSelectedOtherUserId(getOtherUserId(created, user?.id));
        setActiveExchangeId(created.id);
      }
    } catch (e) {
      const msg = apiErrorDisplayMessage(e, m.actionError);
      bookErrorRef.current = msg;
      flushSync(() => {
        setBookError(msg);
        setBookOpen(true);
        setBookDatePopoverOpen(true);
      });
    } finally {
      bookSubmittingRef.current = false;
      setBookSubmitting(false);
    }
  };

  return (
    <PageLayout hideFooter onNavigate={onNavigate}>
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-20 sm:px-6 sm:pb-4 lg:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
          <Card className="flex min-h-0 flex-1 flex-row gap-0 overflow-hidden rounded-2xl border-0 shadow-lg">
            <div className={cn(
              "flex min-h-0 w-full flex-1 flex-col border-r border-border sm:w-96 sm:shrink-0",
              selectedOtherUserId ? "hidden sm:flex" : "flex",
            )}>
              <div className="border-b border-border p-4">
                <h2 className="mb-4 text-xl text-foreground">{m.title}</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={m.searchPlaceholder}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {loadingList ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    {t.common.loading}
                  </p>
                ) : filteredRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                    <MessageCircle className="h-10 w-10 opacity-40" />
                    <p className="text-sm">{m.emptyList}</p>
                  </div>
                ) : (
                  filteredRows.map((conv) => {
                    const latest = conv.exchanges[0];
                    const isBlocked = blockedUserIds.includes(
                      conv.otherUserId.toLowerCase(),
                    );
                    const convAvatar =
                      userAvatarById[conv.otherUserId.trim().toLowerCase()];
                    return (
                    <button
                      key={conv.otherUserId}
                      type="button"
                      onClick={() => {
                        setSelectedOtherUserId(conv.otherUserId);
                        setActiveExchangeId(latest.id);
                      }}
                      className={`w-full border-b border-border p-4 text-left transition-colors hover:bg-accent/50 ${
                        selectedOtherUserId === conv.otherUserId
                          ? "bg-primary/10"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {convAvatar ? (
                          <img
                            src={convAvatar}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                            aria-hidden
                          >
                            {initialsFromFullName(conv.otherName)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <h3 className="truncate text-sm text-foreground">
                              {conv.otherName}
                            </h3>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {new Date(latest.createdAt).toLocaleDateString(
                                locale === "tr" ? "tr-TR" : "en-US",
                              )}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {latest.skillTitle} · {latest.bookedMinutes} min
                            {conv.exchanges.length > 1
                              ? ` · +${conv.exchanges.length - 1}`
                              : ""}
                          </p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {conv.lastPreview}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {conv.listUiStatus === "pending-incoming" && (
                              <Badge variant="secondary">{m.pendingRequest}</Badge>
                            )}
                            {conv.listUiStatus === "pending-outgoing" && (
                              <Badge variant="outline">{m.waitingApproval}</Badge>
                            )}
                            {conv.listUiStatus === "rejected" && (
                              <Badge variant="destructive">{m.rejectedBadge}</Badge>
                            )}
                            {conv.listUiStatus === "accepted" && (
                              <Badge className="bg-emerald-600/90 text-white">
                                {m.acceptedBadge}
                              </Badge>
                            )}
                            {conv.listUiStatus === "cancelled" && (
                              <Badge variant="secondary">{m.cancelledBadge}</Badge>
                            )}
                            {conv.listUiStatus === "completed" && (
                              <Badge>{m.completedBadge}</Badge>
                            )}
                            {isBlocked && (
                              <Badge variant="outline">{m.blockedBadge}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                  })
                )}
              </div>
            </div>

            <div className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              selectedOtherUserId ? "flex" : "hidden sm:flex",
            )}>
              {!selected ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/40" />
                  <h3 className="text-lg text-foreground">
                    {m.emptyThreadTitle}
                  </h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {m.emptyThreadBody}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <button
                        type="button"
                        className="mr-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent sm:hidden"
                        onClick={() => {
                          userClosedConversationPaneRef.current = true;
                          setSelectedOtherUserId(null);
                          setActiveExchangeId(null);
                        }}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={openOtherProfile}
                        className="flex min-w-0 max-w-full items-center gap-3 rounded-lg p-0 text-left transition hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title={m.viewMemberProfileTitle}
                      >
                        {selectedOtherId && userAvatarById[selectedOtherId] ? (
                          <img
                            src={userAvatarById[selectedOtherId]}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                            aria-hidden
                          >
                            {initialsFromFullName(selected.otherName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate text-foreground">
                            {selected.otherName}
                          </h3>
                          <p className="truncate text-xs text-muted-foreground">
                            {selected.ex.skillTitle}
                          </p>
                        </div>
                      </button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelectedBlocked ? "outline" : "destructive"}
                      className="ml-3 shrink-0"
                      onClick={handleBlockButtonClick}
                    >
                      {isSelectedBlocked ? m.unblockUser : m.blockUser}
                    </Button>
                  </div>

                  {selected.uiStatus === "pending-incoming" && (
                    <div className="border-b border-sky-200/80 bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 p-4 dark:border-sky-800/60 dark:bg-gradient-to-r dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/70">
                      <p className="mb-3 text-sm font-medium text-slate-800 dark:text-sky-100">
                        {formatTemplate(
                          selected.ex.pendingFromOwner
                            ? m.ownerProposedNewSlot
                            : m.wantsConnect,
                          {
                            name: selected.otherName,
                          },
                        )}
                      </p>
                      <div className="mb-3 rounded-xl border border-sky-200/80 bg-white/70 p-3 text-sm text-slate-700 shadow-sm dark:border-sky-800/60 dark:bg-slate-900/70 dark:text-slate-100">
                        <p>
                          {m.requestSkill}: {selected.ex.skillTitle}
                        </p>
                        <p>
                          {m.requestDateTime}:{" "}
                          {formatScheduledAt(selected.ex.scheduledStartAt, locale)}
                        </p>
                        <p>
                          {m.requestMessage}: {selected.ex.message}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                          onClick={() => void handleAccept(selected.ex.id)}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          {m.accept}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 dark:!border-slate-500 dark:!bg-slate-800 dark:!text-slate-100 dark:hover:!bg-slate-700"
                          onClick={() => void handleReject(selected.ex.id)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          {m.decline}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 dark:!border-slate-500 dark:!bg-slate-800 dark:!text-slate-100 dark:hover:!bg-slate-700"
                          onClick={() =>
                            void handleRejectAndOfferOtherTime(selected.ex.id)
                          }
                        >
                          <CalendarPlus className="mr-1 h-4 w-4" />
                          {m.declineAndOfferOtherTime}
                        </Button>
                      </div>
                    </div>
                  )}

                  {selected.uiStatus === "pending-outgoing" && (
                    <div className="border-b border-amber-200 bg-amber-50/95 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
                      <p className="text-sm">
                        {formatTemplate(m.waitingOutgoing, {
                          name: selected.otherName,
                        })}
                      </p>
                      {canCancelSelected &&
                      normalizeExchangeStatus(selected.ex.status) === "PENDING" ? (
                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-700/40 text-amber-900 hover:bg-amber-100 dark:border-amber-300/40 dark:text-amber-100 dark:hover:bg-amber-900/40"
                            onClick={() => {
                              setCancelError(null);
                              setCancelOpen(true);
                            }}
                          >
                            <X className="mr-1 h-4 w-4" />
                            {m.cancelPending}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {selected.uiStatus === "rejected" && (
                    <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                      <p>{m.rejectedHint}</p>
                    </div>
                  )}

                  {selected.uiStatus === "accepted" && (
                    <div className="border-b border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 text-sm text-foreground/90">
                          <p>{selected.ex.skillTitle}</p>
                          <p>{formatScheduledAt(selected.ex.scheduledStartAt, locale)}</p>
                        </div>
                        {canCancelSelected ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="ml-auto border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setCancelError(null);
                              setCancelOpen(true);
                            }}
                          >
                            <X className="mr-1 h-4 w-4" />
                            {m.cancelSession}
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        {isSelectedRequesterSide && !selected.ex.requesterAttendanceAckAt ? (
                          <Button type="button" size="sm" variant="secondary" onClick={() => void handleRequesterStarted()}>
                            {m.requesterConfirmStarted}
                          </Button>
                        ) : null}
                        {isSelectedOwnerSide && !selected.ex.ownerAttendanceAckAt ? (
                          <Button type="button" size="sm" variant="secondary" onClick={() => void handleOwnerStarted()}>
                            {m.ownerConfirmStarted}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {selected.uiStatus === "cancelled" && (
                    <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                      <p>{m.cancelledHint}</p>
                    </div>
                  )}

                  {selected.uiStatus === "completed" && (
                    <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                      {m.sessionCompletedHint}
                    </div>
                  )}

                  <div
                    ref={threadScrollRef}
                    className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
                  >
                    {loadingThread ? (
                      <p className="text-center text-sm text-muted-foreground">
                        {t.common.loading}
                      </p>
                    ) : (
                      threadLines.map((line) => (
                        <div
                          key={line.id}
                          className={`flex ${line.sender === "me" ? "justify-end" : "justify-start"}`}
                        >
                          {line.kind === "offer-card" ? (
                            <div className="max-w-xl rounded-xl border border-border bg-muted/40 p-3 text-sm">
                              <p className="font-medium text-foreground">
                                {line.offerStatus === "rejected"
                                  ? m.rejectedBadge
                                  : line.offerStatus === "pending-incoming"
                                    ? m.pendingRequest
                                    : m.waitingApproval}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                {m.requestSkill}: {line.offerSkillTitle}
                              </p>
                              <p className="text-muted-foreground">
                                {m.requestDateTime}:{" "}
                                {formatScheduledAt(line.offerScheduledAt, locale)}
                              </p>
                              <p className="text-muted-foreground">
                                {line.offerMinutes} min
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {line.timeLabel}
                              </p>
                            </div>
                          ) : (
                            <div
                              className={`max-w-md ${line.sender === "me" ? "order-2" : "order-1"}`}
                            >
                              <div
                                className={`rounded-2xl p-3 ${
                                  line.sender === "me"
                                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">
                                  {line.text}
                                </p>
                              </div>
                              <p className="mt-1 px-3 text-xs text-muted-foreground">
                                {line.timeLabel}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {chatActionError && !bookOpen ? (
                    <div
                      role="alert"
                      className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                    >
                      {chatActionError}
                    </div>
                  ) : null}
                  {isBlockedBySelected ? (
                    <div
                      role="status"
                      className="shrink-0 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200"
                    >
                      {m.blockedHint}
                    </div>
                  ) : null}

                  {isMessageEnabledStatus(selected.ex.status) ||
                  (isPendingExchangeStatus(selected.ex.status) &&
                    Boolean(selected.ex.pendingFromOwner)) ? (
                    <div className="border-t border-border p-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder={
                            isBlockedBySelected
                              ? m.blockedInputPlaceholder
                              : m.typeMessage
                          }
                          value={messageText}
                          disabled={isBlockedBySelected}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void handleSend();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                          onClick={() => void handleSend()}
                          disabled={isBlockedBySelected || !messageText.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      <Modal
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setCancelError(null);
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{m.cancelConfirmTitle}</ModalTitle>
            <ModalDescription>
              <span className="whitespace-pre-line block text-sm text-muted-foreground">
                {m.cancelConfirmBody}
              </span>
            </ModalDescription>
          </ModalHeader>
          {cancelError ? (
            <div
              role="alert"
              className="-mt-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {cancelError}
            </div>
          ) : null}
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelOpen(false);
                setCancelError(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleCancelExchange()}
            >
              {selected?.uiStatus === "pending-outgoing" ? m.cancelPending : m.cancelSession}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        open={blockConfirmOpen}
        onOpenChange={(open) => {
          if (blockConfirmPending) return;
          setBlockConfirmOpen(open);
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{m.blockConfirmTitle}</ModalTitle>
            <ModalDescription>
              <span className="block whitespace-pre-line text-sm text-muted-foreground">
                {m.blockConfirmBody}
              </span>
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              disabled={blockConfirmPending}
              onClick={() => setBlockConfirmOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={blockConfirmPending}
              onClick={() => void confirmBlockSelectedUser()}
            >
              {m.blockConfirmAction}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={bookOpen} onOpenChange={handleBookModalOpenChange}>
        <ModalContent className="flex flex-col">
          <ModalHeader>
            <ModalTitle>{m.bookModalTitle}</ModalTitle>
          </ModalHeader>
          <div className="space-y-4">
            {bookingMetaSummary ? (
              <div className="flex flex-wrap gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                {bookingMetaSummary.metaSessionType ? (
                  <Badge variant="secondary">{bookingMetaSummary.metaSessionType}</Badge>
                ) : null}
                {bookingMetaSummary.metaDays ? (
                  <Badge variant="secondary">{bookingMetaSummary.metaDays}</Badge>
                ) : null}
                {bookingMetaSummary.metaTime ? (
                  <Badge variant="secondary">{bookingMetaSummary.metaTime}</Badge>
                ) : null}
                {bookingMetaSummary.metaLocation ? (
                  <Badge variant="secondary">{bookingMetaSummary.metaLocation}</Badge>
                ) : null}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {formatTemplate(m.bookHint, {
                minutes: String(selected?.ex.bookedMinutes ?? 0),
              })}
            </p>
            {hasBookingAvailabilityConstraints ? (
              <p className="text-sm text-muted-foreground">{sd.bookScheduleHint}</p>
            ) : null}
            {hasBookingAvailabilityConstraints &&
            bookingDateOptions.length === 0 &&
            bookingSkillReady ? (
              <p className="text-sm text-destructive">{sd.bookNoSlots}</p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {studentDateTimeLoading ? (
                <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t.common.loading}
                </div>
              ) : hasBookingAvailabilityConstraints ? (
                <>
                  <div>
                    <Label htmlFor="msg-book-date-trigger">{m.bookDateLabel}</Label>
                    <Popover
                      open={bookDatePopoverOpen}
                      onOpenChange={(open) => {
                        setBookDatePopoverOpen(open);
                        if (open) setBookCalendarMonth(ymdToLocalDate(bookDate));
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="msg-book-date-trigger"
                          type="button"
                          variant="outline"
                          className={cn(
                            "mt-2 flex h-10 w-full items-center justify-between px-3 font-normal",
                          )}
                        >
                          <span className="truncate text-left">{bookDateDisplayLabel}</span>
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
                        {bookError ? (
                          <div
                            role="alert"
                            aria-live="assertive"
                            className="mb-2 flex items-start gap-2 rounded-md border border-red-600 bg-red-50 px-2 py-2 text-xs font-medium leading-snug text-red-900 dark:border-red-500 dark:bg-red-950/70 dark:text-red-100"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>{bookError}</span>
                          </div>
                        ) : null}
                        <Calendar
                          mode="single"
                          locale={locale === "tr" ? trLocale : enUS}
                          weekStartsOn={locale === "tr" ? 1 : 0}
                          month={bookCalendarMonth}
                          onMonthChange={setBookCalendarMonth}
                          selected={ymdToLocalDate(bookDate)}
                          onSelect={(d) => {
                            if (d) {
                              setBookError(null);
                              setBookDate(dateToYmd(d));
                              setBookCalendarMonth(d);
                              setBookDatePopoverOpen(false);
                            }
                          }}
                          disabled={(date) => !bookableYmdSet.has(dateToYmd(date))}
                          startMonth={calendarMonthBounds.startMonth}
                          endMonth={calendarMonthBounds.endMonth}
                          defaultMonth={ymdToLocalDate(bookDate)}
                          className="p-0"
                          classNames={{
                            root: "border-0 bg-transparent shadow-none",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="msg-book-time">{m.bookTimeLabel}</Label>
                    {bookingTimeOptions.length > 0 ? (
                      <Select
                        value={
                          bookingTimeOptions.includes(bookTime)
                            ? bookTime
                            : bookingTimeOptions[0]
                        }
                        onValueChange={(v) => {
                          setBookError(null);
                          setBookTime(v);
                        }}
                      >
                        <SelectTrigger id="msg-book-time" className="mt-2 w-full">
                          <SelectValue placeholder={m.bookTimeLabel} />
                        </SelectTrigger>
                        <SelectContent>
                          {bookingTimeOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">{sd.bookNoSlots}</p>
                    )}
                  </div>
                </>
              ) : studentFallbackDateTimeInputs ? (
                <>
                  <div className="min-w-0">
                    <Label htmlFor="msg-book-date-fallback">{m.bookDateLabel}</Label>
                    <Input
                      id="msg-book-date-fallback"
                      type="date"
                      className="mt-2"
                      value={bookDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setBookError(null);
                        setBookDate(e.target.value);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="msg-book-time-fallback">{m.bookTimeLabel}</Label>
                    <Input
                      id="msg-book-time-fallback"
                      type="time"
                      className="mt-2"
                      value={bookTime}
                      onChange={(e) => {
                        setBookError(null);
                        setBookTime(e.target.value);
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="msg-book-date-trigger">{m.bookDateLabel}</Label>
                    <Popover
                      open={bookDatePopoverOpen}
                      onOpenChange={(open) => {
                        setBookDatePopoverOpen(open);
                        if (open) setBookCalendarMonth(ymdToLocalDate(bookDate));
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="msg-book-date-trigger"
                          type="button"
                          variant="outline"
                          className={cn(
                            "mt-2 flex h-10 w-full items-center justify-between px-3 font-normal",
                          )}
                        >
                          <span className="truncate text-left">{bookDateDisplayLabel}</span>
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
                        {bookError ? (
                          <div
                            role="alert"
                            aria-live="assertive"
                            className="mb-2 flex items-start gap-2 rounded-md border border-red-600 bg-red-50 px-2 py-2 text-xs font-medium leading-snug text-red-900 dark:border-red-500 dark:bg-red-950/70 dark:text-red-100"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>{bookError}</span>
                          </div>
                        ) : null}
                        <Calendar
                          mode="single"
                          locale={locale === "tr" ? trLocale : enUS}
                          weekStartsOn={locale === "tr" ? 1 : 0}
                          month={bookCalendarMonth}
                          onMonthChange={setBookCalendarMonth}
                          selected={ymdToLocalDate(bookDate)}
                          onSelect={(d) => {
                            if (d) {
                              setBookError(null);
                              setBookDate(dateToYmd(d));
                              setBookCalendarMonth(d);
                              setBookDatePopoverOpen(false);
                            }
                          }}
                          disabled={[
                            { before: bookDateMin },
                            { after: bookDateMax },
                          ]}
                          defaultMonth={ymdToLocalDate(bookDate)}
                          className="p-0"
                          classNames={{
                            root: "border-0 bg-transparent shadow-none",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="msg-book-time">{m.bookTimeLabel}</Label>
                    <Input
                      id="msg-book-time"
                      type="time"
                      className="mt-2"
                      value={bookTime}
                      onChange={(e) => {
                        setBookError(null);
                        setBookTime(e.target.value);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            <div>
              <Label htmlFor="msg-book-note">{m.bookMessageLabel}</Label>
              <Textarea
                id="msg-book-note"
                className="mt-2 min-h-24"
                value={bookMessage}
                onChange={(e) => setBookMessage(e.target.value)}
                placeholder={m.bookMessagePlaceholder}
              />
            </div>
          </div>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              disabled={bookSubmitting}
              onClick={() => closeBookModal()}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              onClick={() => void handleCreateBooking()}
              disabled={
                bookSubmitting ||
                (studentUsesSkillAvailability && !bookingSkillReady) ||
                (hasBookingAvailabilityConstraints &&
                  (bookingDateOptions.length === 0 ||
                    bookingTimeOptions.length === 0))
              }
            >
              {bookSubmitting ? t.common.loading : m.bookSubmit}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {bookOpen && bookError
        ? createPortal(
            <div
              role="alert"
              aria-live="assertive"
              className="pointer-events-none fixed inset-x-0 top-[max(5rem,env(safe-area-inset-top,0px))] z-[2100] flex justify-center px-4"
            >
              <div className="pointer-events-auto flex w-full max-w-lg items-start gap-2 rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-xl dark:border-red-500 dark:bg-red-950/90 dark:text-red-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>{bookError}</span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </PageLayout>
  );
}
