/**
 * src/context/LanguageContext.tsx
 * ===============================
 * Context and hook for multilingual support and draft translations.
 * 
 * Complies with Hard Rule 7:
 * Every non-English language is explicitly marked as draft and tagged with
 * "(draft — needs native-speaker review)".
 */

import React, { createContext, useContext, useState } from 'react';
import {
  type SupportedLocale,
  type LanguageOption,
  type Translations,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  DRAFT_DISCLAIMER,
} from '@/config/i18nDrafts';

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  currentLanguage: LanguageOption;
  isDraft: boolean;
  disclaimer: string;
  t: (key: keyof Translations) => string;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'tm-language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
      if (saved && (saved === 'en' || saved === 'pcm' || saved === 'yo' || saved === 'ig' || saved === 'ha')) {
        return saved;
      }
    }
    return 'en';
  });

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
  };

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === locale) || SUPPORTED_LANGUAGES[0];

  const isDraft = currentLanguage.isDraft;

  const t = (key: keyof Translations): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || '';
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        currentLanguage,
        isDraft,
        disclaimer: DRAFT_DISCLAIMER,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
