import {
  classByCodes,
  ClassCodes,
  classSubjectsByCode,
  subjectsByCode,
} from "./constants";

export function getClassCode(name) {
  const res = Object.entries(classByCodes).find(
    ([code, cName]) => cName === name,
  );

  return res?.[0];
}
export function getClassSubjectList(classCode: ClassCodes) {
  const ls: {
    code?;
    name;
    subs?: { title; mark }[];
  }[] = classSubjectsByCode[classCode]?.map((subjectCode) => {
    return {
      code: subjectCode,
      name: subjectsByCode[subjectCode],
      subs:
        subjectCode == "QUR" &&
        (["ibtidaai", "ibtidaai2"] as ClassCodes[]).includes(classCode)
          ? [
              { title: subjectsByCode.HIFZ, mark: "(٣٠)" },
              { title: subjectsByCode.QIR, mark: "(٣٠)" },
              { title: subjectsByCode.MUR, mark: "(٤٠)" },
            ]
          : [],
    };
  });
  return ls;
}
export function undotName(name) {
  const [firstName, surname, otherName] = name
    ?.split("_")
    ?.map((r) => (r == "-" ? null : r));
  return {
    firstName,
    surname,
    otherName,
  };
}
export function dotName({ firstName, surname, otherName }) {
  return [firstName, surname, otherName]?.map((a) => (!a ? "-" : a))?.join("_");
}
export function trimName(name) {
  if (!name) return name;
  return name?.split(" ")?.filter(Boolean)?.join(" ");
}
