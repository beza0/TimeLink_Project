import { apiFetch } from "./client";

export type ExchangeRequestDto = {
  id: string;
  skillId: string;
  skillTitle: string;
  requesterId: string;
  requesterName: string;
  ownerId: string;
  ownerName: string;
  message: string;
  bookedMinutes: number;
  /** ISO-8601 instant */
  scheduledStartAt?: string | null;
  pendingFromOwner?: boolean;
  status: string;
  createdAt: string;
  sessionMeetingUrl?: string | null;
  requesterAttendanceAckAt?: string | null;
  ownerAttendanceAckAt?: string | null;
};

export type ExchangeMessageDto = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export function createExchangeRequest(
  token: string,
  skillId: string,
  body: {
    message: string;
    bookedMinutes: number;
    scheduledStartAt: string;
  },
) {
  return apiFetch<ExchangeRequestDto>(
    `/api/exchange-requests/skill/${skillId}`,
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    },
  );
}

export function fetchSentExchangeRequests(token: string) {
  return apiFetch<ExchangeRequestDto[]>("/api/exchange-requests/sent", {
    method: "GET",
    token,
  });
}

export function fetchReceivedExchangeRequests(token: string) {
  return apiFetch<ExchangeRequestDto[]>("/api/exchange-requests/received", {
    method: "GET",
    token,
  });
}

export function fetchExchangeMessages(token: string, exchangeRequestId: string) {
  return apiFetch<ExchangeMessageDto[]>(
    `/api/exchange-requests/${exchangeRequestId}/messages`,
    { method: "GET", token },
  );
}

export function postExchangeMessage(
  token: string,
  exchangeRequestId: string,
  body: string,
) {
  return apiFetch<ExchangeMessageDto>(
    `/api/exchange-requests/${exchangeRequestId}/messages`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ body }),
    },
  );
}

export function acceptExchangeRequest(token: string, requestId: string) {
  return apiFetch<ExchangeRequestDto>(
    `/api/exchange-requests/${requestId}/accept`,
    { method: "PUT", token },
  );
}

export function rejectExchangeRequest(token: string, requestId: string) {
  return apiFetch<ExchangeRequestDto>(
    `/api/exchange-requests/${requestId}/reject`,
    { method: "PUT", token },
  );
}

export function cancelExchangeRequest(token: string, requestId: string) {
  return apiFetch<ExchangeRequestDto>(
    `/api/exchange-requests/${requestId}/cancel`,
    { method: "PUT", token },
  );
}

export function createCounterOffer(
  token: string,
  requestId: string,
  body: {
    message: string;
    bookedMinutes: number;
    scheduledStartAt: string;
  },
) {
  return apiFetch<ExchangeRequestDto>(
    `/api/exchange-requests/${requestId}/counter-offer`,
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    },
  );
}

export function updateExchangeSessionMeeting(
  token: string,
  exchangeId: string,
  meetingUrl: string,
) {
  return apiFetch<ExchangeRequestDto>(
    `/api/exchange-requests/${encodeURIComponent(exchangeId)}/meeting`,
    {
      method: "PUT",
      token,
      body: JSON.stringify({ meetingUrl: meetingUrl.trim() }),
    },
  );
}

export function acknowledgeRequesterAttendance(
  token: string,
  exchangeId: string,
) {
  return apiFetch<ExchangeRequestDto>(
    `/api/exchange-requests/${encodeURIComponent(exchangeId)}/ack-attendance`,
    {
      method: "POST",
      token,
    },
  );
}

export function acknowledgeOwnerAttendance(token: string, exchangeId: string) {
  return apiFetch<ExchangeRequestDto>(
    `/api/exchange-requests/${encodeURIComponent(exchangeId)}/ack-owner-attendance`,
    {
      method: "POST",
      token,
    },
  );
}
