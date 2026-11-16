"use client";

import type { AssistantAccountAction } from "@school-clerk/ai/contracts";
import { useQuickAssistantStore } from "./quick-assistant";
import { create } from "zustand";

type Registration = Extract<
	AssistantAccountAction,
	{ action: "register_student" }
>;
type Correction = Extract<
	AssistantAccountAction,
	{ action: "correct_student" }
>;

type Seed =
	| { kind: "register"; input: Registration }
	| { kind: "correct"; studentId: string; input: Correction };

export const useAssistantStudentForm = create<{
	seed: (Seed & { scope: string | null }) | null;
	setSeed: (seed: Seed | null) => void;
}>((set) => ({
	seed: null,
	setSeed: (seed) =>
		set({
			seed: seed && { ...seed, scope: useQuickAssistantStore.getState().scope },
		}),
}));
