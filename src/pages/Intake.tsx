import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/LangContext";
import { useApp } from "@/lib/AppContext";
import { destinations, purposes, basePrices, destinationFlags, calculateTotal } from "@/lib/api";

const Intake = () => {
  const { t } = useLang();
  const { setApplicationData } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState(params.get("country") || "USA");
  const [purpose, setPurpose] = useState("Tourism");
  const [express, setExpress] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");

  const { base, expressFee, total } = calculateTotal(destination, purpose, express);

  const stepLabels = [t("intake.step1"), t("intake.step2"), t("intake.step3")];

  const canProceedStep2 = fullName && email && phone && nationality && passportNumber;

  const handleConfirm = () => {
    setApplicationData({ destination, purpose, express, fullName, email, phone, nationality, passportNumber });
    navigate("/chat");
  };

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
          {/* Stepper */}
          <div className="mb-10 flex items-center justify-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step > i + 1
                      ? "bg-primary/20 text-primary"
                      : step === i + 1
                      ? "border-2 border-primary text-primary"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`hidden text-xs font-medium sm:inline ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < 2 && <div className={`h-px w-8 ${step > i + 1 ? "bg-primary/40" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-muted-foreground">{t("pricing.destination")}</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {destinations.map((d) => (
                        <button
                          key={d}
                          onClick={() => setDestination(d)}
                          className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                            destination === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {destinationFlags[d]} {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-muted-foreground">{t("pricing.purpose")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {purposes.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPurpose(p)}
                          className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                            purpose === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {p === "Tourism" ? t("pricing.tourism") : t("pricing.work")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border pt-6 mb-6">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("pricing.base")}</span><span className="text-foreground font-medium">${base}</span></div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("pricing.express")}</span>
                      <button onClick={() => setExpress(!express)} className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${express ? "bg-primary" : "bg-muted"}`}>
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-foreground transition-transform duration-300 ${express ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                    {express && <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("pricing.surcharge")}</span><span className="text-accent font-medium">+$150</span></div>}
                    <div className="flex justify-between border-t border-border pt-4"><span className="text-sm text-muted-foreground">{t("pricing.total")}</span><span className="text-2xl font-extrabold text-foreground">${total}</span></div>
                  </div>

                  <button onClick={() => setStep(2)} className="glow-primary glow-pulse w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground transition-all duration-300 hover:scale-[1.02]">
                    {t("intake.next")}
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <div className="space-y-5">
                    {[
                      { label: t("intake.name"), value: fullName, set: setFullName },
                      { label: t("intake.email"), value: email, set: setEmail, type: "email" },
                      { label: t("intake.phone"), value: phone, set: setPhone, type: "tel" },
                      { label: t("intake.nationality"), value: nationality, set: setNationality },
                      { label: t("intake.passport"), value: passportNumber, set: setPassportNumber },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{field.label}</label>
                        <input
                          type={field.type || "text"}
                          value={field.value}
                          onChange={(e) => field.set(e.target.value)}
                          className="w-full rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                          placeholder={field.label}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-border py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      {t("intake.back")}
                    </button>
                    <button
                      onClick={() => canProceedStep2 && setStep(3)}
                      disabled={!canProceedStep2}
                      className="flex-1 glow-primary rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {t("intake.next")}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <h3 className="mb-6 text-lg font-bold text-foreground">{t("intake.step3")}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("pricing.destination")}</span><span className="font-medium text-foreground">{destinationFlags[destination]} {destination}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("pricing.purpose")}</span><span className="font-medium text-foreground">{purpose}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("intake.name")}</span><span className="font-medium text-foreground">{fullName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("intake.email")}</span><span className="font-medium text-foreground">{email}</span></div>
                    {express && <div className="flex justify-between"><span className="text-muted-foreground">{t("pricing.express")}</span><span className="font-medium text-accent">+$150</span></div>}
                    <div className="flex justify-between border-t border-border pt-3"><span className="text-muted-foreground">{t("pricing.total")}</span><span className="text-xl font-extrabold text-foreground">${total}</span></div>
                  </div>
                  <p className="mt-6 text-xs text-muted-foreground">{t("intake.note")}</p>
                  <div className="mt-6 flex gap-3">
                    <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-border py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      {t("intake.back")}
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 glow-primary glow-pulse rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all duration-300 hover:scale-[1.02]"
                    >
                      {t("intake.confirm")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>
      <Footer />
    </div>
  );
};

export default Intake;
