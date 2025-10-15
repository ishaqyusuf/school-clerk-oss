"use client";
import { Menu } from "@/components/menu";
import { Button } from "@school-clerk/ui/button";
import { transformData } from "./data";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@school-clerk/ui/use-toast";

export function Generate({}) {
  const data = transformData();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const submit = useMutation(
    trpc.ftd.generateFirstTermData.mutationOptions({
      onSuccess(data, variables, context) {
        console.log("SUCCESS!", data);
        toast({
          title: "Success!",
          description: "Data generated successfully!",
        });
        qc.invalidateQueries({ queryKey: trpc.ftd.classRooms.queryKey() });
      },
      onError(error, variables, context) {
        console.log("ERROR!", data);
      },
    }),
  );
  return (
    <div className="flex  items-center">
      <Menu>
        {data.map((c, i) => (
          <Menu.Item
            onClick={(e) => {
              submit.mutate({
                payload: [c],
              });
            }}
            key={i}
          >
            {c.course}
          </Menu.Item>
        ))}
      </Menu>
      <Button
        disabled={submit.isPending}
        onClick={(e) => {
          submit.mutate({
            payload: data,
          });
        }}
      >
        Generate
      </Button>
    </div>
  );
}
