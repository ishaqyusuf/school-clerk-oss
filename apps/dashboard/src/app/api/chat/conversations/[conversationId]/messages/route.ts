import { getAssistantSessionContext } from "@/lib/assistant/server";
import { NextResponse } from "next/server";

// Assistant/system messages are persisted only from the trusted server stream.
// Keep a safe response for old clients without accepting their transcript data.
export async function POST() {
  const context = await getAssistantSessionContext();
  if (context instanceof Response) return context;
  return NextResponse.json({ error: "Chat messages are saved by the server. Refresh this client." }, { status: 405 });
}
