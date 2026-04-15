import { K12HeritageTemplate } from "./templates/heritage";
import { K12ScholarTemplate } from "./templates/scholar";
import type { ResultTemplateDefinition } from "../../types";

export const k12ResultTemplates: ResultTemplateDefinition[] = [
  {
    id: "k12-scholar",
    label: "K-12 Scholar",
    schoolSystem: "k12",
    description: "A bold premium result sheet with card-based academic highlights.",
    render: K12ScholarTemplate,
  },
  {
    id: "k12-heritage",
    label: "K-12 Heritage",
    schoolSystem: "k12",
    description: "A formal academic result sheet with a framed traditional layout.",
    render: K12HeritageTemplate,
  },
];
