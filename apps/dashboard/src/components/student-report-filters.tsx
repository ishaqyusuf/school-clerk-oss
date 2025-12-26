import { useReportPageContext } from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { studentDisplayName } from "@/utils/utils";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Field, Item, Select } from "@school-clerk/ui/composite";
import { Label } from "@school-clerk/ui/label";
import { Separator } from "@school-clerk/ui/separator";
import { Fragment } from "react";
import { ThemeSwitch } from "./theme-switch";
import { ExternalLinkIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "./static-trpc";
import { Menu } from "@school-clerk/ui/custom/menu";

export function StudentReportFilter() {
  const { setFilters, filters } = useStudentReportFilterParams();
  const ctx = useReportPageContext();
  const { mutate: deleteTermForm, isPending: isDeleting } = useMutation(
    _trpc.students.deleteTermSheet.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {},
      onError(error, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    })
  );
  return (
    <div className="gap-4 pb-28 flex flex-col">
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
                selections: null,
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
      <Item.Separator />
      <Item asChild>
        <a
          href={`/assessment-recording?deptId=${filters.departmentId}&permission=all&termId=${filters.termId}`}
          target="_blank"
        >
          <Item.Content>
            <Item.Title>Result Entry</Item.Title>
          </Item.Content>
          <Item.Actions>
            <ExternalLinkIcon className="size-4" />
          </Item.Actions>
        </a>
      </Item>
      <Item.Separator />
      <Label>Students</Label>
      <Item.Group dir="rtl">
        {ctx?.termForms?.map((tf, tfi) => {
          const r = ctx?.reportsById?.[tf?.id];
          return (
            <Fragment key={tf.id}>
              {tfi > 0 && <Separator />}
              <Item dir="rtl" variant="muted">
                <Item.Content>
                  <Item.Title>
                    <Checkbox
                      checked={filters.selections?.includes(tfi)}
                      // checked={!!store?.selection?.[tf.id]}
                      onCheckedChange={(e) => {
                        // store.update(`selection.${tf.id}`, !!e);
                        let selections = [...(filters.selections || []), tfi];

                        setFilters({
                          selections: selections.filter(
                            (a, i) =>
                              selections.filter((b) => b === a)?.length == 1
                          ),
                        });
                      }}
                      id={`cb-${tf.id}`}
                    />
                    {studentDisplayName(tf?.student)}
                  </Item.Title>
                  <Item.Description>
                    {`${r?.summary?.results}/${r?.summary?.subjects} | ${r?.grade?.percentage}% | ${r?.grade?.position}`}
                  </Item.Description>
                </Item.Content>
                <Item.Actions>
                  <Menu triggerSize="xs" variant="secondary">
                    <Menu.Item
                      onClick={(e) => {
                        deleteTermForm({
                          id: tf?.id,
                        });
                      }}
                      icon="Delete"
                    >
                      Delete
                    </Menu.Item>
                  </Menu>
                </Item.Actions>
              </Item>
            </Fragment>
          );
        })}
      </Item.Group>
    </div>
  );
}
