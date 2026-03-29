import { useLang } from "@/lib/LangContext";

const Footer = () => {
  const { t } = useLang();

  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="container mx-auto flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-muted-foreground">{t("footer.copy")}</p>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("footer.privacy")}</a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("footer.terms")}</a>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground/50">{t("footer.powered")}</p>
    </footer>
  );
};

export default Footer;
