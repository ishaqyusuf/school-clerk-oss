import { Font } from "@react-pdf/renderer";
import path from "path";

let registered = false;

function resolveFontPath(fileName: string) {
  const cwd = process.cwd();
  const packageRoot = cwd.endsWith(path.join("packages", "pdf"))
    ? cwd
    : path.join(cwd, "packages", "pdf");

  return path.join(packageRoot, "public", "fonts", fileName);
}

export function ensureResultFontsRegistered() {
  if (registered) return;

  Font.register({
    family: "Amiri",
    src: resolveFontPath("Amiri-Regular.ttf"),
  });

  Font.register({
    family: "DancingScript",
    src: resolveFontPath("DancingScript-Regular.ttf"),
  });

  registered = true;
}
