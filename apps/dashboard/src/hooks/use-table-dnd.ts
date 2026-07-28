"use client";

import {
	type DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Table } from "@tanstack/react-table";
import { useCallback } from "react";

export function useTableDnd<TData>(table: Table<TData>) {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;

			const currentOrder = table.getAllLeafColumns().map((column) => column.id);
			const oldIndex = currentOrder.indexOf(String(active.id));
			const newIndex = currentOrder.indexOf(String(over.id));

			if (oldIndex === -1 || newIndex === -1) return;
			table.setColumnOrder(arrayMove(currentOrder, oldIndex, newIndex));
		},
		[table],
	);

	return { sensors, handleDragEnd };
}
