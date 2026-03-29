import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Loader2, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/LangContext";
import { useApp } from "@/lib/AppContext";
import { wallets, calculateTotal } from "@/lib/api";

type PaymentMethod = "USDT" | "BTC";
type PaymentTab = "crypto" | "card";

const Invoice = () => {
  const { t } = useLang();
  const { id } = useParams();
  const { applicationData, applicationId, invoiceId } = useApp();

  const name = applicationData?.fullName || "Applicant";
  const country = applicationData?.destination || "USA";
  const purpose = applicationData?.purpose || "Work";
  const express = applicationData?.express || false;
  const { base, expressFee, total } = calculateTotal(country, purpose, express);

  const [tab, setTab] = useState<PaymentTab>("crypto");
  const [method, setMethod] = useState<PaymentMethod>("USDT");
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  const handleCopy = () => {
    navigator.clipboard.writeText(wallets[method].address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSent = () => {
    setVerifying(true);
    setTimeout(() => { setVerifying(false); setVerified(true); }, 3000);
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
              <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.appId")}</span><span className="font-mono text-foreground">#{applicationId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("invoice.service")}</span><span className="font-medium text-foreground">{country} {purpose} Visa</span></div>
            </div>

            {/* Line items */}
            <div className="space-y-2 border-t border-border pt-4 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{country} {purpose} Visa</span><span className="text-foreground">${base}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Processing Fee</span><span className="text-foreground">$100</span></div>
              {express && <div className="flex justify-between"><span className="text-muted-foreground">Express Handling</span><span className="text-accent">$150</span></div>}
            </div>

            <div className="flex justify-between border-t border-border pt-4 mb-8">
              <span className="text-sm font-medium text-muted-foreground">{t("invoice.total")}</span>
              <span className="text-3xl font-extrabold text-foreground">${total}</span>
            </div>

            {/* Payment tabs */}
            <div className="mb-6 grid grid-cols-2 gap-2">
              <button onClick={() => setTab("crypto")} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all ${tab === "crypto" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {t("invoice.crypto")}
              </button>
              <button onClick={() => setTab("card")} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all ${tab === "card" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {t("invoice.card")}
              </button>
            </div>

            {tab === "card" && (
              <div className="rounded-xl border border-border bg-muted/10 p-6 text-center">
                <p className="text-sm text-muted-foreground">{t("invoice.cardSoon")}</p>
              </div>
            )}

            {tab === "crypto" && !verifying && !verified && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2">
                  {(["USDT", "BTC"] as const).map((m) => (
                    <button key={m} onClick={() => setMethod(m)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${method === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {m === "USDT" ? "USDT (TRC-20)" : "Bitcoin (BTC)"}
                    </button>
                  ))}
                </div>

                {/* QR */}
                <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-xl border border-border bg-foreground/5">
                  <div className="grid grid-cols-5 gap-1">
                    {[...Array(25)].map((_, i) => (
                      <div key={i} className={`h-5 w-5 rounded-sm ${Math.random() > 0.4 ? "bg-foreground" : "bg-transparent"}`} />
                    ))}
                  </div>
                </div>

                <div><p className="mb-1 text-xs text-muted-foreground">Send exactly</p><p className="text-lg font-bold text-accent">{wallets[method].amount}</p></div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">To wallet address</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-foreground">{wallets[method].address}</code>
                    <button onClick={handleCopy} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground transition-colors">
                      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t("invoice.priceLocked")}</p>
                  <p className="font-mono text-2xl font-bold text-foreground">⏱ {mm}:{ss}</p>
                </div>

                <button onClick={handleSent} className="glow-primary w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:scale-[1.02] transition-all">
                  {t("invoice.sent")}
                </button>
              </div>
            )}

            {verifying && (
              <div className="flex flex-col items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">{t("invoice.verifying")}</p></div>
            )}

            {verified && (
              <div className="flex flex-col items-center py-10">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20"><Check className="h-7 w-7 text-primary" /></div>
                <p className="text-lg font-bold text-foreground">{t("invoice.confirmed")}</p>
              </div>
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
        </motion.div>
      </section>
      <Footer />
    </div>
  );
};

export default Invoice;
