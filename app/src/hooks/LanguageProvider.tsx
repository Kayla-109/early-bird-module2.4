import { createContext, useState, useCallback, type ReactNode } from 'react';
import { translations, type Language } from './translations';

interface LanguageContextType {
  lang: Language;
  t: typeof translations.en;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('zh');

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'zh' ? 'en' : 'zh'));
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
  }, []);

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
