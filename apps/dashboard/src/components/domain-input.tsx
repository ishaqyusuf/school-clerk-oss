"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Globe, Loader2, XCircle } from "lucide-react";

import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@school-clerk/ui/form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@school-clerk/ui/input-group";

type AvailabilityState = {
  available: boolean;
  reason: string | null;
};

interface DomainInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (isValid: boolean) => void;
  disabled?: boolean;
  hostSuffix: string;
  institutionType?: string;
}

function isValidSubdomain(value: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}

export function DomainInput({
  value,
  onChange,
  onValidityChange,
  disabled = false,
  hostSuffix,
  institutionType,
}: DomainInputProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityState | null>(
    null,
  );
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    async function checkAvailability() {
      if (!debouncedValue) {
        setAvailability(null);
        onValidityChange(false);
        return;
      }

      if (!isValidSubdomain(debouncedValue)) {
        setAvailability({
          available: false,
          reason: "Use only letters, numbers, and hyphens.",
        });
        onValidityChange(false);
        return;
      }

      setIsChecking(true);

      try {
        const params = new URLSearchParams({
          value: debouncedValue,
        });

        if (institutionType) {
          params.set("institutionType", institutionType);
        }

        const response = await fetch(
          `/api/sign-up/subdomain-availability?${params.toString()}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          available: boolean;
          reason: string | null;
        };

        setAvailability({
          available: data.available,
          reason: data.reason,
        });
        onValidityChange(data.available);
      } catch (error) {
        console.error("[signup] subdomain availability check failed", error);
        setAvailability({
          available: false,
          reason: "We could not verify this subdomain right now.",
        });
        onValidityChange(false);
      } finally {
        setIsChecking(false);
      }
    }

    void checkAvailability();
  }, [debouncedValue, institutionType, onValidityChange]);

  const showInvalidFormat = value.length > 0 && !isValidSubdomain(value);
  const showAvailable =
    !showInvalidFormat && !isChecking && availability?.available === true;
  const showUnavailable =
    !showInvalidFormat && !isChecking && availability?.available === false;

  return (
    <FormItem>
      <FormLabel className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        School subdomain
      </FormLabel>
      <FormControl>
        <InputGroup data-disabled={disabled}>
          <InputGroupInput
            value={value}
            onChange={(event) =>
              onChange(
                event.currentTarget.value
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, "-"),
              )
            }
            placeholder="greenfield-academy"
            disabled={disabled}
            aria-invalid={showInvalidFormat || showUnavailable}
          />
          <InputGroupAddon align="inline-end">
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showAvailable ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : showInvalidFormat || showUnavailable ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : null}
            <InputGroupText>.{hostSuffix}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </FormControl>
      <FormDescription>
        Your workspace will live at{" "}
        <span className="font-medium text-foreground">
          {value || "your-school"}.{hostSuffix}
        </span>
      </FormDescription>
      {showInvalidFormat ? (
        <p className="text-[0.8rem] font-medium text-destructive">
          Use only letters, numbers, and hyphens.
        </p>
      ) : null}
      {showAvailable ? (
        <p className="text-[0.8rem] font-medium text-emerald-600">
          This subdomain is available.
        </p>
      ) : null}
      {showUnavailable && availability?.reason ? (
        <p className="text-[0.8rem] font-medium text-destructive">
          {availability.reason}
        </p>
      ) : null}
      <FormMessage />
    </FormItem>
  );
}
