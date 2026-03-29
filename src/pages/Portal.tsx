import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Circle, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLang } from "@/lib/LangContext";
import { useApp } from "@/lib/AppContext";

const Portal = () => {
  const { t } = useLang();
  const { applicationId, applicationData } = useApp();
  const [uploaded, setUploaded] = useState(false);
  const name = applicationData?.fullName || "User";

  const steps = [
    { label: t("portal.step1"), status: "completed" },
    { label: t("portal.step2"), status: "current" },
    { label: t("portal.step3"), status: "pending" },
    { label: t("portal.step4"), status: "pending" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="px-6 pt-28 pb-20">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
            {/* Header */}
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-gradient text-3xl font-extrabold tracking-tight sm:text-4xl">{t("portal.welcome")}, {name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">Application ID: <span className="font-mono text-foreground">#{applicationId}</span></p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {t("portal.loggedIn")}
              </span>
            </div>

            {/* Status Stepper */}
            <div className="glass rounded-2xl p-8 mb-8">
              <h2 className="mb-6 text-lg font-bold text-foreground">{t("portal.status")}</h2>
              <div className="space-y-0">
                {steps.map((step, i) => (
                  <div key={step.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {step.status === "completed" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary"><Check className="h-4 w-4" /></div>
                      ) : step.status === "current" ? (
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary"><span className="h-3 w-3 rounded-full bg-primary animate-pulse" /></div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border"><Circle className="h-3 w-3 text-muted-foreground" /></div>
                      )}
                      {i < steps.length - 1 && <div className={`w-px flex-1 min-h-[32px] ${step.status === "completed" ? "bg-primary/40" : "bg-border"}`} />}
                    </div>
                    <div className="pb-8">
                      <p className={`text-sm font-semibold ${step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                        Step {i + 1}: {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{step.status === "current" ? "In Progress" : step.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Step Detail */}
            <div className="glass rounded-2xl p-8 mb-8">
              <h2 className="mb-2 text-lg font-bold text-foreground">{t("portal.step2")}</h2>
              <p className="text-sm text-muted-foreground">{t("portal.detail")}</p>
            </div>

            {/* Action Required */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} className="glass rounded-2xl border-accent/20 p-8 mb-8">
              <h2 className="mb-2 text-lg font-bold text-accent">{t("portal.action")}</h2>
              <p className="mb-6 text-sm text-muted-foreground">{t("portal.upload")}</p>
              <div
                onClick={() => setUploaded(true)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-300 ${uploaded ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"}`}
              >
                {uploaded ? (
                  <><Check className="mb-2 h-8 w-8 text-primary" /><p className="text-sm font-medium text-primary">{t("portal.uploaded")}</p></>
                ) : (
                  <><Upload className="mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm font-medium text-muted-foreground">{t("portal.dropzone")}</p><p className="mt-1 text-xs text-muted-foreground">{t("portal.formats")}</p></>
                )}
              </div>
            </motion.div>

            {/* Chat history link */}
            <Link to="/chat" className="inline-flex text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              {t("portal.chatHistory")}
            </Link>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Portal;
