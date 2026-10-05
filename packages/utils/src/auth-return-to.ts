// Parse only an application-relative destination. The existing tenant URL
// adapter applies the current workspace's host/path prefix afterward.
export function normalizeAuthReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || value !== value.trim() || /[\u0000-\u001f\u007f\\]/.test(value) ||
    /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//")) return null;
  const href = value.startsWith("/") ? value : `/${value}`;
  const rawPath = href.split(/[?#]/, 1)[0] ?? "/";
  // Encoded separators/controls and nested encoding must not become a second
  // authority or change path structure after another routing layer decodes it.
  if (/%(?:2f|5c|25|0[0-9a-f]|1[0-9a-f]|7f)/i.test(rawPath)) return null;
  try {
    decodeURIComponent(rawPath);
    const parsed = new URL(href, "https://return-target.invalid");
    if (parsed.origin !== "https://return-target.invalid" || parsed.username || parsed.password ||
      !parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
