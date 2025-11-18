import type { Styles } from "@react-pdf/renderer";

export type PdfStyle = Partial<Styles[""]>;

// helpers
const spacing = (n: number) => n * 4;
const deg = (n: number) => `${n}deg`;
const percent = (n: number) => `${n}%`;

const colors: Record<string, string> = {
  transparent: "transparent",
  black: "#000000",
  white: "#ffffff",
  gray: "#9ca3af",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#facc15",
  indigo: "#6366f1",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

// Rule format: regex → handler returning PdfStyle
export const pdfStyleRules: [
  RegExp,
  (match: RegExpMatchArray, dir: "ltr" | "rtl") => PdfStyle
][] = [
  // ---------- COLORS ----------
  [/^bg-(\w+)$/, ([, c]) => ({ backgroundColor: colors[c] ?? c })],
  [/^text-(\w+)$/, ([, c]) => ({ color: colors[c] ?? c })],
  [/^opacity-(\d{1,3})$/, ([, v]) => ({ opacity: parseInt(v) / 100 })],

  // ---------- TEXT ----------
  [
    /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/,
    ([, size]) => {
      const map: Record<string, number> = {
        xs: 10,
        sm: 12,
        base: 14,
        lg: 18,
        xl: 20,
        "2xl": 24,
        "3xl": 30,
        "4xl": 36,
      };
      return { fontSize: map[size] };
    },
  ],
  [
    /^font-(light|normal|medium|semibold|bold)$/,
    ([, w]) => ({
      fontWeight:
        w === "semibold" ? 600 : w === "medium" ? 500 : w === "light" ? 300 : w,
    }),
  ],
  [/^italic$/, () => ({ fontStyle: "italic" })],
  [/^underline$/, () => ({ textDecoration: "underline" })],
  [/^line-through$/, () => ({ textDecoration: "line-through" })],
  [
    /^text-(left|center|right|justify)$/,
    ([, align], dir) => ({
      textAlign: (dir === "rtl"
        ? align === "left"
          ? "right"
          : align === "right"
          ? "left"
          : align
        : align) as any,
    }),
  ],

  // ---------- FLEX ----------
  [/^flex$/, () => ({ display: "flex" })],
  [/^flex-(\d+)$/, ([, n]) => ({ flex: n })],
  [
    /^flex-(row|col)$/,
    ([, dirVal], dir) => ({
      flexDirection:
        dirVal === "row" ? (dir === "rtl" ? "row-reverse" : "row") : "column",
    }),
  ],
  [
    /^items-(start|center|end|stretch|baseline)$/,
    ([, v]) => ({
      alignItems: (v === "start"
        ? "flex-start"
        : v === "end"
        ? "flex-end"
        : v) as any,
    }),
  ],
  [
    /^justify-(start|center|end|between|around|evenly)$/,
    ([, v]) => ({
      justifyContent:
        v === "start"
          ? "flex-start"
          : v === "end"
          ? "flex-end"
          : `space-${
              v === "between" ? "between" : v === "around" ? "around" : "evenly"
            }`,
    }),
  ],
  [/^gap-(\d+)$/, ([, n]) => ({ gap: spacing(+n) })],
  [/^row-gap-(\d+)$/, ([, n]) => ({ rowGap: spacing(+n) })],
  [/^col-gap-(\d+)$/, ([, n]) => ({ columnGap: spacing(+n) })],
  [
    /^col-span-(\d+)$/,
    ([, n]) => ({
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 100 / +n,
    }),
  ],
  // ---------- DIMENSION ----------

  [/^w-(\d+)$/, ([, n]) => ({ width: spacing(+n) })],
  [/^h-(\d+)$/, ([, n]) => ({ height: spacing(+n) })],
  [/^max-w-(\d+)$/, ([, n]) => ({ maxWidth: spacing(+n) })],
  [/^max-h-(\d+)$/, ([, n]) => ({ maxHeight: spacing(+n) })],
  [/^min-w-(\d+)$/, ([, n]) => ({ minWidth: spacing(+n) })],
  [/^min-h-(\d+)$/, ([, n]) => ({ minHeight: spacing(+n) })],

  // ---------- POSITION ----------
  [/^(absolute|relative)$/, ([, p]) => ({ position: p as any })],
  [/^top-(\d+)$/, ([, n]) => ({ top: spacing(+n) })],
  [/^bottom-(\d+)$/, ([, n]) => ({ bottom: spacing(+n) })],
  [
    /^left-(\d+)$/,
    ([, n], dir) =>
      dir === "rtl" ? { right: spacing(+n) } : { left: spacing(+n) },
  ],
  [
    /^right-(\d+)$/,
    ([, n], dir) =>
      dir === "rtl" ? { left: spacing(+n) } : { right: spacing(+n) },
  ],
  [/^z-(\d+)$/, ([, n]) => ({ zIndex: +n })],

  // ---------- MARGIN / PADDING ----------
  [
    /^(m|p)([trblxy]?)-(\d+)$/,
    ([, type, side, n]) => {
      const val = spacing(+n);
      const map = {
        p: {
          "": "padding",
          t: "paddingTop",
          b: "paddingBottom",
          l: "paddingLeft",
          r: "paddingRight",
          x: ["paddingLeft", "paddingRight"],
          y: ["paddingTop", "paddingBottom"],
        },
        m: {
          "": "margin",
          t: "marginTop",
          b: "marginBottom",
          l: "marginLeft",
          r: "marginRight",
          x: ["marginLeft", "marginRight"],
          y: ["marginTop", "marginBottom"],
        },
      }[type];
      const key = map?.[side || ""];
      return Array.isArray(key)
        ? { [key[0]]: val, [key[1]]: val }
        : key
        ? { [key]: val }
        : {};
    },
  ],

  // ---------- BORDER ----------
  [/^border$/, () => ({ borderWidth: 1 })],
  [/^border-(\d+)$/, ([, n]) => ({ borderWidth: +n })],
  [/^border-(\w+)$/, ([, c]) => ({ borderColor: colors[c] ?? c })],
  [/^border-(solid|dashed|dotted)$/, ([, s]) => ({ borderStyle: s as any })],
  [
    /^rounded(-(sm|md|lg|xl))?$/,
    ([, , size]) => {
      const map: Record<string, number> = { sm: 2, md: 4, lg: 8, xl: 12 };
      return { borderRadius: size ? map[size] : 4 };
    },
  ],

  // ---------- TRANSFORM ----------
  [
    /^rotate-(-?\d+)$/,
    ([, n]) => ({ transform: [{ rotate: `${n}deg` as any }] }),
  ],
  [/^scale-(\d+(\.\d+)?)$/, ([, n]) => ({ transform: [{ scale: +n }] as any })],
  [
    /^translate-x-(-?\d+)$/,
    ([, n], dir) => ({
      transform: [{ translateX: dir === "rtl" ? -spacing(+n) : spacing(+n) }],
    }),
  ],
  [
    /^translate-y-(-?\d+)$/,
    ([, n]) => ({ transform: [{ translateY: spacing(+n) }] }),
  ],
  [/^whitespace-(-?\s+)$/, ([, n]) => ({ transform: [{ whiteSpace: n }] })],
];
