import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, Copy } from "lucide-react";

type PaymentMethod = "USDT" | "BTC";

const wallets: Record<PaymentMethod, { address: string; amount: string }> = {
  USDT: { address: "TXrk...5vQ9z8pFgJ2n", amount: "760.00 USDT" },
  BTC: { address: "bc1q...xk4r9m7z3", amount: "0.01168 BTC" },
};

const CryptoCheckout = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [method, setMethod] = useState<PaymentMethod>("USDT");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [copied, setCopied] = useState(false);

  // Countdown
  useEffect(() => {
    if (!revealed || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [revealed, timeLeft]);

  // Reveal after loading
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => {
        setLoading(false);
        setRevealed(true);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleSelect = (m: PaymentMethod) => {
    setMethod(m);
    setRevealed(false);
    setLoading(true);
    setVerifying(false);
    setVerified(false);
    setTimeLeft(30 * 60);
  };

  const handleSent = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(wallets[method].address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="glass relative w-full max-w-md rounded-2xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>

          <h2 className="mb-1 text-xl font-bold text-foreground">Checkout</h2>
          <p className="mb-6 text-sm text-muted-foreground">Express US Work Visa — Total: $760.00 USD</p>

          {/* Method Toggle */}
          <div className="mb-6 grid grid-cols-2 gap-2">
            {(["USDT", "BTC"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleSelect(m)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  method === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {m === "USDT" ? "USDT (TRC-20)" : "Bitcoin (BTC)"}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Generating payment details...</p>
            </div>
          )}

          {revealed && !verifying && !verified && (
            <div className="space-y-5">
              {/* Mock QR */}
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl border border-border bg-foreground/5">
                <div className="grid grid-cols-5 gap-1">
                  {[...Array(25)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-5 w-5 rounded-sm ${Math.random() > 0.4 ? "bg-foreground" : "bg-transparent"}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Send exactly</p>
                <p className="text-lg font-bold text-accent">{wallets[method].amount}</p>
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">To wallet address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground font-mono">
                    {wallets[method].address}
                  </code>
                  <button onClick={handleCopy} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">Price locked for</p>
                <p className="font-mono text-2xl font-bold text-foreground">00:{mm}:{ss}</p>
              </div>

              <button
                onClick={handleSent}
                className="glow-primary w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all duration-300 hover:scale-[1.02]"
              >
                I Have Sent The Payment
              </button>
            </div>
          )}

          {verifying && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Verifying on Blockchain...</p>
            </div>
          )}

          {verified && (
            <div className="flex flex-col items-center py-10">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">Payment Confirmed</p>
              <p className="mt-1 text-sm text-muted-foreground">Your application is being processed.</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CryptoCheckout;
