import { createContext, useContext, useState, type ReactNode } from "react";
import { i18n, type Lang } from "./i18n";

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>("en");
  const t = (key: string) => i18n[lang][key] ?? key;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
