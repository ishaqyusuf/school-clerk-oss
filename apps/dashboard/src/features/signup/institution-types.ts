export type InstitutionTypeOption = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  badge?: string;
};

export const institutionTypeOptions: InstitutionTypeOption[] = [
  {
    id: "k12",
    label: "K-12 School",
    description:
      "Primary and secondary workflows with class, term, attendance, and fee management.",
    enabled: true,
    badge: "Ready",
  },
  {
    id: "college",
    label: "College",
    description:
      "Department-led academic structures with broader programme administration.",
    enabled: false,
    badge: "Coming soon",
  },
  {
    id: "university",
    label: "University",
    description:
      "Multi-faculty operations, semester depth, and advanced registrar workflows.",
    enabled: false,
    badge: "Coming soon",
  },
  {
    id: "vocational",
    label: "Vocational Institute",
    description:
      "Cohort-based delivery, practical modules, and short-cycle programme support.",
    enabled: false,
    badge: "Coming soon",
  },
  {
    id: "other",
    label: "Other Institution",
    description:
      "For specialised institutions that need tailored onboarding and module mapping.",
    enabled: false,
    badge: "Contact us",
  },
];

export function getInstitutionType(id?: string | null) {
  return institutionTypeOptions.find((item) => item.id === id);
}

export function isInstitutionTypeEnabled(id?: string | null) {
  return Boolean(getInstitutionType(id)?.enabled);
}
