export const detectPdfEnv = () => {
  // No window = SSR or PDF render mode
  if (typeof window === "undefined") return true;
  // You can also expose `process.env.IS_PDF_RENDER` for manual control
  return !!process.env.IS_PDF_RENDER;
};
