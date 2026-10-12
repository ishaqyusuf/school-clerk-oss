"use client";
import { create } from "zustand";
import {
	mergeAssistantRecords,
	type AssistantContextRecord,
} from "@school-clerk/ai/contracts";
type State = {
	initialized: boolean;
	opened: boolean;
	available: boolean;
	scope: string | null;
	draft: string;
	conversationId: string | null;
	records: AssistantContextRecord[];
	attachmentIds: string[];
	target: HTMLElement | null;
	open: (records?: AssistantContextRecord[]) => void;
	minimize: () => void;
	reset: () => void;
	set: (value: Partial<State>) => void;
};
const initial = {
	initialized: false,
	opened: false,
	available: false,
	scope: null,
	draft: "",
	conversationId: null,
	records: [],
	attachmentIds: [],
	target: null,
};
export const useQuickAssistantStore = create<State>((set, get) => ({
	...initial,
	open: (records = []) =>
		set({
			initialized: true,
			opened: true,
			records: mergeAssistantRecords(get().records, records),
		}),
	minimize: () => set({ opened: false }),
	reset: () => set({ ...initial }),
	set: (value) => set(value),
}));
