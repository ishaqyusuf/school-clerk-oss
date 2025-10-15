"use client";

import { Button } from "@school-clerk/ui/button";

import { useMigrationStore } from "./store";
import { updateGenderData } from "./server";

export function GenderCell({ name }) {
  const store = useMigrationStore();
  const gender = store?.genders?.[name];
  async function updateGender(f) {
    store.update(`genders.${name}`, f as any);
    setTimeout(() => {
      updateGenderData(store.genders);
    }, 1000);
  }
  return (
    <div className="flex">
      {["Male", "Female"].map((f, i) => (
        <Button
          size="sm"
          variant={
            f != gender ? "secondary" : i == 0 ? "default" : "destructive"
          }
          className=""
          key={f}
          onClick={(e) => {
            updateGender(f);
          }}
        >
          {f?.[0]}
        </Button>
      ))}
    </div>
  );
}
