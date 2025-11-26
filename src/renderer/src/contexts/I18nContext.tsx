import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "../locales/en.json";
import ja from "../locales/ja.json";

/* eslint-disable react-refresh/only-export-components */

type Translations = typeof en;
type Language = "en" | "ja";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const translations: Record<Language, Translations> = {
  en,
  ja
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");

  // Load saved language preference on mount
  useEffect(() => {
    const loadLanguage = async (): Promise<void> => {
      try {
        const savedLang = await window.api.getSetting("language");
        if (savedLang && (savedLang === "en" || savedLang === "ja")) {
          setLanguageState(savedLang as Language);
        }
      } catch (err) {
        console.warn("Failed to load language preference", err);
      }
    };
    void loadLanguage();
  }, []);

  // Save language preference when it changes
  const setLanguage = async (lang: Language): Promise<void> => {
    setLanguageState(lang);
    try {
      await window.api.saveSetting("language", lang);
    } catch (err) {
      console.error("Failed to save language preference", err);
    }
  };

  // Translation function with nested key support and parameter interpolation
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} in language ${language}`);
        return key;
      }
    }

    if (typeof value !== "string") {
      console.warn(`Translation key ${key} did not resolve to a string`);
      return key;
    }

    // Replace parameters like {{groupName}}
    if (params) {
      return value.replace(
        /\{\{(\w+)\}\}/g,
        (_, paramKey) => params[paramKey] || `{{${paramKey}}}`
      );
    }

    return value;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
  );
};

export const useTranslation = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
};
