import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Send, Check, X, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { formatTemplate } from "../language";
import {
  acceptExchangeRequest,
  fetchExchangeMessages,
  fetchReceivedExchangeRequests,
  fetchSentExchangeRequests,
  postExchangeMessage,
  rejectExchangeRequest,
  type ExchangeMessageDto,
  type ExchangeRequestDto,
} from "../api/exchange";
import { apiErrorDisplayMessage } from "../api/client";
import { initialsFromFullName } from "../lib/initials";

interface MessagesPageProps {
  onNavigate?: (page: PageType) => void;
}

const OPEN_EXCHANGE_KEY = "timelink_open_exchange";

type UiStatus =
  | "pending-incoming"
  | "pending-outgoing"
  | "accepted"
  | "rejected"
  | "completed";

type ConversationRow = {
  id: string;
  ex: ExchangeRequestDto;
  otherName: string;
  uiStatus: UiStatus;
  lastPreview: string;
  sortTime: number;
};

function normalizeExchangeStatus(status: string | undefined): string {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

function isPendingExchangeStatus(status: string | undefined): boolean {
  return normalizeExchangeStatus(status) === "PENDING";
}

function isAcceptedExchangeStatus(status: string | undefined): boolean {
  return normalizeExchangeStatus(status) === "ACCEPTED";
}

function sameUserId(a: string | undefined, b: string | undefined): boolean {
  if (a == null || b == null) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function toUiStatus(
  ex: ExchangeRequestDto,
  myId: string | undefined,
): UiStatus {
  const st = normalizeExchangeStatus(ex.status);
  if (st === "ACCEPTED") return "accepted";
  if (st === "REJECTED") return "rejected";
  if (st === "COMPLETED") return "completed";
  if (st === "PENDING") {
    if (!myId) return "pending-outgoing";
    return sameUserId(ex.requesterId, myId)
      ? "pending-outgoing"
      : "pending-incoming";
  }
  return "completed";
}

function mergeExchanges(
  sent: ExchangeRequestDto[],
  received: ExchangeRequestDto[],
  myId: string | undefined,
): ConversationRow[] {
  const map = new Map<string, ExchangeRequestDto>();
  for (const e of sent) map.set(e.id, e);
  for (const e of received) map.set(e.id, e);
  const rows: ConversationRow[] = [];
  for (const ex of map.values()) {
    const otherName = sameUserId(ex.requesterId, myId)
      ? ex.ownerName
      : ex.requesterName;
    rows.push({
      id: ex.id,
      ex,
      otherName,
      uiStatus: toUiStatus(ex, myId),
      lastPreview:
        ex.message.length > 100
          ? `${ex.message.slice(0, 100)}…`
          : ex.message,
      sortTime: new Date(ex.createdAt).getTime(),
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

export function MessagesPage({ onNavigate }: MessagesPageProps) {
  const { t, locale } = useLanguage();
  const m = t.messagesPage;
  const { user, token } = useAuth();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [threadLines, setThreadLines] = useState<ThreadLine[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!token) {
      setRows([]);
      return;
    }
    setLoadingList(true);
    try {
      const [sent, received] = await Promise.all([
        fetchSentExchangeRequests(token),
        fetchReceivedExchangeRequests(token),
      ]);
      setRows(mergeExchanges(sent, received, user?.id));
    } catch {
      setRows([]);
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
        setSelectedId(open);
        sessionStorage.removeItem(OPEN_EXCHANGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const loadThread = useCallback(
    async (row: ConversationRow | null) => {
      if (!token || !row) {
        setThreadLines([]);
        return;
      }
      setLoadingThread(true);
      setSendError(null);
      try {
        const ex = row.ex;
        const initial: ThreadLine = {
          id: `initial-${ex.id}`,
          sender: sameUserId(ex.requesterId, user?.id) ? "me" : "other",
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
    if (selected) void loadThread(selected);
  }, [selected, loadThread]);

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.otherName.toLowerCase().includes(q) ||
      r.ex.skillTitle.toLowerCase().includes(q) ||
      r.lastPreview.toLowerCase().includes(q)
    );
  });

  const handleAccept = async (id: string) => {
    if (!token) return;
    try {
      await acceptExchangeRequest(token, id);
      await loadList();
      setSelectedId(id);
    } catch (e) {
      setSendError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    try {
      await rejectExchangeRequest(token, id);
      await loadList();
    } catch (e) {
      setSendError(apiErrorDisplayMessage(e, m.actionError));
    }
  };

  const handleSend = async () => {
    if (!token || !selected || !messageText.trim()) return;
    if (!isAcceptedExchangeStatus(selected.ex.status)) return;
    setSendError(null);
    try {
      await postExchangeMessage(token, selected.id, messageText.trim());
      setMessageText("");
      await loadThread(selected);
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
                  filteredRows.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full border-b border-border p-4 text-left transition-colors hover:bg-accent/50 ${
                        selectedId === conv.id ? "bg-primary/10" : ""
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
                              {new Date(conv.ex.createdAt).toLocaleDateString(
                                locale === "tr" ? "tr-TR" : "en-US",
                              )}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {conv.ex.skillTitle} · {conv.ex.bookedMinutes} min
                          </p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {conv.lastPreview}
                          </p>

                          {conv.uiStatus === "pending-incoming" && (
                            <Badge variant="secondary" className="mt-2">
                              {m.pendingRequest}
                            </Badge>
                          )}
                          {conv.uiStatus === "pending-outgoing" && (
                            <Badge variant="outline" className="mt-2">
                              {m.waitingApproval}
                            </Badge>
                          )}
                          {conv.uiStatus === "rejected" && (
                            <Badge variant="destructive" className="mt-2">
                              {m.rejectedBadge}
                            </Badge>
                          )}
                          {conv.uiStatus === "completed" && (
                            <Badge className="mt-2">{m.completedBadge}</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
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
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                        aria-hidden
                      >
                        {initialsFromFullName(selected.otherName)}
                      </div>
                      <div>
                        <h3 className="text-foreground">{selected.otherName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {selected.ex.skillTitle}
                        </p>
                      </div>
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
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                          onClick={() => void handleAccept(selected.id)}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          {m.accept}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleReject(selected.id)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          {m.decline}
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
                    </div>
                  )}

                  {selected.uiStatus === "rejected" && (
                    <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                      {m.rejectedHint}
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

                  {isAcceptedExchangeStatus(selected.ex.status) ? (
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
    </PageLayout>
  );
}
