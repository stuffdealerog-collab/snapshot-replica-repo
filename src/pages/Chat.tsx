import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useLang } from "@/lib/LangContext";
import { useApp } from "@/lib/AppContext";
import { calculateTotal, sendChatMessage, type ChatMessage } from "@/lib/api";
import { toast } from "sonner";

type DisplayMessage = { role: "specialist" | "user"; text: string };

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
  const { applicationData, applicationId, invoiceId, setInvoiceId } = useApp();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  const name = applicationData?.fullName || "User";
  const country = applicationData?.destination || "USA";
  const purpose = applicationData?.purpose || "Work";
  const express = applicationData?.express || false;
  const { base, fee, expressFee: expressAdd, total } = calculateTotal(country, purpose, express);

  const [messages, setMessages] = useState<DisplayMessage[]>(() => {
    const saved = sessionStorage.getItem(`chat_msg_${applicationId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem(`chat_hist_${applicationId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  
  const [consultationDone, setConsultationDone] = useState<boolean>(() => {
    const saved = sessionStorage.getItem(`chat_done_${applicationId}`);
    return saved ? JSON.parse(saved) : false;
  });
  const [inputEnabled, setInputEnabled] = useState(!consultationDone && messages.length > 0);
  
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(() => {
    const saved = sessionStorage.getItem(`chat_inv_${applicationId}`);
    return saved ? JSON.parse(saved) : (invoiceId || null);
  });
  const [shareToken, setShareToken] = useState<string | null>(() => {
    const saved = sessionStorage.getItem(`chat_token_${applicationId}`);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    sessionStorage.setItem(`chat_msg_${applicationId}`, JSON.stringify(messages));
    sessionStorage.setItem(`chat_hist_${applicationId}`, JSON.stringify(chatHistory));
    sessionStorage.setItem(`chat_done_${applicationId}`, JSON.stringify(consultationDone));
    sessionStorage.setItem(`chat_inv_${applicationId}`, JSON.stringify(generatedInvoiceId));
    sessionStorage.setItem(`chat_token_${applicationId}`, JSON.stringify(shareToken));
  }, [messages, chatHistory, consultationDone, generatedInvoiceId, shareToken, applicationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Send the first empty message to start the consultation if no history exists
  useEffect(() => {
    if (messages.length > 0) return; // Prevent restarting if loaded from storage
    
    const startConsultation = async () => {
      setTyping(true);
      try {
        const initialHistory: ChatMessage[] = [
          { role: "user", content: `Hi, my name is ${name}. I want to apply for a ${country} ${purpose} visa.` },
        ];

        const response = await sendChatMessage(
          applicationId,
          initialHistory,
          country,
          purpose,
          name
        );

        setChatHistory([
          ...initialHistory,
          { role: "assistant", content: response.reply },
        ]);

        // Show the specialist's reply
        setMessages([
          { role: "specialist", text: response.reply },
        ]);

        setInputEnabled(true);
      } catch (err) {
        console.error("Failed to start consultation:", err);
        setMessages([
          { role: "specialist", text: `Welcome, ${name}! 👋 I'm your visa specialist. I'll help prepare your application for a ${country} ${purpose} visa. Let's get started — what is the primary purpose of your trip?` },
        ]);
        setInputEnabled(true);
      } finally {
        setTyping(false);
      }
    };

    startConsultation();
  }, [applicationId, country, name, purpose, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !inputEnabled || consultationDone) return;

    const userText = input.trim();
    setInput("");
    setInputEnabled(false);

    // Display user message
    setMessages((prev) => [...prev, { role: "user", text: userText }]);

    // Add to chat history
    const newHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "user", content: userText },
    ];

    // Show typing indicator
    setTyping(true);

    try {
      const response = await sendChatMessage(
        applicationId,
        newHistory,
        country,
        purpose,
        name
      );

      // Update history with specialist response
      setChatHistory([
        ...newHistory,
        { role: "assistant", content: response.reply },
      ]);

      // Show specialist reply
      setMessages((prev) => [...prev, { role: "specialist", text: response.reply }]);

      if (response.consultation_complete && response.invoice_id) {
        setConsultationDone(true);
        setGeneratedInvoiceId(response.invoice_id);
        if (response.share_token) setShareToken(response.share_token);
        if (setInvoiceId) setInvoiceId(response.invoice_id);

        // Show the invoice card after a short delay
        setTimeout(() => {
          setMessages((prev) => [...prev, { role: "specialist", text: "__INVOICE__" }]);
        }, 1500);
      } else {
        setInputEnabled(true);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "specialist", text: "I'm sorry, there was a connection issue. Please try sending your message again." },
      ]);
      setInputEnabled(true);
    } finally {
      setTyping(false);
    }
  };

  const currentInvoiceId = generatedInvoiceId || invoiceId;

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
                {msg.role === "specialist" && msg.text !== "__INVOICE__" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}

                {msg.text === "__INVOICE__" ? (
                  <div className="w-full max-w-sm">
                    <div className="glass rounded-2xl p-6 border border-primary/20">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{t("chat.invoice.title")}</p>
                      <p className="mb-4 text-sm font-bold text-foreground">#{currentInvoiceId}</p>
                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex justify-between"><span className="text-muted-foreground">{country} {purpose} Visa — Base</span><span className="text-foreground">${base}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Processing Fee</span><span className="text-foreground">${fee}</span></div>
                        {express && <div className="flex justify-between"><span className="text-muted-foreground">Express Handling</span><span className="text-accent">${expressAdd}</span></div>}
                        <div className="flex justify-between border-t border-border pt-2 font-bold"><span className="text-foreground">{t("pricing.total")}</span><span className="text-foreground">${total}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/invoice/${shareToken || currentInvoiceId}`)}
                          className="flex-1 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:brightness-110 transition-all"
                        >
                          {t("chat.invoice.pay")}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/invoice/${shareToken || currentInvoiceId}`);
                            toast.success("Link copied to clipboard!");
                          }}
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
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="glass rounded-2xl rounded-bl-md">
                <TypingIndicator />
              </div>
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
            placeholder={consultationDone ? "Consultation complete ✅" : t("chat.placeholder")}
            disabled={!inputEnabled || consultationDone}
            className="flex-1 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none disabled:opacity-50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!inputEnabled || !input.trim() || consultationDone}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="pb-2 text-center text-[10px] text-muted-foreground/50">Secure consultation · End-to-end encrypted</p>
      </div>
    </div>
  );
};

export default Chat;
