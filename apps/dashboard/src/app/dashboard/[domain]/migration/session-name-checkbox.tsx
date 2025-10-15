"use client";

import { Checkbox } from "@school-clerk/ui/checkbox";

import { useNameMerger } from "./params";

export function SessionCheckbox({ dotName, classRoom }) {
  const { params, setParams } = useNameMerger();
  return (
    <div>
      <Checkbox
        checked={!!params.names?.includes(dotName)}
        onCheckedChange={(e) => {
          let checkList = [...(params.names || [])];
          let index = checkList?.indexOf(dotName);
          if (index > -1) checkList.splice(index, 1);
          else {
            checkList.push(dotName);
          }
          setParams({
            classRoom: checkList?.length ? classRoom : null,
            names: checkList?.length ? checkList : null,
          });
        }}
      />
    </div>
  );
}
