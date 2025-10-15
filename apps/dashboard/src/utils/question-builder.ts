export const buildQuestion = (questionLines) => {
  const spltd = questionLines?.split("\n");
  const lines: {
    type: "instruction" | "question" | "grid";
    qNo?: string;
    grids?: { text: string; index: string }[];
    text?: string;
    styles?;
    align?: "center" | "right" | "left";
    options?: { text: string; index: string }[];
  }[] = [];

  spltd.map((ln) => {
    const spls = ln?.split("~");
    const styles = {};
    const texts = [];
    spls.map((s, i) => {
      const [st, v] = s?.split("-");
      if (v) {
        styles[st] = v;
      } else {
        //
        texts.push(s);
      }
    });
    ln = texts[0];
    if (!ln) return;
    const [index, body] = ln?.split("'");
    if (body) {
      const [q, ...optns] = body.split("`");
      lines.push({
        qNo: index,
        styles,
        type: "question",
        text: transformText(q),
        options: optns?.map((o, i) => ({
          index: optionIndex(i),
          text: transformText(o),
        })),
      });
      return;
    }
    const [_, centeredInstr] = ln?.split("__");
    if (ln?.trim()?.startsWith("__")) {
      lines.push({
        text: centeredInstr,
        align: "center",
        type: "instruction",
        styles,
      });
      return;
    }
    const grids = ln?.split("_");
    if (grids.length > 1 || ln?.includes("،")) {
      lines.push({
        type: "grid",
        styles,
        grids: grids.map((g, i) => {
          const [gInd, gTex] = g?.split(`،`);
          return {
            text: transformText(gTex || gInd),
            index: gTex ? gInd : null,
          };
        }),
      });
      return;
    }

    // if (texts?.length) {
    lines.push({
      type: "question",
      text: transformText(texts[0]),
      styles,
    });
    // }
  });
  return lines;
};
function optionIndex(i) {
  return [`ا`, "ب", "ج", "د", "ه", "و", "ز"][i];
}
function transformText(q) {
  const replc = {
    "...": ". . . . . . . . . . . . . . .",
    "..": ". . . . . . . . . .",
    ف٣: ". . . . . . . . . . . . . . .",
    "))": "»",
    ")": "»",
    "((": "«",
    "(": "«",

    // "..": ""
    // ".": ""
  };
  // ""?.replaceAll()
  Object.entries(replc).map(([s, r]) => (q = q?.replaceAll(s, r)));
  return q;
}
