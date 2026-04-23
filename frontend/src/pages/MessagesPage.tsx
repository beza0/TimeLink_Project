import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
  Search,
  Send,
  Check,
  X,
  MessageCircle,
  CalendarPlus,
  CalendarIcon,
  CheckCircle2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { formatTemplate } from "../language";
import { enUS, tr as trLocale } from "react-day-picker/locale";
import {
  acceptExchangeRequest,
  cancelExchangeRequest,
  completeExchangeRequest,
  createCounterOffer,
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
import { initialsFromFullName } from "../lib/initials";

interface MessagesPageProps {
  onNavigate?: (page: PageType) => void;
  /** Sohbet başlığındaki isim/avatar: karşıdaki üyenin herkese açık profil sayfası */
  onViewUserProfile?: (userId: string) => void;
}

const OPEN_EXCHANGE_KEY = "timelink_open_exchange";
const BOOKING_HORIZON_DAYS = 365;

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

function dateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

type ThreadLine = {
  id: string;
  sender: "me" | "other";
  text: string;
  timeLabel: string;
};

export function MessagesPage({ onNavigate, onViewUserProfile }: MessagesPageProps) {
  const { t, locale } = useLanguage();
  const m = t.messagesPage;
  const { user, token } = useAuth();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string | null>(
    null,
  );
  const [activeExchangeId, setActiveExchangeId] = useState<string | null>(null);
  const [openFromNavExchangeId, setOpenFromNavExchangeId] = useState<
    string | null
  >(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [threadLines, setThreadLines] = useState<ThreadLine[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookDate, setBookDate] = useState(() => tomorrowDateStr());
  const [bookTime, setBookTime] = useState("10:00");
  const [bookMessage, setBookMessage] = useState("");
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookDatePopoverOpen, setBookDatePopoverOpen] = useState(false);
  const [bookCalendarMonth, setBookCalendarMonth] = useState<Date>(() =>
    ymdToLocalDate(tomorrowDateStr()),
  );
  const [cancelOpen, setCancelOpen] = useState(false);

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
  const bookDateDisplayLabel = useMemo(
    () =>
      ymdToLocalDate(bookDate).toLocaleDateString(
        locale === "tr" ? "tr-TR" : "en-US",
        { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" },
      ),
    [bookDate, locale],
  );

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
      const next = mergeExchanges(sent, received, user?.id);
      setRows(next);
      return next;
    } catch {
      setRows([]);
      return [];
    } finally {
      setLoadingList(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    try {
      const open = sessionStorage.getItem(OPEN_EXCHANGE_KEY);
      if (open) {
        setOpenFromNavExchangeId(open);
        sessionStorage.removeItem(OPEN_EXCHANGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!openFromNavExchangeId || rows.length === 0) return;
    for (const r of rows) {
      if (r.exchanges.some((e) => e.id === openFromNavExchangeId)) {
        setSelectedOtherUserId(r.otherUserId);
        setActiveExchangeId(openFromNavExchangeId);
        setOpenFromNavExchangeId(null);
        return;
      }
    }
    setOpenFromNavExchangeId(null);
  }, [rows, openFromNavExchangeId]);

  const selected = useMemo(() => {
    if (!selectedOtherUserId) return null;
    const row = rows.find((r) => r.otherUserId === selectedOtherUserId) ?? null;
    if (!row) return null;
    const ex =
      row.exchanges.find((e) => e.id === activeExchangeId) ??
      row.exchanges[0] ??
      null;
    if (!ex) return null;
    return {
      row,
      ex,
      otherName: row.otherName,
      uiStatus: toUiStatus(ex, user?.id),
    };
  }, [rows, selectedOtherUserId, activeExchangeId, user?.id]);

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
      !row.exchanges.some((e) => e.id === activeExchangeId)
    ) {
      setActiveExchangeId(row.exchanges[0].id);
    }
  }, [rows, selectedOtherUserId, activeExchangeId]);
  const canCreateNewOffer =
    selected != null &&
    selected.uiStatus === "rejected" &&
    sameUserId(selected.ex.requesterId, user?.id);

  const canCancelSelected = Boolean(
    selected && canCancelExchange(selected.ex, user?.id),
  );
  const canMarkCompleteSelected = Boolean(
    selected &&
      selected.uiStatus === "accepted" &&
      sameUserId(selected.ex.ownerId, user?.id),
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

  const loadThread = useCallback(
    async (ex: ExchangeRequestDto | null) => {
      if (!token || !ex) {
        setThreadLines([]);
        return;
      }
      setLoadingThread(true);
      setSendError(null);
      try {
        const initial: ThreadLine = {
          id: `initial-${ex.id}`,
          sender: isInitialMessageFromMe(ex, user?.id) ? "me" : "other",
          text: ex.message,
          timeLabel: new Date(ex.createdAt).toLocaleString(
            locale === "tr" ? "tr-TR" : "en-US",
            { dateStyle: "short", timeStyle: "short" },
          ),
        };

        if (isPendingExchangeStatus(ex.status)) {
          setThreadLines([initial]);
          return;
        }

        const apiMsgs = await fetchExchangeMessages(token, ex.id);
        const apiLines: ThreadLine[] = apiMsgs.map((msg: ExchangeMessageDto) => ({
          id: msg.id,
          sender: sameUserId(msg.senderId, user?.id) ? "me" : "other",
          text: msg.body,
          timeLabel: new Date(msg.createdAt).toLocaleString(
            locale === "tr" ? "tr-TR" : "en-US",
            { dateStyle: "short", timeStyle: "short" },
          ),
        }));

        const sorted = [initial, ...apiLines].sort((a, b) => {
          const t = (line: ThreadLine) => {
            if (line.id.startsWith("initial-")) {
              return new Date(ex.createdAt).getTime();
            }
            const found = apiMsgs.find((x) => x.id === line.id);
            return found ? new Date(found.createdAt).getTime() : 0;
          };
          return t(a) - t(b);
        });
        setThreadLines(sorted);
      } catch {
        setThreadLines([]);
      } finally {
        setLoadingThread(false);
      }
    },
    [token, user?.id, locale],
  );

  useEffect(() => {
    if (selected) void loadThread(selected.ex);
  }, [selected, loadThread]);

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
      setSendError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    try {
      await rejectExchangeRequest(token, id);
      const next = await loadList();
      focusExchangeAfterList(next, id);
    } catch (e) {
      setSendError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleCancelExchange = async () => {
    if (!token || !selected) return;
    setSendError(null);
    const exId = selected.ex.id;
    try {
      await cancelExchangeRequest(token, exId);
      setCancelOpen(false);
      const next = await loadList();
      focusExchangeAfterList(next, exId);
    } catch (e) {
      setSendError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleMarkComplete = async () => {
    if (!token || !selected) return;
    setSendError(null);
    const exId = selected.ex.id;
    try {
      await completeExchangeRequest(token, exId);
      const next = await loadList();
      focusExchangeAfterList(next, exId);
    } catch (e) {
      setSendError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleRejectAndOfferOtherTime = async (id: string) => {
    if (!token || !selected) return;
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
      setSendError(null);
    } catch (e) {
      setSendError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleSend = async () => {
    if (!token || !selected || !messageText.trim()) return;
    if (!isMessageEnabledStatus(selected.ex.status)) return;
    setSendError(null);
    try {
      await postExchangeMessage(token, selected.ex.id, messageText.trim());
      setMessageText("");
      await loadThread(selected.ex);
    } catch (e) {
      setSendError(apiErrorDisplayMessage(e, m.actionError));
      return;
    }
    try {
      await loadList();
    } catch {
      /* Konuşma listesi yenilenemese bile mesaj gönderildi; sessizce geç */
    }
  };

  const openBookModal = () => {
    if (!selected) return;
    setBookDate(tomorrowDateStr());
    setBookTime("10:00");
    setBookCalendarMonth(ymdToLocalDate(tomorrowDateStr()));
    setBookMessage(
      formatTemplate(m.bookDefaultMessage, { skill: selected.ex.skillTitle }),
    );
    setBookOpen(true);
    setSendError(null);
  };

  const handleCreateBooking = async () => {
    if (!token || !selected) return;
    setBookSubmitting(true);
    setSendError(null);
    try {
      const scheduledStartAt = localDateTimeToUtcIso(bookDate, bookTime);
      const minMs = Date.now() + 60 * 60 * 1000;
      if (new Date(scheduledStartAt).getTime() < minMs) {
        setSendError(m.bookTooSoon);
        return;
      }
      const payload = {
        message: bookMessage.trim() || selected.ex.message || m.bookFallbackMessage,
        bookedMinutes: selected.ex.bookedMinutes,
        scheduledStartAt,
      };
      const shouldCreateCounterOffer =
        selected.uiStatus === "rejected" &&
        sameUserId(selected.ex.ownerId, user?.id);
      const created = shouldCreateCounterOffer
        ? await createCounterOffer(token, selected.ex.id, payload)
        : await createExchangeRequest(token, selected.ex.skillId, payload);
      try {
        sessionStorage.setItem(OPEN_EXCHANGE_KEY, created.id);
      } catch {
        /* ignore */
      }
      setBookOpen(false);
      const next = await loadList();
      if (shouldCreateCounterOffer) {
        focusExchangeAfterList(next, created.id);
      } else {
        setSelectedOtherUserId(getOtherUserId(created, user?.id));
        setActiveExchangeId(created.id);
      }
    } catch (e) {
      setSendError(apiErrorDisplayMessage(e, m.actionError));
    } finally {
      setBookSubmitting(false);
    }
  };

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="pt-20 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-[calc(100vh-7rem)]">
          <Card className="flex h-full flex-row overflow-hidden rounded-2xl border-0 shadow-lg">
            <div className="flex w-96 shrink-0 flex-col border-r border-border">
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

              <div className="flex-1 overflow-y-auto">
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
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                          aria-hidden
                        >
                          {initialsFromFullName(conv.otherName)}
                        </div>

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

                          {conv.listUiStatus === "pending-incoming" && (
                            <Badge variant="secondary" className="mt-2">
                              {m.pendingRequest}
                            </Badge>
                          )}
                          {conv.listUiStatus === "pending-outgoing" && (
                            <Badge variant="outline" className="mt-2">
                              {m.waitingApproval}
                            </Badge>
                          )}
                          {conv.listUiStatus === "rejected" && (
                            <Badge variant="destructive" className="mt-2">
                              {m.rejectedBadge}
                            </Badge>
                          )}
                          {conv.listUiStatus === "accepted" && (
                            <Badge className="mt-2 bg-emerald-600/90 text-white">
                              {m.acceptedBadge}
                            </Badge>
                          )}
                          {conv.listUiStatus === "cancelled" && (
                            <Badge variant="secondary" className="mt-2">
                              {m.cancelledBadge}
                            </Badge>
                          )}
                          {conv.listUiStatus === "completed" && (
                            <Badge className="mt-2">{m.completedBadge}</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                  })
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
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
                        onClick={openOtherProfile}
                        className="flex min-w-0 max-w-full items-center gap-3 rounded-lg p-0 text-left transition hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title={m.viewMemberProfileTitle}
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                          aria-hidden
                        >
                          {initialsFromFullName(selected.otherName)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-foreground">
                            {selected.otherName}
                          </h3>
                          <p className="truncate text-xs text-muted-foreground">
                            {selected.ex.skillTitle}
                          </p>
                        </div>
                      </button>
                      {selected.row.exchanges.length > 1 && activeExchangeId ? (
                        <div className="w-full min-w-0 sm:max-w-sm sm:shrink-0">
                          <Label
                            className="mb-1 block text-xs text-muted-foreground"
                            htmlFor="msg-active-exchange"
                          >
                            {m.threadSessionLabel}
                          </Label>
                          <Select
                            value={activeExchangeId}
                            onValueChange={setActiveExchangeId}
                          >
                            <SelectTrigger
                              id="msg-active-exchange"
                              className="w-full"
                              size="sm"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className="z-[1100]"
                              position="popper"
                            >
                              {selected.row.exchanges.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.skillTitle} · {e.bookedMinutes} min ·{" "}
                                  {new Date(e.createdAt).toLocaleString(
                                    locale === "tr" ? "tr-TR" : "en-US",
                                    { dateStyle: "short" },
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {sendError ? (
                    <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                      {sendError}
                    </div>
                  ) : null}

                  {selected.uiStatus === "pending-incoming" && (
                    <div className="border-b border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/40">
                      <p className="mb-3 text-sm text-foreground/90">
                        {formatTemplate(m.wantsConnect, {
                          name: selected.otherName,
                        })}
                      </p>
                      <div className="mb-3 space-y-1 text-sm text-foreground/80">
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
                      <div className="flex gap-2">
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
                          onClick={() => void handleReject(selected.ex.id)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          {m.decline}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
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
                    <div className="border-b border-yellow-100 bg-yellow-50 p-4 dark:border-yellow-900/40 dark:bg-yellow-950/30">
                      <p className="text-sm text-foreground/90">
                        {formatTemplate(m.waitingOutgoing, {
                          name: selected.otherName,
                        })}
                      </p>
                      {canCancelSelected ? (
                        <div className="mt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-600/50 text-amber-900 dark:text-amber-200"
                            onClick={() => setCancelOpen(true)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            {m.cancelPending}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {selected.uiStatus === "accepted" && (
                    <div className="border-b border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <p className="text-sm text-foreground/90">{m.acceptedSessionHint}</p>
                      {canMarkCompleteSelected ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {m.instructorMarkCompleteHint}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canMarkCompleteSelected ? (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => void handleMarkComplete()}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            {m.markSessionComplete}
                          </Button>
                        ) : null}
                        {canCancelSelected ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => setCancelOpen(true)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            {m.cancelSession}
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

                  {selected.uiStatus === "rejected" && (
                    <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      <p>{m.rejectedHint}</p>
                      {canCreateNewOffer ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={openBookModal}
                        >
                          <CalendarPlus className="mr-1 h-4 w-4" />
                          {m.createBooking}
                        </Button>
                      ) : null}
                    </div>
                  )}

                  {selected.uiStatus === "completed" && (
                    <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                      {m.sessionCompletedHint}
                    </div>
                  )}

                  <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
                        </div>
                      ))
                    )}
                  </div>

                  {isMessageEnabledStatus(selected.ex.status) ||
                  (isPendingExchangeStatus(selected.ex.status) &&
                    Boolean(selected.ex.pendingFromOwner)) ? (
                    <div className="border-t border-border p-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder={m.typeMessage}
                          value={messageText}
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
                          disabled={!messageText.trim()}
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
      <Modal open={cancelOpen} onOpenChange={setCancelOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{m.cancelConfirmTitle}</ModalTitle>
            <ModalDescription>
              <span className="whitespace-pre-line block text-sm text-muted-foreground">
                {m.cancelConfirmBody}
              </span>
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
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

      <Modal open={bookOpen} onOpenChange={setBookOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{m.bookModalTitle}</ModalTitle>
          </ModalHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {formatTemplate(m.bookHint, {
                minutes: String(selected?.ex.bookedMinutes ?? 0),
              })}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  onChange={(e) => setBookTime(e.target.value)}
                />
              </div>
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
            <Button variant="outline" onClick={() => setBookOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              onClick={() => void handleCreateBooking()}
              disabled={bookSubmitting}
            >
              {bookSubmitting ? t.common.loading : m.bookSubmit}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageLayout>
  );
}
