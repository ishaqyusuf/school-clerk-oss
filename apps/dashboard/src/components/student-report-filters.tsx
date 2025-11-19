import { useReportPageContext } from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { useReportStore } from "@/store/report";
import { studentDisplayName } from "@/utils/utils";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Field, Select } from "@school-clerk/ui/composite";
import { Label } from "@school-clerk/ui/label";
import { Separator } from "@school-clerk/ui/separator";
import { Fragment } from "react";
import { ThemeSwitch } from "./theme-switch";

export function StudentReportFilter() {
  const { setFilters, filters } = useStudentReportFilterParams();
  const ctx = useReportPageContext();
  const store = useReportStore();
  return (
    <div className="gap-4 flex flex-col">
      <div>
        <ThemeSwitch />
      </div>
      <Field.Group>
        <Field>
          <Field.Label>Classroom</Field.Label>
          <Select
            dir="rtl"
            value={filters.departmentId}
            onValueChange={(e) => {
              setFilters({
                departmentId: e,
              });
              store.reset({
                selection: {},
              });
            }}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {ctx?.classRooms?.map((c) => (
                <Select.Item value={c?.id} key={c?.id}>
                  {c?.departmentName}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </Field>
      </Field.Group>
      <Label>Students</Label>
      <Field.Group dir="rtl">
        {ctx?.termForms?.map((tf, tfi) => (
          <Fragment key={tf.id}>
            {tfi > 0 && <Separator />}
            <Field orientation="horizontal">
              <Field.Label htmlFor={`cb-${tf.id}`}>
                {studentDisplayName(tf?.student)}
              </Field.Label>
              <Checkbox
                checked={!!store?.selection?.[tf.id]}
                onCheckedChange={(e) => {
                  store.update(`selection.${tf.id}`, !!e);
                }}
                id={`cb-${tf.id}`}
              />
            </Field>
          </Fragment>
        ))}
      </Field.Group>
    </div>
  );
}
