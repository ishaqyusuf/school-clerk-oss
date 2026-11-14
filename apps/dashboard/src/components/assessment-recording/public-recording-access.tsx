"use client";

import { AssessmentRecordingResultsTable } from "@/components/assessment-recording-results-table";
import { useEffect, useState } from "react";

const storageKey = (token: string) =>
	`assessment-public-access:${token.split(".")[0] ?? token}`;

function readGrant(token: string) {
	try {
		return window.localStorage.getItem(storageKey(token));
	} catch {
		return null;
	}
}

function saveGrant(token: string, grant: string) {
	try {
		window.localStorage.setItem(storageKey(token), grant);
	} catch {
		// Private windows may block storage; the code is asked for again next visit.
	}
}

/** Keeps the code proof on this device so the visitor enters the code once. */
export function PublicRecordingAccess({ token }: { token: string }) {
	const [grant, setGrant] = useState<string | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setGrant(readGrant(token));
		setReady(true);
	}, [token]);

	if (!ready) return null;

	return (
		<AssessmentRecordingResultsTable
			departmentId=""
			termId=""
			publicToken={token}
			publicAccessGrant={grant}
			onPublicAccessGranted={(nextGrant) => {
				saveGrant(token, nextGrant);
				setGrant(nextGrant);
			}}
		/>
	);
}
