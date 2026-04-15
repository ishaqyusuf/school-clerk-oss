import { useWebsiteEditor } from "../editor-context";
import type { CSSProperties, ReactNode } from "react";

export function SectionFrame({
  mode,
  sectionKey,
  pageKey,
  label,
  children,
}: {
  mode: "preview" | "editor" | "production";
  sectionKey: string;
  pageKey?: string;
  label: string;
  children: ReactNode;
}) {
  const editor = useWebsiteEditor();

  if (mode !== "editor") {
    return <>{children}</>;
  }

  return (
    <section
      data-section-key={sectionKey}
      style={{
        position: "relative",
        border: "1px dashed rgba(15, 76, 129, 0.22)",
        borderRadius: 24,
        padding: 16,
        background: "rgba(255,255,255,0.35)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            borderRadius: 999,
            background: "#eff6ff",
            border: "1px solid rgba(15, 76, 129, 0.16)",
            color: "#0f4c81",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            padding: "6px 10px",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        {editor && pageKey ? (
          <>
            <button
              type="button"
              onClick={() =>
                editor.setSectionVisibility(
                  sectionKey,
                  !(editor.config.sectionVisibility[sectionKey] ?? true)
                )
              }
              style={toolbarButtonStyle}
            >
              {editor.config.sectionVisibility[sectionKey] ?? true ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              onClick={() => editor.moveSection(pageKey, sectionKey, "up")}
              style={toolbarButtonStyle}
            >
              Up
            </button>
            <button
              type="button"
              onClick={() => editor.moveSection(pageKey, sectionKey, "down")}
              style={toolbarButtonStyle}
            >
              Down
            </button>
            <button
              type="button"
              onClick={() => editor.duplicateSection(pageKey, sectionKey)}
              style={toolbarButtonStyle}
            >
              Duplicate
            </button>
          </>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const toolbarButtonStyle: CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(15, 76, 129, 0.16)",
  background: "#ffffff",
  color: "#0f4c81",
  fontSize: 11,
  fontWeight: 700,
  padding: "6px 10px",
  cursor: "pointer",
};
