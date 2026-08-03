export const institutionTypes = [
  "Pre-school",
  "Primary",
  "Secondary",
  "College",
  "Polytechnic",
  "University",
  "Training institute",
  "Religious school",
] as const;

export const platformMetrics = [
  { value: "8", label: "institution models" },
  { value: "20+", label: "operational modules" },
  { value: "1", label: "connected system" },
] as const;

export const pricingItems = [
  {
    eyebrow: "One-time setup",
    price: "₦50k–₦200k",
    description:
      "Configuration, guided onboarding, and data migration shaped around your institution.",
    featured: false,
  },
  {
    eyebrow: "Monthly platform",
    price: "₦10k–₦50k",
    description:
      "A school-sized subscription covering the platform, updates, and ongoing support.",
    featured: true,
  },
  {
    eyebrow: "Optional add-ons",
    price: "As needed",
    description:
      "Add AI assistance, SMS notifications, or a white-label mobile app when you are ready.",
    featured: false,
  },
] as const;

export const faqItems = [
  {
    question: "Which institutions can use SchoolClerk?",
    answer:
      "SchoolClerk supports pre-schools, primary and secondary schools, colleges, polytechnics, universities, training institutes, religious schools, and education groups.",
  },
  {
    question: "Can it match our academic structure?",
    answer:
      "Yes. Configure terms or semesters, class arms or levels, departments, programmes, grading rules, and the modules your institution actually uses.",
  },
  {
    question: "What happens to our existing records?",
    answer:
      "The setup process includes guided migration. We map your existing student, academic, and finance records into the SchoolClerk structure before your team goes live.",
  },
  {
    question: "Do we have to enable every module?",
    answer:
      "No. Start with the workflows you need today and enable more modules as your operations mature. Each school keeps its own configuration.",
  },
  {
    question: "How is pricing calculated?",
    answer:
      "Pricing is sized to the institution and the modules it needs. The current range is ₦50,000–₦200,000 for setup and ₦10,000–₦50,000 monthly.",
  },
] as const;
