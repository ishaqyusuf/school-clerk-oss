// import type { Many, One, Relation } from "drizzle-orm";
// import { relations } from "drizzle-orm"; // Assuming you're using drizzle-orm

// import { transaction } from "./accounting-schema";
// import { workerTermSheet } from "./staff-schema";
// import { User } from "./user-schema";

// export function _relation<T>(table: T) {
//   type TableName = T["_"]["name"];

//   type FormType<T1> = Record<
//     string,
//     {
//       scope: "one" | "many";
//       relation: T1;
//       relationKeys?: keyof T1[]; // Array of keys from the related table
//       referenceKeys?: keyof T[]; // Array of keys from the main table
//     }
//   >;

//   //   const maps = {};

//   const relationNames = [];
//   const maps = {};
//   const __ = {
//     form: {} as FormType<any>,

//     many<T1>(name: string, manyTable: T1) {
//       __.form[name] = {
//         scope: "many",
//         relation: manyTable,
//       };
//       maps[name] = {} as Many<T1["_"]["name"]>;
//       relationNames.push(name);
//       // register the name and type in maps
//       return __;
//     },

//     one<T1>(name: string, oneTable: T1) {
//       const rel: FormType<T1>[number] = {
//         scope: "one",
//         relation: oneTable,
//         referenceKeys: [oneTable.id as keyof T1],
//       };
//       relationNames.push(name);
//       const _ctx = {
//         locals(...keys: (keyof T)[]) {
//           rel.relationKeys = keys;
//           return _ctx;
//         },
//         foreigns(...keys: (keyof T1)[]) {
//           rel.referenceKeys = keys;
//           return _ctx;
//         },
//         ret() {
//           __.form[name] = rel;
//           maps[name] = {} as One<T1["_"]["name"]>;
//           // register the name and type in maps
//           return __;
//         },
//       };
//       return _ctx;
//     },

//     // Final result function
//     res() {
//       // Record<string, Relation<any>>
//       return relations<TableName, { [id in typeof relationNames]: any }>(
//         table,
//         (r) => {
//           // extracted all generated types in map to create reuslt type
//           // const result: typeof maps = {};
//           const result: typeof maps = {} as typeof maps;
//           // Record<T["_"]["name"], any>
//           Object.entries(__.form).forEach(([key, value]) => {
//             type ScopName = (typeof value.relation)["_"]["name"];
//             //   result[key] = r[value.scope](
//             //     value.relation,
//             //     value.scope === "one"
//             //       ? {
//             //           fields: value.relationKeys?.map((k) => value.relation[k]),
//             //           references: value.referenceKeys?.map((k) => table[k]),
//             //         }
//             //       : {},
//             //   );
//             if (value.scope === "one") {
//               // Type assertion to One<...>
//               result[key] = r.one(value.relation, {
//                 fields: value.relationKeys
//                   ? value.relationKeys.map((k) => value.relation[k])
//                   : [],
//                 references: value.referenceKeys
//                   ? value.referenceKeys.map((k) => table[k])
//                   : [],
//               }) as One<ScopName, any>; // Adjust generics as necessary
//             } else if (value.scope === "many") {
//               // Type assertion to Many<...>
//               result[key] = r.many(value.relation, {}) as Many<ScopName, any>; // Adjust generics as necessary
//             }
//           });
//           return result;
//         },
//       );
//     },
//   };

//   return __;
// }

// // Utility function to handle relations
// export function _relation2<T>(table: T) {
//   // Define the types
//   type TableName = T["_"]["name"];
//   type FormType<T1> = Record<
//     string,
//     {
//       scope: "one" | "many";
//       relation: T1;
//       relationKeys?: (keyof T1)[];
//       referenceKeys?: (keyof T)[];
//     }
//   >;

//   const __ = {
//     form: {} as FormType<any>,

//     // Function for "many" relation
//     many<T1 extends { _name: string }>(name: string, manyTable: T1) {
//       __.form[name] = {
//         scope: "many",
//         relation: manyTable,
//       };
//       return __;
//     },

//     // Function for "one" relation
//     one<T1 extends { _name: string }>(name: string, oneTable: T1) {
//       const rel: FormType<T1>[number] = {
//         scope: "one",
//         relation: oneTable,
//         referenceKeys: [oneTable.id as keyof T1],
//       };

//       const _ctx = {
//         locals(...keys: (keyof T1)[]) {
//           rel.relationKeys = keys;
//           return _ctx;
//         },
//         foreigns(...keys: (keyof T)[]) {
//           rel.referenceKeys = keys;
//           return _ctx;
//         },
//         ret() {
//           __.form[name] = rel;
//           return __;
//         },
//       };
//       return _ctx;
//     },

//     // Final result function that generates Drizzle-compatible relations
//     res() {
//       return relations<TableName, Record<string, Relation<any>>>(table, (r) => {
//         const result: Record<string, Relation<any>> = {};
//         Object.entries(__.form).forEach(([key, value]) => {
//           type ScopName = (typeof value.relation)["_"]["name"];
//           if (value.scope === "one") {
//             // Type assertion to One<...>
//             result[key] = r.one(value.relation, {
//               fields: value.relationKeys
//                 ? value.relationKeys.map((k) => value.relation[k])
//                 : [],
//               references: value.referenceKeys
//                 ? value.referenceKeys.map((k) => table[k])
//                 : [],
//             }) as One<ScopName, any>; // Adjust generics as necessary
//           } else if (value.scope === "many") {
//             // Type assertion to Many<...>
//             result[key] = r.many(value.relation, {}) as Many<ScopName, any>; // Adjust generics as necessary
//           }
//           //   result[key] = r[value.scope](
//           //     value.relation,
//           //     value.scope === "one"
//           //       ? {
//           //           fields: value.relationKeys?.map((k) => value.relation[k]),
//           //           references: value.referenceKeys?.map((k) => table[k]),
//           //         }
//           //       : {},
//           //   );
//         });
//         return result;
//       });
//     },
//   };

//   return __;
// }

// // Example usage of your custom utility function
