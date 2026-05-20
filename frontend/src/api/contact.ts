import { apiFetch, apiErrorDisplayMessage } from "./client";

export type ContactFormPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export async function submitContactForm(payload: ContactFormPayload): Promise<void> {
  await apiFetch<unknown>("/api/public/contact", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 30_000,
  });
}

export function contactFormErrorMessage(err: unknown, fallback: string): string {
  return apiErrorDisplayMessage(err, fallback);
}
