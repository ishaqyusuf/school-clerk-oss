import { dotObject } from "@/utils/dot-utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { Gender } from "@school-clerk/db";

import { PaymentStatus } from "./data";

const data = {
  refreshToken: null,
  genders: {} as {
    [name in string]: Gender;
  },
  studentPayments: {} as {
    [className in string]: {
      [name in string]: {
        studentId?;
        departmentId?;
        postId?;
        studentName;
        billables: {
          [term in string]: {
            amount: number;
            omit?: boolean;
            free?: boolean;
          };
        };
        payments: PaymentStatus[];
      };
    };
  },
  studentMerge: {} as {
    [className in string]: {
      [name in string]: string;
    };
  },
};
type Action = ReturnType<typeof funcs>;
type Data = typeof data;
type Store = Data & Action;
export type ZusFormSet = (update: (state: Data) => Partial<Data>) => void;

function funcs(set: ZusFormSet) {
  return {
    reset: (resetData) =>
      set((state) => ({
        ...data,
        ...resetData,
      })),
    update: <K extends FieldPath<Data>>(path: K, v: FieldPathValue<Data, K>) =>
      set((state) => {
        const newState = {
          ...state,
        };
        dotObject.set(path, v, newState, true);
        return newState;
      }),
    delete: <K extends FieldPath<Data>>(path: K) =>
      set((state) => {
        const newState = {
          ...state,
        };
        dotObject.delete(path, newState);
        return newState;
      }),
  };
}

//

export const useMigrationStore = create<Store>((set) => ({
  ...data,
  ...funcs(set),
}));

// export const useMigrationStore = create<Store>()(
//   persist(
//     (set) => ({
//       ...data,
//       ...funcs(set),
//     }),
//     // {
//     //   name: "migration-storage",
//     //   storage: createJSONStorage(() => sessionStorage),
//     // },
//   ),
// );
export const __useMigrationStore = create<Store>()(
  persist(
    (set) => ({
      ...data,
      ...funcs(set),
    }),
    {
      name: "migration-storage",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
