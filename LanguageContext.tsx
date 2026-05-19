import React, { createContext, useState, useContext, ReactNode } from 'react';
import { translations } from './translations';

type Language = 'id' | 'en';

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('id');

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const keyParts = key.split('.');
    let result: any = translations;
    for (const part of keyParts) {
      result = result?.[part];
    }
    
    let text = result?.[language] || key;

    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            text = text.replace(`{${rKey}}`, String(replacements[rKey]));
        });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
