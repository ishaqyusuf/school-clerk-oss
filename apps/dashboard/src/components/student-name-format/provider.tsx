"use client";

import {
	DEFAULT_STUDENT_NAME_FORMAT,
	type StudentNameFormat,
	type StudentNameParts,
	formatStudentName,
} from "@school-clerk/utils/student-name";
import { type ReactNode, createContext, useCallback, useContext } from "react";

const StudentNameFormatContext = createContext<StudentNameFormat>(
	DEFAULT_STUDENT_NAME_FORMAT,
);

export function StudentNameFormatProvider({
	children,
	format,
}: {
	children: ReactNode;
	format: StudentNameFormat;
}) {
	return (
		<StudentNameFormatContext.Provider value={format}>
			{children}
		</StudentNameFormatContext.Provider>
	);
}

export function useStudentNameFormat() {
	return useContext(StudentNameFormatContext);
}

export function useStudentNameFormatter() {
	const format = useStudentNameFormat();

	return useCallback(
		(student: StudentNameParts | null | undefined) =>
			formatStudentName(student, format),
		[format],
	);
}
