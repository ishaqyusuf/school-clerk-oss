// import dayjs from "./dayjs";
import {
  addDays,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import util from "util";
export function stripSpecialCharacters(inputString: string) {
  // Remove special characters and spaces, keep alphanumeric, hyphens/underscores, and dots
  return inputString
    .replace(/[^a-zA-Z0-9-_\s.]/g, "") // Remove special chars except hyphen/underscore/dot
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .toLowerCase(); // Convert to lowercase for consistency
}
export const devMode = process.env.NODE_ENV != "production";
export function shuffle(array: any) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-") // Replace spaces and non-word chars with -
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
export enum FileType {
  Pdf = "application/pdf",
  Heic = "image/heic",
}

export const isSupportedFilePreview = (type: FileType) => {
  if (!type) {
    return false;
  }

  if (type === FileType.Heic) {
    return false;
  }

  if (type?.startsWith("image")) {
    return true;
  }

  switch (type) {
    case FileType.Pdf:
      return true;
    default:
      return false;
  }
};
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
      .filter((v) => (v! > 0 || v! < 0) && !isNaN(v as any))
      .reduce((sum, val) => (sum || 0) + (val as number), 0) || 0
  );
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
export function getInitials(value: string) {
  if (!value) return null;
  const formatted = value.toUpperCase().replace(/[\s.-]/g, "");

  if (formatted.split(" ").length > 1) {
    return `${formatted.charAt(0)}${formatted.charAt(1)}`;
  }

  if (value.length > 1) {
    return formatted.charAt(0) + formatted.charAt(1);
  }

  return formatted.charAt(0);
}
export const enToAr = function (v) {
  return String(v).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
};
export function percent(score: any, total: any, def = 0) {
  if (!score || !total) return def;
  return Math.round((Number(score) / Number(total)) * 100);
}

export function timeLog(...data) {
  console.log("");
  console.log(`${new Date().toISOString()}`);
  console.log(data);
  console.log("---");
}
export function consoleLog(title = "Log", ...data) {
  const now = new Date().toISOString();
  const divider = "═".repeat(40);

  console.log("");
  console.log(`\x1b[36m${divider}\x1b[0m`); // cyan divider
  console.log(`\x1b[33m📅 Time:\x1b[0m ${now}`);
  console.log(`\x1b[35m📌 Section:\x1b[0m ${title}`);
  console.log(`\x1b[36m${"-".repeat(40)}\x1b[0m`);
  console.log(util.inspect(data, { colors: true, depth: null }));
  console.log(`\x1b[36m${divider}\x1b[0m`);
  console.log("");
}

export function transformFilterDateToQuery(dateParts: string[]) {
  const [fromStr, toStr] = dateParts;
  const today = new Date();
  const lower = fromStr!.toLowerCase().trim();

  if (lower === "today") {
    return {
      gte: startOfDay(today).toISOString(),
      lte: endOfDay(today).toISOString(),
    };
  }

  if (lower === "tomorrow") {
    return {
      gte: startOfDay(addDays(today, 1)).toISOString(),
      lte: endOfDay(addDays(today, 1)).toISOString(),
    };
  }

  if (lower === "yesterday") {
    return {
      // gte: today.subtract(1, "day").toISOString(),
      gte: startOfDay(subDays(today, 1)).toISOString(),
      lte: endOfDay(subDays(today, 1)).toISOString(),
    };
  }

  if (lower === "this week") {
    return {
      gte: startOfWeek(today).toISOString(),
      lte: endOfWeek(today).toISOString(),
    };
  }

  if (lower === "last week") {
    return {
      gte: startOfWeek(subWeeks(today, 1)).toISOString(),
      lte: endOfWeek(subWeeks(today, 1)).toISOString(),
    };
  }

  if (lower === "next week") {
    return {
      gte: startOfWeek(addWeeks(today, 1)).toISOString(),
      lte: endOfWeek(addWeeks(today, 1)).toISOString(),
    };
  }

  if (lower === "this month") {
    return {
      gte: startOfMonth(today).toISOString(),
      lte: endOfMonth(today).toISOString(),
    };
  }

  // if (lower === "last month") {
  //   return {
  //     gte: today.subtract(1, "month").startOf("month").toISOString(),
  //     lte: today.subtract(1, "month").endOf("month").toISOString(),
  //   };
  // }
  // if (lower === "last 2 month") {
  //   return {
  //     gte: today.subtract(2, "month").startOf("month").toISOString(),
  //     lte: today.subtract(1, "month").endOf("month").toISOString(),
  //   };
  // }
  // if (lower === "last 6 month") {
  //   return {
  //     gte: today.subtract(6, "month").startOf("month").toISOString(),
  //     lte: today.subtract(1, "month").endOf("month").toISOString(),
  //   };
  // }

  // if (lower === "this year") {
  //   return {
  //     gte: today.startOf("year").toISOString(),
  //     lte: today.endOf("year").toISOString(),
  //   };
  // }

  // if (lower === "last year") {
  //   return {
  //     gte: today.subtract(1, "year").startOf("year").toISOString(),
  //     lte: today.subtract(1, "year").endOf("year").toISOString(),
  //   };
  // }

  // Handle specific date formats

  if (dateParts.length === 1 && fromStr) {
    return { gte: new Date(fromStr).toISOString() };
  }

  if (fromStr && toStr) {
    return {
      gte: new Date(fromStr).toISOString(),
      lte: new Date(toStr).toISOString(),
    };
  }

  if (fromStr && toStr === "null") {
    return {
      gte: new Date(fromStr).toISOString(),
    };
  }
  return null;
}

export function withdraw(amount, balance) {}
export function selectOptions<T>(
  data: T[],
  labelKey: keyof T,
  valueKey: keyof T
) {
  return data?.map((d) => ({
    data: d,
    label: d?.[labelKey],
    id: String(d?.[valueKey]),
  }));
}
export function uniqueList<T>(
  list: T[],
  // uniqueBy: keyof T | undefined = undefined
  ...uniqueBy: (keyof T)[]
) {
  if (!list) return [];
  // const kValue = (b) => (!uniqueBy || typeof b === "string" ? b : b[uniqueBy]);
  const kValue = (b: T) =>
    uniqueBy.length === 0 ? b : uniqueBy.map((k) => b[k]).join("::");
  return list.filter(
    (a, i) => i === list.findIndex((b) => kValue(b) == kValue(a))
  );
}
export async function timeout(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export function isArrayParser(parser) {
  try {
    const result = parser.parse("test"); // dummy input
    return Array.isArray(result);
  } catch {
    return false;
  }
}
