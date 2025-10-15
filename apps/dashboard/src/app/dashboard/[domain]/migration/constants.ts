export const subjectsByCode = {
  AR: "العربية",
  FIQH: "الفقه",
  TAJW: "التجويد",
  QUR: "القرآن",
  AQ: "التوحيد",
  HADTH: "الحديث",
  SEEROH: "السيرة",
  ADHKR: "الأذكار",
  MUTOON: "المتون",
  Alif: "القراءة والكتابة",
  // Alif: "القراءة والكتابة",
  QOW: "قواعد اللغة",
  HIFZ: "الحفظ",
  QIR: "القراءة",
  MUR: "المراجعة",
  KHT: "الخط",
  MAHF: "المحفوظة",
  NAHW: "النحو",
  TABEER: "التعبير",
  TAFSEER: "التفسير",
};
export const classGroups: { [code in string]: ClassCodes[] } = {
  tamheedi: ["tamheediA", "tamheediB", "tamheediC", "tamheediD"],
};
export const classSubjectsByCode: { [code in ClassCodes]: SubjectCodes[] } = {
  ibtidaai: ["QUR", "TAJW", "ADHKR", "AQ", "HADTH", "AR", "Alif"],
  tamheediA: ["QUR", "AQ", "HADTH"],
  tamheediB: ["QUR", "AQ", "HADTH"],
  tamheediC: ["QUR", "AQ", "HADTH"],
  tamheediD: ["QUR", "AQ", "HADTH"],
  tamheedi2: ["QUR", "AQ", "HADTH", "KHT", "QIR"],
  ibtidaai2: [
    "QUR",
    "AR",
    "TAJW",
    "HADTH",
    "MUTOON",
    "FIQH",
    "SEEROH",
    "QOW",
    "ADHKR",
    "AQ",
  ],
  idaadi: [
    "QUR",
    "SEEROH",
    "AR",
    "HADTH",
    "FIQH",
    "ADHKR",
    "MUTOON",
    "NAHW",
    "TAJW",
  ],
  idaadi2: [
    "QUR",
    "HADTH",
    "FIQH",
    "MAHF",
    "ADHKR",
    "NAHW",
    "TAJW",
    "AQ",
    "TABEER",
    "TAFSEER",
  ],
};

export const subjectCodes = Object.keys(subjectsByCode);
export const subjectNames = Object.values(subjectsByCode);

export type SubjectNameTypes = typeof subjectNames;
export type SubjectCodes = keyof typeof subjectsByCode;
export const classByCodes = {
  tamheediA: "الأول التمهيد ا",
  tamheediB: "الأول التمهيد ب",
  tamheediC: "الأول التمهيد ج",
  tamheediD: "الأول التمهيد د",
  tamheedi2: "الثاني التمهيد",
  ibtidaai: "الأول الإبتدائي",
  ibtidaai2: "الثاني الإبتدائي",
  idaadi: "الأول الإعدادي",
  idaadi2: "الثاني الإعدادي",
};
export const assessmentShortTitle = (title) => {
  return (
    {
      الاختبار: "تب",
      الامتحان: "تح",
      القراءة: "ق",
      الحضور: "حض",
      الحفظ: "حف",
      المراجعة: "م",
    }[title] || title
  );
};
export const arabicAbc = {
  a: "ا",
  b: "ب",
  c: "ج",
  d: "د",
  e: "هـ",
  f: "و",
  g: "ز",
};
export const examStatus = {
  permitted: "مس",
  paid: "مد",
  free: "م",
  noStatus: "x",
};
export const classCodes = Object.keys(classByCodes);
export const classArray = Object.entries(classByCodes).map(
  ([value, label]) => ({ value, label }),
);
export const subjectsArray = Object.entries(subjectsByCode).map(
  ([value, label]) => ({ value, label }),
);
export type ClassCodes = keyof typeof classByCodes;
