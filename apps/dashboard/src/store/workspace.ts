import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useWorkspaceStore = create()(
  persist(
    (set, get) => ({
      bearerToken: "",
      sessionId: "",
      termId: "",
      schoolId: "",
      authSessionId: "",
      //   addABear: () => set({ bears: get().bears + 1 }),
    }),
    {
      name: "workspace-store", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
