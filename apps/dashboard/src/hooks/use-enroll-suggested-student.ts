"use client";

import { useStudentFormContext } from "@/components/students/form-context";
import { useTRPC } from "@/trpc/client";
import { entrollStudentToTermSchema } from "@school-clerk/assessment-results";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { invalidateStudentFinanceQueries } from "./invalidate-student-finance";
import { useAuth } from "./use-auth";

export function useEnrollSuggestedStudent(onSelect?: () => void) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const { getValues } = useStudentFormContext();
	const workspaceKey = JSON.stringify([
		auth.id,
		auth.sessionId,
		auth.profile?.schoolId,
		auth.profile?.sessionId,
		auth.profile?.termId,
	]);
	const current = useRef({ workspaceKey, onSelect });
	current.current = { workspaceKey, onSelect };
	const mounted = useRef(true);
	const activeRequest = useRef(false);
	const requestWorkspace = useRef("");
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const mutation = useMutation(
		trpc.academics.entrollStudentToTerm.mutationOptions({
			retry: false,
			networkMode: "always",
			onSuccess(result, variables) {
				if (!variables) return;
				invalidateStudentFinanceQueries(queryClient, trpc, {
					studentIds: [variables.studentId],
					termFormIds: [result.studentTermFormId],
				});
				for (const queryKey of [
					trpc.students.suggestions.queryKey(),
					trpc.classrooms.getCurrentSessionClassroom.queryKey(),
					trpc.classrooms.getClassroomOverview.queryKey(),
				]) {
					void queryClient.invalidateQueries({ queryKey });
				}
				const values = getValues();
				if (
					mounted.current &&
					current.current.workspaceKey === requestWorkspace.current &&
					values.classRoomId === variables.classroomDepartmentId &&
					values.termForms?.[0]?.sessionTermId === variables.sessionTermId
				)
					current.current.onSelect?.();
			},
			meta: {
				toastTitle: {
					loading: "Enrolling…",
					success: "Enrollment confirmed",
					error: "Enrollment could not be confirmed",
				},
			},
		}),
	);

	async function enroll(studentId: string) {
		if (
			activeRequest.current ||
			!mounted.current ||
			!["ADMIN", "REGISTRAR"].includes(auth.role?.toUpperCase() ?? "") ||
			auth.isPending ||
			auth.isProfileLoading ||
			auth.isProfileError ||
			auth.profile?.auth?.userId !== auth.id
		)
			return;
		const form = getValues();
		const termForm = form.termForms?.[0];
		if (
			termForm?.schoolSessionId !== auth.profile?.sessionId ||
			termForm?.sessionTermId !== auth.profile?.termId
		) {
			toast({
				title:
					"Your academic workspace changed. Refresh the form before enrolling.",
				variant: "error",
			});
			return;
		}
		const parsed = entrollStudentToTermSchema.safeParse({
			studentId,
			classroomDepartmentId: form.classRoomId,
			sessionTermId: termForm?.sessionTermId,
			schoolSessionId: termForm?.schoolSessionId,
		});
		if (!parsed.success) {
			toast({
				title: "Choose a class below before enrolling this student.",
				variant: "error",
			});
			return;
		}
		activeRequest.current = true;
		requestWorkspace.current = workspaceKey;
		try {
			await mutation.mutateAsync(parsed.data);
		} catch {
			/* Mutation state retains the error for recovery. */
		} finally {
			activeRequest.current = false;
		}
	}
	return {
		...mutation,
		enroll,
		enrollingId:
			mutation.isPending && mutation.variables
				? mutation.variables.studentId
				: null,
	};
}
