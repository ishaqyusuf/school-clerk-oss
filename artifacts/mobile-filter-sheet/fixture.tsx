"use client";
import { useState } from "react";
import { MobileFilterButton, type FilterValues } from "@school-clerk/ui/search-filter/mobile-filter-sheet";
import { DateRangeFilter } from "@school-clerk/ui/search-filter/date-range-filter";
import { formatDateFilterLabel } from "@school-clerk/ui/search-filter/date-filter-model";
import { Button } from "@school-clerk/ui/button";

export default function FilterSheetQA() {
  const [values, setValues] = useState<FilterValues>({q:"Retained search",status:"active",assignees:["1"]});
  const [state, setState] = useState("ready");
  return <main className="p-4 space-y-4">
    <h1>Shared filter QA fixture</h1>
    <p>Synthetic metadata. No school data writes.</p>
    <div className="flex gap-2"><Button onClick={() => setState("loading")}>Loading mode</Button><Button onClick={() => setState("error")}>Error mode</Button><Button onClick={() => setState("empty")}>Empty mode</Button></div>
    <MobileFilterButton values={values} onApply={(patch) => setValues((current) => ({...current,...patch}))} loading={state === "loading"} error={state === "error" ? "Could not load filters." : undefined} onRetry={() => setState("ready")} groups={state === "empty" ? [] : [
      {key:"status",label:"Status",options:[{value:"active",label:"Active"},{value:"pending",label:"Pending"}]},
      {key:"assignees",label:"Assignees",multiple:true,options:Array.from({length:24},(_,i) => ({value:String(i+1),label:`Teacher ${i+1}`}))},
      {key:"date",label:"Date",type:"date-range"},
    ]} summary={(group,value) => group.type === "date-range" ? formatDateFilterLabel(value) || "All dates" : undefined} renderGroup={(group,value,update) => group.type === "date-range" ? <DateRangeFilter mobile value={value} onChange={(date) => update({date})} /> : undefined} />
    <output aria-label="Applied values">{JSON.stringify(values)}</output>
  </main>;
}
