"use client";

import type { TableViewMode } from "@/utils/table-settings";
import type { Column } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { create } from "zustand";

import type { Item } from "./columns";

interface StudentsTableState {
	columns: Column<Item, unknown>[];
	setColumns: (columns: Column<Item, unknown>[]) => void;
	showColumnDividers: boolean;
	setShowColumnDividers: (updater: SetStateAction<boolean>) => void;
	bindShowColumnDividers: (
		value: boolean,
		setter: Dispatch<SetStateAction<boolean>>,
	) => void;
	showColumnDividersSetter?: Dispatch<SetStateAction<boolean>>;
	viewMode: TableViewMode;
	setViewMode: (updater: SetStateAction<TableViewMode>) => void;
	bindViewMode: (
		value: TableViewMode,
		setter: Dispatch<SetStateAction<TableViewMode>>,
	) => void;
	viewModeSetter?: Dispatch<SetStateAction<TableViewMode>>;
}

export const useStudentsTableStore = create<StudentsTableState>((set) => ({
	columns: [],
	showColumnDividers: false,
	viewMode: "grid",
	setColumns: (columns) => set({ columns }),
	setShowColumnDividers: (updater) =>
		set((state) => {
			const nextValue =
				typeof updater === "function" ? updater(state.showColumnDividers) : updater;

			state.showColumnDividersSetter?.(nextValue);

			return {
				showColumnDividers: nextValue,
			};
		}),
	bindShowColumnDividers: (value, setter) =>
		set({
			showColumnDividers: value,
			showColumnDividersSetter: setter,
		}),
	setViewMode: (updater) =>
		set((state) => {
			const nextValue =
				typeof updater === "function" ? updater(state.viewMode) : updater;

			state.viewModeSetter?.(nextValue);

			return {
				viewMode: nextValue,
			};
		}),
	bindViewMode: (value, setter) =>
		set({
			viewMode: value,
			viewModeSetter: setter,
		}),
}));
