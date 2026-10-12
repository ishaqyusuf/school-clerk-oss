"use client";
import { useState } from "react";
import { Button } from "@school-clerk/ui/button";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { AssistantSettings } from "./assistant-settings";
export function AssistantSettingsPage() {
	const [open, setOpen] = useState(true);
	return (
		<>
			<PageTitle>Assistant settings</PageTitle>
			<Button onClick={() => setOpen(true)}>Manage assistant</Button>
			<AssistantSettings open={open} onOpenChange={setOpen} />
		</>
	);
}
