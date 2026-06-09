"use client";

import { fakerAR as faker } from "@faker-js/faker";
import type { FieldValues, UseFormReturn } from "react-hook-form";

type QuickFillForm = Pick<UseFormReturn<FieldValues>, "setValue" | "reset">;

export type QuickFillArgs = {
  signup: {
    setIsDomainValid: (valid: boolean) => void;
  };
  student: {
    mainClassrooms: {
      id: string;
      departments: { id: string }[];
    }[];
  };
  staffOnboarding: Record<string, never>;
};

function setQuickFillValue(form: QuickFillForm, name: string, value: unknown) {
  form.setValue(name, value, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
}

const schoolPrefixes = [
  "Atlas", "Cedar", "Summit", "Greenfield", "Lagoon", "Oakwood", "Pinecrest", 
  "Maplewood", "Silver Oak", "Crescent", "Horizon", "Pioneer", "Lighthouse", 
  "Beacon", "Crestview", "Bayside", "Riverstone", "Northwood", "Westbridge", 
  "Southgate", "Eastwood", "Willow", "Starlight", "Sunrise", "Aurora", 
  "Meridian", "Vertex", "Apex", "Zenith", "Legacy", "Heritage", "Noble", "Providence"
];

const schoolSuffixes = [
  "Academy", "College", "Preparatory School", "Learning Centre", "International School",
  "High School", "Grammar School", "Institute", "Day School", "Montessori",
  "Charter School", "Conservatory", "School of Excellence", "Collegiate", "Scholars", "Education Centre"
];

const educationSystems = ["British", "National", "International", "Hybrid"];
const curriculumNotes = [
  "National + Cambridge blend",
  "British core curriculum",
  "Nigerian curriculum with STEM focus",
  "International primary programme",
];
const languages = ["English", "Mixed"];

function fillSignup(form: QuickFillForm, args?: QuickFillArgs["signup"]) {
  const seed = Date.now().toString().slice(-5);
  
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const schoolPrefix = faker.helpers.arrayElement(schoolPrefixes);
  const schoolSuffix = faker.helpers.arrayElement(schoolSuffixes);
  const educationSystem = faker.helpers.arrayElement(educationSystems);
  const curriculumType = faker.helpers.arrayElement(curriculumNotes);
  const languageOfInstruction = faker.helpers.arrayElement(languages);

  const institutionName = `${schoolPrefix} ${schoolSuffix}`;
  const subdomain = `${schoolPrefix.toLowerCase()}-${seed}`;

  form.reset({
    institutionName,
    institutionType: "k12",
    adminName: `${firstName} ${lastName}`,
    email: `${faker.helpers.slugify(firstName).toLowerCase()}.${faker.helpers.slugify(lastName).toLowerCase()}+${seed}@schoolclerk.dev`,
    password: "lorem-ipsum",
    studentCount: String(faker.number.int({ min: 120, max: 900 })),
    country: "Nigeria",
    phone: `+23480${faker.string.numeric(8)}`,
    educationSystem,
    curriculumType,
    languageOfInstruction,
    domainName: subdomain,
  });
  
  if (args?.setIsDomainValid) {
    args.setIsDomainValid(false);
  }
}

function fillStudent(form: QuickFillForm, args?: QuickFillArgs["student"]) {
  const isMale = faker.datatype.boolean();
  const gender = isMale ? "Male" : "Female";
  const firstName = faker.person.firstName(isMale ? 'male' : 'female');
  const surname = faker.person.lastName();
  const otherName = "A.";

  setQuickFillValue(form, "name", firstName);
  setQuickFillValue(form, "surname", surname);
  setQuickFillValue(form, "otherName", otherName);
  setQuickFillValue(form, "gender", gender);
  
  const dob = faker.date.between({
    from: "2010-01-01T00:00:00.000Z",
    to: "2010-12-31T23:59:59.000Z"
  });
  setQuickFillValue(form, "dob", dob);
  
  setQuickFillValue(form, "guardian.name", `Mr/Mrs ${surname}`);
  setQuickFillValue(form, "guardian.phone", `+23480${faker.string.numeric(8)}`);
  
  const mainClassrooms = args?.mainClassrooms || [];
  if (mainClassrooms.length > 0) {
    const randomClass = faker.helpers.arrayElement(mainClassrooms);
    if (randomClass.departments.length > 0) {
       const randomDept = faker.helpers.arrayElement(randomClass.departments);
       setQuickFillValue(form, "classRoomId", randomDept.id);
    }
  }
}

function fillStaffOnboarding(form: QuickFillForm) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  setQuickFillValue(form, "name", `${firstName} ${lastName}`);
  setQuickFillValue(form, "title", "Mr.");
  setQuickFillValue(form, "phone", `+23480${faker.string.numeric(8)}`);
  setQuickFillValue(form, "phone2", "");
  setQuickFillValue(form, "address", faker.location.streetAddress());
  setQuickFillValue(form, "password", "lorem-ipsum");
}

export const quickFillers = {
  signup: fillSignup,
  student: fillStudent,
  staffOnboarding: fillStaffOnboarding,
};

export type QuickFillName = keyof typeof quickFillers;
