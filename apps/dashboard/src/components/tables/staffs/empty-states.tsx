"use client";

import { useStaffParams } from "@/hooks/use-staff-params";

import { Button } from "@school-clerk/ui/button";

export function EmptyState() {
	const { setParams } = useStaffParams();

	return (
		<div className="flex items-center justify-center ">
			<div className="mt-40 flex flex-col items-center">
				<div className="mb-6 space-y-2 text-center">
					<h2 className="text-lg font-medium">No teachers</h2>
					<p className="text-sm text-[#606060]">
						You haven't added any teachers yet. <br />
						Go ahead and create your first one.
					</p>
				</div>

				<Button
					variant="outline"
					onClick={() =>
						setParams({
							createStaff: true,
						})
					}
				>
					Create Staff
				</Button>
			</div>
		</div>
	);
}

export function NoResults() {
	const q = useStaffParams();
	return (
		<div className="flex items-center justify-center ">
			<div className="mt-40 flex flex-col items-center">
				<div className="mb-6 space-y-2 text-center">
					<h2 className="text-lg font-medium">No results</h2>
					<p className="text-sm text-[#606060]">
						Try another search, or adjusting the filters
					</p>
				</div>

				<Button
					variant="outline"
					onClick={() =>
						q.setParams({
							createStaff: true,
						})
					}
				>
					Create
				</Button>
			</div>
		</div>
	);
}
