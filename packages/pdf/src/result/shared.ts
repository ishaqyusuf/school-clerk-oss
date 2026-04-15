import { Font } from "@react-pdf/renderer";
import path from "path";

let registered = false;

export function ensureResultFontsRegistered() {
  if (registered) return;

  Font.register({
    family: "Amiri",
    src: path.join(process.cwd(), "packages/pdf/public/fonts/Amiri-Regular.ttf"),
  });

  Font.register({
    family: "DancingScript",
    src: path.join(
      process.cwd(),
      "packages/pdf/public/fonts/DancingScript-Regular.ttf",
    ),
  });

  registered = true;
}
