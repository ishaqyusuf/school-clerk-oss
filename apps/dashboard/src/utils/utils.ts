import { FieldPath } from "react-hook-form";
import { dotObject } from "./dot-utils";

export function generateRandomString(length = 15) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset.charAt(randomIndex);
  }

  return randomString;
}
export function sum<T>(array?: T[], key: keyof T | undefined = undefined) {
  if (!array) return 0;
  return (
    array
      .map((v) => (!key ? v : v?.[key]))
      .map((v) => (v ? Number(v) : null))
      .filter((v) => (v > 0 || v < 0) && !isNaN(v as any))
      .reduce((sum, val) => (sum || 0) + (val as number), 0) || 0
  );
}
export function randomInt(max, min = 5) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function studentDisplayName({
  name,
  surname,
  otherName,
}: {
  name?: string;
  surname?: string;
  otherName?: string;
}) {
  return [name, surname, otherName].filter(Boolean).join(" ");
}
export function composeQuery<T>(queries: T[]): T | undefined {
  if (!Array.isArray(queries) || queries.length === 0) {
    return undefined;
  }
  return queries.length > 1
    ? ({
        AND: queries,
      } as T)
    : queries[0];
}
export function arToEn(arabicNum) {
  const arabicToEnglishMap = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };

  return arabicNum
    ?.split("")
    .map((char) => arabicToEnglishMap[char] || char)
    .join("");
}
// export const enToAr = function (v) {
//   return String(v).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
// };
export const enToAr = function (v: string | number) {
  return String(v).replace(/\d|\./g, (d) => {
    if (d === ".") return "٫"; // Arabic decimal separator
    return "٠١٢٣٤٥٦٧٨٩"[d as any];
  });
};
export function labelIdOptions<T, L extends FieldPath<T>, I extends keyof T>(
  list: T[],
  label: L,
  id: I
) {
  if (!list?.length) return [];
  return list?.filter(Boolean).map((l) => {
    // if (typeof l == "string") return { label: l, id: String(l), data: l };
    const getValue = (path) => dotObject.pick(path, l);
    return {
      label: getValue(label),
      id: String(getValue(id)),
      data: l,
    };
  });
}
