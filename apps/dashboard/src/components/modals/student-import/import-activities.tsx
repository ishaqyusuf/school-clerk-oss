import { _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import { Tabs } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
interface Props {
  classrooms: { title: string }[];
  students: {
    name: string;
    surname: string;
    otherName?: string;
    gender?: string;
    classRoom: string;
  }[];
}
export function ImportActivity({ classrooms, students }: Props) {
  const { data: records } = useQuery(
    _trpc.students.studentsRecentRecord.queryOptions({})
  );
  const form = useZodForm(
    z.object({
      activities: z.array(
        z.object({
          resolution: z.enum([
            "create_term",
            "create",
            "ignore",
            "delete_match",
          ]),
          status: z.enum(["ready", "conflict"]),
          matching: z.object({
            name: z.string(),
            surname: z.string(),
            otherName: z.string().optional().nullable(),
            gender: z.string().optional().nullable(),
            classRoom: z.string(),
            classRoomId: z.string(),
            termId: z.string(),
            termSheetId: z.string(),
            termName: z.string(),
          }),
          student: z.object({
            name: z.string(),
            surname: z.string(),
            otherName: z.string().optional().nullable(),
            gender: z.string().optional().nullable(),
            classRoom: z.string(),
          }),
        })
      ),
    })
  );

  useEffect(() => {}, [records, classrooms, students]);
  const { fields, append, insert, update } = useFieldArray({
    name: "activities",
    control: form.control,
    keyName: "_id",
  });
  return (
    <>
      <Tabs.Root>
        <Tabs.List>
          <Tabs.Trigger value="activties">Activities</Tabs.Trigger>
          <Tabs.Trigger value="conflicts">Conflicts</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="activities">
          <div className="space-y-2 font-mono text-xs max-h-96 overflow-y-auto">
            {fields.length === 0 ? (
              <div className="text-muted-foreground">No activities yet</div>
            ) : (
              fields.map((activity, idx) => (
                <motion.div
                  key={activity._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-2 rounded border ${
                    statusColors[activity.status]
                  } flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">
                      {statusIcon[activity.status]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        <span className="text-muted-foreground">
                          line {idx + 1}:
                        </span>{" "}
                        <span className="font-medium">
                          {activity.student.name} {activity.student.surname}
                        </span>
                        {activity.student.classRoom && (
                          <span className="text-muted-foreground ml-1">
                            ({activity.student.classRoom})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {activity.status}
                      </div>
                    </div>
                  </div>
                  {/* {activity.action && (
                    <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {activity.action}
                    </div>
                  )} */}
                </motion.div>
              ))
            )}
          </div>
        </Tabs.Content>
        <Tabs.Content value="conflicts"></Tabs.Content>
      </Tabs.Root>
    </>
  );
}
const statusColors = {
  pending: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  success: "text-green-600 bg-green-50 dark:bg-green-900/20",
  conflict: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  error: "text-red-600 bg-red-50 dark:bg-red-900/20",
};
const statusIcon = {
  pending: "⏳",
  success: "✓",
  conflict: "⚠",
  error: "✕",
};
