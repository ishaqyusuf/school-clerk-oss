"use client";

import { useEffect, useState } from "react";
import { Check, Globe } from "lucide-react";

import { Button } from "@school-clerk/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";

// Available languages with their native names
const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  //   { code: "es", name: "Español", flag: "🇪🇸" },
  //   { code: "fr", name: "Français", flag: "🇫🇷" },
  //   { code: "de", name: "Deutsch", flag: "🇩🇪" },
  //   { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦", rtl: true },
  //   { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  //   { code: "pt", name: "Português", flag: "🇧🇷" },
  //   { code: "ru", name: "Русский", flag: "🇷🇺" },
  //   { code: "ja", name: "日本語", flag: "🇯🇵" },
];

interface LanguageSelectorProps {
  onChange?: (language: string) => void;
}

export function LanguageSelector({ onChange }: LanguageSelectorProps) {
  const [currentLanguage, setCurrentLanguage] = useState("en");

  useEffect(() => {
    // Get browser language or saved preference
    const savedLanguage = localStorage.getItem("preferredLanguage");
    const browserLanguage = navigator.language.split("-")[0];
    const initialLanguage =
      savedLanguage ??
      (languages.some((lang) => lang.code === browserLanguage)
        ? browserLanguage
        : "en");

    setCurrentLanguage(initialLanguage);

    // Set document direction for RTL languages
    const isRtl = languages.find((lang) => lang.code === initialLanguage)?.rtl;
    if (isRtl) {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  }, []);

  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode);
    localStorage.setItem("preferredLanguage", langCode);

    // Set RTL direction if needed
    const isRtl = languages.find((lang) => lang.code === langCode)?.rtl;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";

    if (onChange) {
      onChange(langCode);
    }
  };

  const currentLang = languages.find((lang) => lang.code === currentLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Globe className="h-4 w-4" />
          <span>
            {currentLang?.flag} {currentLang?.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="gap-2"
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
            {currentLanguage === language.code && (
              <Check className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
