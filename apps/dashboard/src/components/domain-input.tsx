"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/utils/i18n/translations";
import { Check, Globe, X } from "lucide-react";

import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";

interface DomainInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (isValid: boolean) => void;
  disabled?: boolean;
  locale?: string;
}

export function DomainInput({
  value,
  onChange,
  onValidityChange,
  disabled = false,
  locale = "en",
}: DomainInputProps) {
  const { t } = useTranslations(locale);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Validate domain format (letters, numbers, hyphens only)
  const validateDomainFormat = (domain: string) => {
    const regex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    return domain.length > 0 ? regex.test(domain) : true;
  };

  // Update debounced value after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 500);
    return () => clearTimeout(timer);
  }, [value]);

  // Check domain validity and availability
  useEffect(() => {
    const checkDomain = async () => {
      if (!debouncedValue) {
        setIsValid(null);
        setIsAvailable(null);
        onValidityChange(false);
        return;
      }

      // First check format validity
      const formatValid = validateDomainFormat(debouncedValue);
      setIsValid(formatValid);

      if (!formatValid) {
        onValidityChange(false);
        return;
      }

      // Then check availability
      setIsChecking(true);
      try {
        // In a real app, this would be an API call to check domain availability
        // For now, we'll simulate with a timeout and random result
        await new Promise((resolve) => setTimeout(resolve, 800));

        // For demo purposes: domains with "taken" are unavailable, others are available
        const available = !debouncedValue.includes("taken");
        setIsAvailable(available);
        onValidityChange(available);
      } catch (error) {
        console.error("Error checking domain availability:", error);
        setIsAvailable(null);
        onValidityChange(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkDomain();
  }, [debouncedValue, onValidityChange]);

  // Generate status message and icon
  const getStatusMessage = () => {
    if (!value) return null;
    if (isValid === false)
      return {
        message: t("domainInvalid"),
        icon: <X className="h-4 w-4 text-destructive" />,
      };
    if (isChecking) return { message: t("domainAvailability"), icon: null };
    if (isAvailable === true)
      return {
        message: t("domainAvailable"),
        icon: <Check className="h-4 w-4 text-green-500" />,
      };
    if (isAvailable === false)
      return {
        message: t("domainNotAvailable"),
        icon: <X className="h-4 w-4 text-destructive" />,
      };
    return null;
  };

  const status = getStatusMessage();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="domainName">{t("domainName")}</Label>
      </div>

      <div className="relative">
        <Input
          id="domainName"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().trim())}
          placeholder={t("domainNamePlaceholder")}
          disabled={disabled}
          className={`pr-10 ${
            isValid === false
              ? "border-destructive"
              : isAvailable === true
                ? "border-green-500"
                : ""
          }`}
        />
        {status?.icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {status.icon}
          </div>
        )}
      </div>

      {status && (
        <p
          className={`text-xs ${
            isValid === false || isAvailable === false
              ? "text-destructive"
              : isAvailable === true
                ? "text-green-500"
                : "text-muted-foreground"
          }`}
        >
          {status.message}
        </p>
      )}

      <div className="mt-1 text-sm text-muted-foreground">
        <p>
          {t("domainPreview")}{" "}
          <span className="font-medium">{value || "..."}.schoolclerk.com</span>
        </p>
      </div>
    </div>
  );
}
