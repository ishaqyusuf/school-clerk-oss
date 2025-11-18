import fs from "fs";
import path from "path";
import { pdfStyleRules } from "../pdf-style-rules";

const outFile = path.resolve(
  __dirname,
  "../packages/react-pdf/src/generatedClassTypes.ts"
);

// Example samples for pattern expansion
const samples: Record<string, string[]> = {
  "\\(\\w\\+\\)": ["red", "blue", "gray", "green", "white"],
  "\\(\\d\\+\\)": ["0", "1", "2", "4", "8", "16"],
  "(-\\d\\+)": ["-1", "1", "2", "4"],
};

function expandPattern(pattern: RegExp): string[] {
  const src = pattern.source.replace(/^\^|\$$/g, "");
  for (const key of Object.keys(samples)) {
    if (new RegExp(key).test(src)) {
      return samples[key].map((v) => src.replace(new RegExp(key), v));
    }
  }
  return [src];
}

const allSingles = new Set<string>();
for (const [regex] of pdfStyleRules) {
  for (const c of expandPattern(regex)) allSingles.add(c);
}

const singles = Array.from(allSingles).sort();

// Generate multi-class combos (up to 3)
const combos = new Set<string>();
for (let i = 0; i < singles.length; i++) {
  for (let j = i + 1; j < Math.min(i + 30, singles.length); j++) {
    combos.add(`${singles[i]} ${singles[j]}`);
    for (let k = j + 1; k < Math.min(j + 3, singles.length); k++) {
      combos.add(`${singles[i]} ${singles[j]} ${singles[k]}`);
    }
  }
}

// Merge all possibilities
const allValues = [...singles, ...combos];
const content = `// AUTO-GENERATED FILE — DO NOT EDIT
// Generated ${new Date().toISOString()}

export type AllowedClassName =
  | ${allValues.map((c) => `"${c}"`).join("\n  | ")};\n`;

fs.writeFileSync(outFile, content);
console.log(
  `✅ Generated ${allValues.length} AllowedClassName variants (${singles.length} singles + ${combos.size} combos)`
);
