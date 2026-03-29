import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useLang } from "@/lib/LangContext";
import { useApp } from "@/lib/AppContext";
import { getChatMessages, calculateTotal } from "@/lib/api";

type Message = { role: "bot" | "user"; text: string };

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="h-2 w-2 rounded-full bg-primary/60"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
      />
    ))}
  </div>
);

const Chat = () => {
  const { t } = useLang();
  const { applicationData, applicationId, invoiceId } = useApp();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  const name = applicationData?.fullName || "User";
  const country = applicationData?.destination || "USA";
  const purpose = applicationData?.purpose || "Work";
  const express = applicationData?.express || false;
  const { base, expressFee, total } = calculateTotal(country, purpose, express);

  const scriptedMessages = getChatMessages(name, country, purpose);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [scriptIndex, setScriptIndex] = useState(0);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, showLoading]);

  // Advance scripted messages
  useEffect(() => {
    if (waitingForInput || scriptIndex >= scriptedMessages.length) return;

    const msg = scriptedMessages[scriptIndex];

    if (msg.text === "__LOADING__") {
      setShowLoading(true);
      const t = setTimeout(() => {
        setShowLoading(false);
        setScriptIndex((i) => i + 1);
      }, 2000);
      return () => clearTimeout(t);
    }

    if (msg.text === "__INVOICE__") {
      setMessages((prev) => [...prev, { role: "bot", text: "__INVOICE__" }]);
      return;
    }

    setTyping(true);
    const delay = msg.text.length > 100 ? 2000 : 1200;
    const t = setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { role: "bot", text: msg.text }]);
      if (msg.expectsInput) {
        setWaitingForInput(true);
      } else {
        setScriptIndex((i) => i + 1);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [scriptIndex, waitingForInput]);

  const handleSend = () => {
    if (!input.trim() || !waitingForInput) return;
    setMessages((prev) => [...prev, { role: "user", text: input.trim() }]);
    setInput("");
    setWaitingForInput(false);
    setScriptIndex((i) => i + 1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      {/* Info bar */}
      <div className="fixed top-[73px] left-0 right-0 z-40 glass border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-6 py-2 text-xs">
          <span className="text-muted-foreground">Application <span className="font-mono text-foreground">#{applicationId}</span></span>
          <span className="text-muted-foreground">{country} {purpose} Visa</span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-[130px] pb-24">
        <div className="mx-auto max-w-2xl space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && msg.text !== "__INVOICE__" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                {msg.text === "__INVOICE__" ? (
                  <div className="w-full max-w-sm">
                    <div className="glass rounded-2xl p-6 border border-primary/20">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{t("chat.invoice.title")}</p>
                      <p className="mb-4 text-sm font-bold text-foreground">#{invoiceId}</p>
                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex justify-between"><span className="text-muted-foreground">{country} {purpose} Visa — Base</span><span className="text-foreground">${base}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Processing Fee</span><span className="text-foreground">$100</span></div>
                        {express && <div className="flex justify-between"><span className="text-muted-foreground">Express Handling</span><span className="text-accent">$150</span></div>}
                        <div className="flex justify-between border-t border-border pt-2 font-bold"><span className="text-foreground">{t("pricing.total")}</span><span className="text-foreground">${total}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/invoice/${invoiceId}`)}
                          className="flex-1 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:brightness-110 transition-all"
                        >
                          {t("chat.invoice.pay")}
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invoice/${invoiceId}`)}
                          className="flex-1 rounded-lg border border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {t("chat.invoice.share")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "glass rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {typing && (
            <div className="flex items-start">
              <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="glass rounded-2xl rounded-bl-md">
                <TypingIndicator />
              </div>
            </div>
          )}

          {showLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Generating invoice...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t("chat.placeholder")}
            disabled={!waitingForInput}
            className="flex-1 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none disabled:opacity-50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!waitingForInput || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="pb-2 text-center text-[10px] text-muted-foreground/50">{t("chat.powered")}</p>
      </div>
    </div>
  );
};

export default Chat;
