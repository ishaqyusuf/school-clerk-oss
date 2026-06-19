"use client";

import { updateTableSettingsAction } from "@/actions/update-table-settings-action";
import {
	TABLE_SETTINGS_COOKIE,
	type TableId,
	type TableSettings,
	type TableViewMode,
	mergeWithDefaults,
	normalizeColumnOrder,
} from "@/utils/table-settings";
import type {
	ColumnOrderState,
	ColumnSizingState,
	VisibilityState,
} from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseTableSettingsProps {
	tableId: TableId;
	initialSettings?: Partial<TableSettings>;
	columnIds?: string[];
	showColumnDividers?: boolean;
}

interface UseTableSettingsReturn {
	columnVisibility: VisibilityState;
	setColumnVisibility: Dispatch<SetStateAction<VisibilityState>>;
	columnSizing: ColumnSizingState;
	setColumnSizing: Dispatch<SetStateAction<ColumnSizingState>>;
	columnOrder: ColumnOrderState;
	setColumnOrder: Dispatch<SetStateAction<ColumnOrderState>>;
	showColumnDividers: boolean;
	setShowColumnDividers: Dispatch<SetStateAction<boolean>>;
	viewMode: TableViewMode;
	setViewMode: Dispatch<SetStateAction<TableViewMode>>;
}

/**
 * Hook for managing table column settings (visibility, sizing, order)
 * with automatic persistence to a single unified cookie.
 */
export function useTableSettings({
	tableId,
	initialSettings,
	columnIds,
	showColumnDividers: defaultShowColumnDividers,
}: UseTableSettingsProps): UseTableSettingsReturn {
	// Merge initial settings with defaults
	const settings = mergeWithDefaults(initialSettings, tableId);

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		settings.columns,
	);
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
		settings.sizing,
	);
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
		columnIds
			? normalizeColumnOrder(settings.order, columnIds)
			: settings.order,
	);
	const [showColumnDividers, setShowColumnDividers] = useState<boolean>(
		defaultShowColumnDividers ?? settings.showColumnDividers ?? false,
	);
	const [viewMode, setViewMode] = useState<TableViewMode>(
		settings.viewMode ?? "table",
	);

	// Track initial mount to skip first persist
	const isInitialMount = useRef(true);

	// Debounce timer ref
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Persist settings to unified cookie
	const persistSettings = useCallback(
		(
			visibility: VisibilityState,
			sizing: ColumnSizingState,
			order: ColumnOrderState,
			columnDividers: boolean,
			nextViewMode: TableViewMode,
		) => {
			// Clear existing debounce
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}

			// Debounce persistence to avoid excessive cookie writes during resize
			debounceRef.current = setTimeout(async () => {
				try {
					// Read current cookie value to preserve other table settings
					const existingCookie = document.cookie
						.split("; ")
						.find((row) => row.startsWith(`${TABLE_SETTINGS_COOKIE}=`));

					let allSettings: Record<string, Partial<TableSettings>> = {};
					if (existingCookie) {
						try {
							allSettings = JSON.parse(
								decodeURIComponent(existingCookie.split("=")[1] ?? "{}"),
							);
						} catch {
							// Invalid JSON, start fresh
							allSettings = {};
						}
					}

					// Update only this table's settings
					allSettings[tableId] = {
						columns: visibility,
						sizing: sizing,
						order: order,
						showColumnDividers: columnDividers,
						viewMode: nextViewMode,
					};

					// Persist to server action (which sets the cookie)
					await updateTableSettingsAction({
						key: TABLE_SETTINGS_COOKIE,
						data: allSettings,
					});
				} catch (error) {
					console.error("Failed to persist table settings:", error);
				}
			}, 300);
		},
		[tableId],
	);

	// Effect to persist changes (skip initial mount)
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}

		persistSettings(
			columnVisibility,
			columnSizing,
			columnOrder,
			showColumnDividers,
			viewMode,
		);
	}, [
		columnVisibility,
		columnSizing,
		columnOrder,
		showColumnDividers,
		viewMode,
		persistSettings,
	]);

	// Cleanup debounce on unmount
	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	return {
		columnVisibility,
		setColumnVisibility,
		columnSizing,
		setColumnSizing,
		columnOrder,
		setColumnOrder,
		showColumnDividers,
		setShowColumnDividers,
		viewMode,
		setViewMode,
	};
}
