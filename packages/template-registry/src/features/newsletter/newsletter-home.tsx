"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Section, SectionContainer, Text } from "../../common";
import { useRegistry } from "../../registry-context";
import type { WebsiteRegistryFeatureDefinition } from "../../types";

export type NewsletterRegistrationInput = {
  email: string;
};

export function NewsletterHomeSection({
  onRegister,
}: {
  onRegister?: (input: NewsletterRegistrationInput) => void | Promise<void>;
}) {
  const { isTemplateMode } = useRegistry();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isTemplateMode || !email.trim()) return;

    setIsPending(true);

    try {
      await onRegister?.({ email: email.trim() });
      setEmail("");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Section>
      <SectionContainer align="center">
        <Text as="h2" field="newsletter.home.title">
          Register for our newsletter
        </Text>
        <Text field="newsletter.home.body">
          Get school announcements, admissions updates, and community highlights.
        </Text>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
            width: "100%",
            maxWidth: "36rem",
          }}
        >
          <Input
            aria-label="Email address"
            type="email"
            value={email}
            placeholder="parent@example.com"
            disabled={isTemplateMode || isPending}
            onChange={(event) => setEmail(event.currentTarget.value)}
            style={{ flex: "1 1 16rem" }}
          />
          <Button type="submit" disabled={isTemplateMode || isPending}>
            {isPending ? "Registering..." : "Register"}
          </Button>
        </form>
      </SectionContainer>
    </Section>
  );
}

export const newsletterFeature: WebsiteRegistryFeatureDefinition = {
  key: "newsletter",
  label: "Newsletter",
  description:
    "Collect public newsletter signups while keeping the section editable and safe in template mode.",
  dataRequirements: ["tenant-profile"],
  sections: [
    {
      key: "newsletter.home",
      label: "Newsletter signup",
      featureKey: "newsletter",
      supportedPages: ["home"],
      defaultVisible: true,
      modes: ["production", "preview", "editor", "dummy"],
      editables: [
        {
          key: "newsletter.home.title",
          label: "Newsletter title",
          description: "Heading for the newsletter signup section.",
          contentType: "short-text",
          sizeGuidance: "3-8 words",
        },
        {
          key: "newsletter.home.body",
          label: "Newsletter body",
          description: "Short supporting text for newsletter signup.",
          contentType: "long-text",
          sizeGuidance: "12-30 words",
        },
      ],
    },
  ],
};
