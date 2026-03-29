// Mock API service layer — swap with real FastAPI endpoints later

export const basePrices: Record<string, Record<string, number>> = {
  USA: { Tourism: 450, Work: 610 },
  Canada: { Tourism: 380, Work: 520 },
  UK: { Tourism: 360, Work: 490 },
  Australia: { Tourism: 400, Work: 560 },
};

export const destinations = ["USA", "Canada", "UK", "Australia"] as const;
export const purposes = ["Tourism", "Work"] as const;

export const destinationFlags: Record<string, string> = {
  USA: "🇺🇸",
  Canada: "🇨🇦",
  UK: "🇬🇧",
  Australia: "🇦🇺",
};

export const wallets = {
  USDT: { address: "TXrk...5vQ9z8pFgJ2n", amount: "860.00 USDT" },
  BTC: { address: "bc1q...xk4r9m7z3", amount: "0.01323 BTC" },
};

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
  const expressFee = express ? 150 : 0;
  return { base, expressFee, total: base + expressFee };
}

// Chat flow messages
export function getChatMessages(name: string, country: string, type: string) {
  return [
    {
      role: "bot" as const,
      text: `Welcome, ${name}! 👋 I'm your AI visa consultant. I'll help prepare your application for a ${country} ${type} visa. Let's get started — this will only take a few minutes.`,
    },
    {
      role: "bot" as const,
      text: "First, what is the primary purpose of your trip? For example: vacation, visiting family, business meetings, employment contract, etc.",
      expectsInput: true,
    },
    {
      role: "bot" as const,
      text: `Great. And approximately how long do you plan to stay in ${country}?`,
      expectsInput: true,
    },
    {
      role: "bot" as const,
      text: "Perfect. Have you traveled internationally in the last 3 years? If so, which countries?",
      expectsInput: true,
    },
    {
      role: "bot" as const,
      text: "Thanks for sharing that. Now I need to understand your situation a bit better to build the strongest possible application.",
    },
    {
      role: "bot" as const,
      text: "Can you briefly explain why you need this visa and what your plans are upon arrival? The more detail you provide, the better we can prepare your case.",
      expectsInput: true,
    },
    {
      role: "bot" as const,
      text: "Excellent. One more thing — do you currently have a job or business that you'll be returning to? This helps demonstrate ties to your home country.",
      expectsInput: true,
    },
    {
      role: "bot" as const,
      text: "Thank you! I've reviewed your information and your case looks solid. ✅",
    },
    {
      role: "bot" as const,
      text: "I'm now generating your payment invoice. Once paid, our specialists will begin processing your visa immediately.",
    },
    {
      role: "bot" as const,
      text: "__LOADING__",
    },
    {
      role: "bot" as const,
      text: "__INVOICE__",
    },
  ];
}
