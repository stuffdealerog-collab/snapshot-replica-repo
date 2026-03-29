import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CryptoCheckout from "@/components/CryptoCheckout";

const destinations = ["USA", "Canada", "UK", "Australia"] as const;
const purposes = ["Tourism", "Work"] as const;

const basePrices: Record<string, Record<string, number>> = {
  USA: { Tourism: 450, Work: 610 },
  Canada: { Tourism: 380, Work: 520 },
  UK: { Tourism: 360, Work: 490 },
  Australia: { Tourism: 400, Work: 560 },
};

const Pricing = () => {
  const [destination, setDestination] = useState<string>("USA");
  const [purpose, setPurpose] = useState<string>("Work");
  const [express, setExpress] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const base = basePrices[destination]?.[purpose] ?? 500;
  const expressFee = express ? 150 : 0;
  const total = base + expressFee;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="relative flex min-h-screen items-center justify-center px-6 pt-24 pb-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-1/4 top-1/4 h-[400px] w-[400px] animate-float rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto w-full max-w-xl"
        >
          <h1 className="text-gradient mb-2 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
            Pricing Calculator
          </h1>
          <p className="mb-12 text-center text-muted-foreground">
            Select your destination and purpose to get an instant quote.
          </p>

          <div className="glass rounded-2xl p-8 space-y-8">
            {/* Destination */}
            <div>
              <label className="mb-3 block text-sm font-medium text-muted-foreground">Destination</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {destinations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDestination(d)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                      destination === d
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="mb-3 block text-sm font-medium text-muted-foreground">Purpose</label>
              <div className="grid grid-cols-2 gap-2">
                {purposes.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPurpose(p)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                      purpose === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Base Processing Cost</span>
                <span className="text-foreground font-medium">${base}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Standard Fee</span>
                <span className="text-foreground font-medium">Included</span>
              </div>

              {/* Express Toggle */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Premium Express Handling</span>
                <button
                  onClick={() => setExpress(!express)}
                  className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${
                    express ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-foreground transition-transform duration-300 ${
                      express ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
              {express && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Express Surcharge</span>
                  <span className="text-accent font-medium">+$150</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-border pt-6">
              <div className="flex items-end justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={total}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-3xl font-extrabold text-foreground"
                  >
                    ${total}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            <button
              onClick={() => setCheckoutOpen(true)}
              className="glow-primary glow-pulse mt-4 block w-full rounded-xl bg-primary py-4 text-center text-lg font-bold text-primary-foreground transition-all duration-300 hover:scale-[1.02]"
            >
              Proceed to Application
            </button>
          </div>
        </motion.div>
      </section>
      <CryptoCheckout open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <Footer />
    </div>
  );
};

export default Pricing;
