"use client";

import { generateRandomString } from "@/utils/utils";

import { Button } from "@school-clerk/ui/button";

import { useNameMerger } from "./params";
import { useMigrationStore } from "./store";

export function SessionViewAction({}) {
  const store = useMigrationStore();
  const { params, setParams } = useNameMerger();
  if (!params?.names?.length) return null;

  function merge() {
    const [name, ...names] = params.names;
    names.map((_name) => {
      store.update(`studentMerge.${params.classRoom}.${_name}`, name);
    });
    setParams(null, {});
    store.update("refreshToken", generateRandomString());
  }
  return (
    <div className="fixed bottom-0 left-1/2 z-10 mb-4 border bg-white p-4 py-2 shadow-sm">
      <Button
        onClick={(e) => {
          merge();
        }}
      >
        Merge
      </Button>
    </div>
  );
}
