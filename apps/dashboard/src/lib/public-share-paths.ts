/**
 * Pages a signed-out visitor may open: the public assessment-recording link.
 * The pattern also matches dev paths that carry a tenant prefix.
 */
const publicAssessmentRecordingPath =
	/(^|\/)assessment-recording\/public\/[^/]+\/?$/;

export function isPublicAssessmentRecordingPath(pathname: string) {
	return publicAssessmentRecordingPath.test(pathname);
}
