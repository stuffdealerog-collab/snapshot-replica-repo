import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Circle, Upload } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const steps = [
  { label: "Initial Review", status: "completed" },
  { label: "Document Verification", status: "current" },
  { label: "Gov Submission", status: "pending" },
  { label: "Final Approval", status: "pending" },
];

const Portal = () => {
  const [uploaded, setUploaded] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="px-6 pt-28 pb-20">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Header */}
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-gradient text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Client Portal
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Application ID: <span className="font-mono text-foreground">#VS-89021-X</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Logged In
              </span>
            </div>

            {/* Status Stepper */}
            <div className="glass rounded-2xl p-8 mb-8">
              <h2 className="mb-6 text-lg font-bold text-foreground">Application Status</h2>
              <div className="space-y-0">
                {steps.map((step, i) => (
                  <div key={step.label} className="flex gap-4">
                    {/* Timeline line & dot */}
                    <div className="flex flex-col items-center">
                      {step.status === "completed" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : step.status === "current" ? (
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary">
                          <span className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border">
                          <Circle className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      {i < steps.length - 1 && (
                        <div
                          className={`w-px flex-1 min-h-[32px] ${
                            step.status === "completed" ? "bg-primary/40" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-8">
                      <p
                        className={`text-sm font-semibold ${
                          step.status === "pending" ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        Step {i + 1}: {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{step.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Needed */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass rounded-2xl border-accent/20 p-8"
            >
              <h2 className="mb-2 text-lg font-bold text-accent">Action Required</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Please upload a scan of your passport bio page to proceed with verification.
              </p>

              <div
                onClick={() => setUploaded(true)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-300 ${
                  uploaded
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                {uploaded ? (
                  <>
                    <Check className="mb-2 h-8 w-8 text-primary" />
                    <p className="text-sm font-medium text-primary">passport_scan.pdf uploaded</p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG — max 10MB</p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Portal;
