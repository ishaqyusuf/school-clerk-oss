"use server";

import { tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { actionClient } from "./safe-action";
// import { exampleTaskPayload, type ExampleTaskPayload } from "@jobs/schema";
export const exampleTaskAction = actionClient
  .schema(
    z.object({
      connectionId: z.string(),
    })
  )
  .metadata({
    name: "manual-sync-transactions",
    track: {
      //   event: LogEvents.TransactionsManualSync.name,
      //   channel: LogEvents.TransactionsManualSync.channel,
    },
  })
  // .schema(exampleTaskPayload)
  .action(async ({ parsedInput: {} }) => {
    // const event = await tasks.trigger(
    //   "example-task",
    //   {} satisfies ExampleTaskPayload,
    // );
    // return event;
  });
