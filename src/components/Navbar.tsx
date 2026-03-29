import { useState } from "react";
import { motion } from "framer-motion";

const Navbar = () => {
  const [lang, setLang] = useState<"EN" | "UA">("EN");

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <span className="text-xl font-bold tracking-tighter text-foreground">
          GLOBAL<span className="text-primary">.</span>GATEWAY
        </span>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setLang(lang === "EN" ? "UA" : "EN")}
            className="text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            {lang === "EN" ? "EN / UA" : "UA / EN"}
          </button>
          <a
            href="#"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:brightness-110"
          >
            Client Portal
          </a>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
