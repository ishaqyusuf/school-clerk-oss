import { CheckCircle, Clock, Calendar } from "lucide-react";

export const MOCK_SESSIONS: any[] = [
  {
    id: "2023-2024",
    name: "2023 / 2024",
    status: "current",
    activeTerm: "2nd Term",
    duration: "Sept 2023 - July 2024",
    terms: [
      {
        id: "t1",
        name: "1st Term",
        status: "completed",
        startDate: "Sep 04, 2023",
        endDate: "Dec 15, 2023",
      },
      {
        id: "t2",
        name: "2nd Term",
        description: "(Active)",
        status: "active",
        startDate: "Jan 08, 2024",
        endDate: "Apr 12, 2024",
        completionPercentage: 65,
      },
      {
        id: "t3",
        name: "3rd Term",
        status: "upcoming",
        startDate: "May 06, 2024",
        endDate: "Jul 26, 2024",
      },
    ],
  },
  {
    id: "2022-2023",
    name: "2022 / 2023",
    status: "archived",
    activeTerm: "Ended at 3rd Term",
    duration: "Sept 2022 - July 2023",
    terms: [],
  },
  {
    id: "2024-2025",
    name: "2024 / 2025",
    status: "planning",
    activeTerm: "Not started",
    duration: "Sept 2024 - July 2025",
    terms: [],
  },
];

export const MOCK_STUDENTS: any[] = [
  {
    id: "1",
    name: "Michael Adewale",
    gender: "Male",
    admissionNo: "SC-2023-001",
    grade: "Grade 5A",
    status: "Active",
    paymentStatus: "Paid",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuASXSsEsMhK7MW65nHmlkU9H93KJCLQi-JoqKDAJgO7DkEH5sA0JLDIMNkGBrM4bMqdw_kTM6uNRhmSr7-kSx_VRhLwP92O4B1XVtvXDgLPGhrVAQH_sGSKr_iFTpHEZUU1YicOKOI0_waiauo0vY7biI2FSCzYsKe9gbgP6k-j_qm7eo_KejNeZJiVTGn_Ojp9BWGzuWKoqWkmyKbzP9imD4wM7H_O3_g0Xc4iJZL8KHLuuErbUWhkfAM-KWfDhmjnDVfbd0lXprk",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    gender: "Female",
    admissionNo: "SC-2023-042",
    grade: "Grade 5A",
    status: "Active",
    paymentStatus: "Partial",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCGtv5xWAgSE6fv2bQgojSnVwCHjUXk_MlcQ8enLyv4DpE88klRgonV2cxFh2UMv3v0Ea9XedV5lV-iwaknt5ryty1Zb8_yj8_jA0hly95ri1LgNFDW7s4wvtm7TGfg0acbl-FVWul3IF35k9QONFl5gJzW4etWl86w_4i_TN4o7cw8AN1toCT_0-obT-4jy1FY4Rc7rhwJvRKU97wV2KfZsRq6KwxhDJnW27iJrx5ZMZKO_O_22QIQ_t9r8HE4i-cTD6-YnLIN-uQ",
  },
  {
    id: "3",
    name: "David Chen",
    gender: "Male",
    admissionNo: "SC-2023-018",
    grade: "Grade 5B",
    status: "Inactive",
    paymentStatus: "Unpaid",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBGWCTcbQyldPz8bq98XKxVVZq8jW6OYdY4dI9czJWG1Fqjj8PkhxcjOcOsqLVGu8PJZF17NRG1qO7zQpcBMk0vZd2xW17E0JX0HClw_Dahcrmxh13AJ-c_JpsZioBJo0BiPFv9S8MkgrgE73PRzYELTt2fKw__vllaSJFjZkgw8fQYWaRGbTYmuDMt7zJRXS0qxJ-4kG26HvNFr128WRzlCgvd5eIzM2DpcDZrub40ygBMpXfkgcsOGF9e9H-vHw7AZyko3tCwmSw",
  },
  {
    id: "4",
    name: "Elena Rodriguez",
    gender: "Female",
    admissionNo: "SC-2023-102",
    grade: "Grade 4C",
    status: "Active",
    paymentStatus: "Paid",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCqLP9-_TkjgCPLY94N_JUYqMugUwTMds6XVw-MzGXsv1qxDVJ43iOwcZB8JXlCv7X4pMoGKh5TxYJyF_SHMXH7DuR6MWlxc3kTbCXRlbXdaRNnfhjZOJJdxMkPLKvGAD3btAJBcp15kXM-TR9pOygb1l2po1XVKfprEgrj1k7tLO7MZrH4KAvv1waPsBeaFnR8nWFYFcWAR3qQEs_1k6YQA5IWmZB5KgCCil-YRD9dtOS-q-AkKaI8mOBdG6RQg_EPGt863ToPCUw",
  },
];
