import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@school-clerk/ui/button";
import { Dialog, Field, InputGroup, Tabs } from "@school-clerk/ui/composite";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { ImportActivity } from "./import-activities";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function StudentImportModal() {
  const [{ action }, setParams] = useQueryStates({
    action: parseAsString,
  });
  const [ls, setLs] = useLocalStorage("student-import-data", "");
  const form = useZodForm(
    z.object({
      raw: z.string(),
    }),
    {
      defaultValues: {
        raw: ls,
      },
    }
  );
  const [tab, setTab] = useState("main");
  const onSubmit = ({ raw }) => {
    setTab("importing");
    // console.log(parse);
  };
  const open = action == "student-import";
  const raw = form.watch("raw");
  const parse = useMemo(() => {
    const data: {
      error?: false;
      classrooms: { title: string }[];
      students: {
        name: string;
        surname: string;
        otherName?: string;
        gender?: string;
        classRoom: string;
      }[];
    } = {
      classrooms: [],
      students: [],
    };
    let classRoom = undefined;
    let _gender = null;
    raw.split("\n").map((a) => {
      const [name, surname, otherName, gender, _classRoom] = a
        ?.split(",")
        ?.map((a) => a.trim());
      if (!name) {
        if (_gender === "M") {
          _gender = "F";
          // classRoom = null;
        }
        return;
      }
      if (!surname) {
        classRoom = name;
        _gender = null;
        return;
      }
      if (!_gender) _gender = "M";
      data.students.push({
        name,
        surname,
        otherName,
        gender: gender || _gender,
        classRoom: _classRoom || classRoom,
      });
    });
    return data;
  }, [raw]);
  useEffect(() => {
    setLs(raw);
  }, [raw]);
  // const [tab,setTab] = use
  //   const [text, setText] = useState("");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        // setParams(null);
      }}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Import</Dialog.Title>
          <Dialog.Description></Dialog.Description>
        </Dialog.Header>
        <Tabs.Root value={tab}>
          <Tabs.Content value="main">
            <form id="form-rhf-demo" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid w-full gap-6">
                <Field.Group>
                  <Controller
                    name="raw"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Field.Label htmlFor="student-data">
                          Student Data
                        </Field.Label>

                        <InputGroup>
                          <InputGroup.TextArea
                            {...field}
                            dir="rtl"
                            aria-invalid={fieldState.invalid}
                            //   data-slot="input-group-control"
                            className="min-h-[20vh]"
                            placeholder="Paste your student data here..."
                          />
                          <InputGroup.Addon align="block-end">
                            <p className="text-xs text-muted-foreground mt-1">
                              {parse?.students?.length} students
                            </p>
                            <InputGroup.Button
                              type="submit"
                              className="ml-auto"
                              size="sm"
                              variant="default"
                            >
                              Submit
                            </InputGroup.Button>
                          </InputGroup.Addon>
                        </InputGroup>
                      </Field>
                    )}
                  />
                </Field.Group>
              </div>
            </form>
          </Tabs.Content>
          <Tabs.Content value="importing">
            <ImportActivity
              classrooms={parse?.classrooms}
              students={parse?.students}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
