import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import {
  Accordion,
  DropdownMenu,
  Empty,
  Item,
} from "@school-clerk/ui/composite";
import { useEffect, useState } from "react";
import { AssessmentForm, AssessmentFormAction } from "./forms/assessment-form";
import {
  getAssessmentSuggestions,
  saveAssessementSchema,
} from "@api/db/queries/assessments";
import { _qc, _trpc } from "./static-trpc";
import { Badge } from "@school-clerk/ui/badge";
import { Icons } from "@school-clerk/ui/icons";
import { useSubjectParams } from "@/hooks/use-subject-params";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ButtonGroup } from "@school-clerk/ui/button-group";
import { ListPlus } from "lucide-react";
import { Separator } from "@school-clerk/ui/separator";

interface Props {
  overview: RouterOutputs["subjects"]["overview"];
}
export function SubjectAssessments(props: Props) {
  const assessments = props.overview?.subject?.assessments;
  const [view, setView] = useState("general");
  const [defaultFormValue, setDefaultFormValue] =
    useState<typeof saveAssessementSchema._type>(null);
  useEffect(() => {
    // if (defaultFormValue)
    setView(defaultFormValue ? "form" : "general");
  }, [defaultFormValue]);
  const deptSubjectId = props.overview.subject.id;
  const { data: suggestions, refetch } = useQuery(
    _trpc.assessments.getAssessmentSuggestions.queryOptions(
      {
        deptSubjectId,
      },
      {
        enabled: !!deptSubjectId,
      }
    )
  );
  const { isPending, mutate } = useMutation(
    _trpc.assessments.saveAssessement.mutationOptions({
      onSuccess(data, variables, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.overview.queryKey({}),
        });
        refetch();
      },
      onError(data, variables, context) {},
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Saving...",
          success: "Success",
        },
      },
    })
  );
  const { setParams } = useSubjectParams();
  return (
    <>
      <div className="grid gap-2">
        <Accordion
          collapsible
          type="single"
          onValueChange={setView}
          value={view}
        >
          <Accordion.Item className="border-none" value="general">
            <Accordion.Content>
              <div className="flex gap-2">
                <div className="flex-1"></div>
                <ButtonGroup>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      // setOpenForm("form");
                      setDefaultFormValue({
                        departmentSubjectId: deptSubjectId,
                        index: assessments?.length,
                      });
                      // setOpenForm(!openForm)
                    }}
                  >
                    Create
                  </Button>
                  <Separator orientation="vertical" />
                  <DropdownMenu dir="rtl">
                    <DropdownMenu.Trigger disabled={!suggestions?.length}>
                      <Button size="sm">
                        <ListPlus className="size-4" />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content className="">
                      {suggestions?.map((s) => (
                        <DropdownMenu.Item
                          onClick={(e) => {
                            mutate({
                              departmentSubjectId: deptSubjectId,
                              index: assessments?.length,
                              obtainable: s?.obtainable,
                              percentageObtainable: s?.percentageObtainable,
                              title: s?.title,
                            });
                          }}
                          className="pr-8"
                          key={s.uid}
                        >
                          {s.title}
                          <DropdownMenu.Sub>
                            - {s?.obtainable} | {s?.percentageObtainable}%
                          </DropdownMenu.Sub>
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </ButtonGroup>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    // setOpenForm("form");
                    setParams({
                      subjectTab: "recordings",
                    });
                    // setOpenForm(!openForm)
                  }}
                >
                  Record submission
                </Button>
              </div>
              {assessments?.length ? (
                <div className="grid gap-4 py-4">
                  {assessments.map((a) => (
                    <Item key={a.id} variant="outline" dir="rtl">
                      <Item.Content>
                        <Item.Title>{a.title}</Item.Title>
                        <div className="flex gap-4">
                          <Badge>{a.percentageObtainable}%</Badge>
                          <span>{a._count?.assessmentResults} submissions</span>
                        </div>
                      </Item.Content>
                      <Item.Actions>
                        <Button size="sm" variant="outline">
                          <Icons.Edit className="size-4" />
                        </Button>
                      </Item.Actions>
                    </Item>
                  ))}
                </div>
              ) : (
                <Empty>
                  <Empty.Content>
                    <Empty.Title>No Assessment</Empty.Title>
                    <Empty.Description>
                      You have no assessment record
                    </Empty.Description>
                  </Empty.Content>
                </Empty>
              )}
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="form" className="border-none">
            <Accordion.Content>
              <AssessmentForm defaultValues={defaultFormValue}>
                <div className="flex gap-2">
                  <div className="flex-1"></div>
                  <Button
                    onClick={(e) => {
                      setDefaultFormValue(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <AssessmentFormAction
                    onSuccess={(e) => {
                      setDefaultFormValue(null);
                      _qc.invalidateQueries({
                        queryKey: _trpc.subjects.overview.queryKey({}),
                      });
                    }}
                  />
                </div>
              </AssessmentForm>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    </>
  );
}
