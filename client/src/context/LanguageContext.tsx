import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import es from "../locales/es.json";

export type SupportedLanguage = "en" | "hi" | "es";

type Translations = Record<string, any>;

interface LanguageContextType {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    t: (key: string, variables?: Record<string, string | number>) => string;
}

const translations: Record<SupportedLanguage, Translations> = {
    en,
    hi,
    es,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<SupportedLanguage>("en");

    // Load language from localStorage on mount
    useEffect(() => {
        const savedLang = localStorage.getItem("preferredLanguage") as SupportedLanguage;
        if (savedLang && ["en", "hi", "es"].includes(savedLang)) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: SupportedLanguage) => {
        setLanguageState(lang);
        localStorage.setItem("preferredLanguage", lang);
    };

    const t = (key: string, variables?: Record<string, string | number>): string => {
        const keys = key.split(".");
        let value: any = translations[language];

        for (const k of keys) {
            if (value === undefined) break;
            value = value[k];
        }

        // Fallback to English if key is missing in the selected language
        if (value === undefined && language !== "en") {
            value = translations["en"];
            for (const k of keys) {
                if (value === undefined) break;
                value = value[k];
            }
        }

        if (typeof value !== "string") {
            console.warn(`Translation key not found: ${key}`);
            return key; // Fallback to raw key
        }

        // Replace variables like {{count}}
        if (variables) {
            Object.entries(variables).forEach(([varKey, varValue]) => {
                value = (value as string).replace(new RegExp(`{{${varKey}}}`, "g"), String(varValue));
            });
        }

        return value as string;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}

export function getTranslatedName(item: any, language: SupportedLanguage, type: 'category' | 'item' | 'variant' | 'modifier' = 'item'): string {
    if (!item) return '';
    const nameToUse = item.nameTranslations?.[language] || item.name;
    return nameToUse;
}
