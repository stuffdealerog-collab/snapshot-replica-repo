import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const Navbar = () => {
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-bold tracking-tighter text-foreground">
          VISA<span className="text-primary">.</span>GATEWAY
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 sm:flex">
          <button
            onClick={() => setLang(lang === "en" ? "ua" : "en")}
            className="text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            {lang === "en" ? "EN / UA" : "UA / EN"}
          </button>
          <Link to="/pricing" className="text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground">
            {t("nav.pricing")}
          </Link>
          <Link
            to="/intake"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:brightness-110"
          >
            {t("nav.start")}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden text-foreground">
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass border-t border-border px-6 py-4 sm:hidden"
        >
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setLang(lang === "en" ? "ua" : "en"); setMenuOpen(false); }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground text-left"
            >
              {lang === "en" ? "EN / UA" : "UA / EN"}
            </button>
            <Link to="/pricing" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {t("nav.pricing")}
            </Link>
            <Link to="/portal" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {t("nav.portal")}
            </Link>
            <Link to="/intake" onClick={() => setMenuOpen(false)} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground text-center">
              {t("nav.start")}
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
