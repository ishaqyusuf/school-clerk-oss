"use client";

import { naira, payrollCadence } from "@/components/finance/payroll/payroll-cadence";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import { useQuery } from "@tanstack/react-query";

function Amount({ value }: { value: number }) {
	return (
		<span className={value ? "tabular-nums" : "text-muted-foreground tabular-nums"}>
			{value ? naira.format(value) : "—"}
		</span>
	);
}

/** Admin list of every staff member's pay frequency and amounts. */
export function StaffPaySetupTable() {
	const trpc = useTRPC();
	const { setParams } = useFinanceSheetParams();
	const { data: staff, isLoading, error } = useQuery(
		trpc.finance.getPayrollSetup.queryOptions(),
	);

	if (error) {
		return (
			<p className="rounded-md border p-6 text-muted-foreground text-sm">
				{error.message}
			</p>
		);
	}
	if (isLoading) {
		return <p className="text-muted-foreground text-sm">Loading staff…</p>;
	}
	if (!staff?.length) {
		return (
			<p className="rounded-md border p-6 text-muted-foreground text-sm">
				No staff yet. Add staff under People → Staff, then set their pay here.
			</p>
		);
	}

	const setUp = staff.filter((member) => member.structure?.isActive).length;

	return (
		<div className="flex flex-col gap-3">
			<p className="text-muted-foreground text-sm">
				{setUp} of {staff.length} staff have pay set up. Create salaries uses
				these amounts.
			</p>
			<div className="overflow-x-auto rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Staff</TableHead>
							<TableHead>How often</TableHead>
							<TableHead className="text-right">Base</TableHead>
							<TableHead className="text-right">Allowances</TableHead>
							<TableHead className="text-right">Bonus</TableHead>
							<TableHead className="text-right">Deductions</TableHead>
							<TableHead className="text-right">Advances</TableHead>
							<TableHead className="text-right">Take-home</TableHead>
							<TableHead>Paid from</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{staff.map((member) => {
							const structure = member.structure;
							const cadence = structure ? payrollCadence(structure.cadence) : null;
							return (
								<TableRow key={member.id}>
									<TableCell>
										<div className="font-medium">{member.name}</div>
										{member.title ? (
											<div className="text-muted-foreground text-xs">
												{member.title}
											</div>
										) : null}
									</TableCell>
									{structure && cadence ? (
										<>
											<TableCell>
												<div className="flex items-center gap-2">
													{cadence.label}
													{structure.isActive ? null : (
														<Badge variant="outline">Off</Badge>
													)}
												</div>
											</TableCell>
											<TableCell className="text-right">
												<Amount value={structure.baseAmount} />
											</TableCell>
											<TableCell className="text-right">
												<Amount value={structure.allowanceAmount} />
											</TableCell>
											<TableCell className="text-right">
												<Amount value={structure.bonusAmount} />
											</TableCell>
											<TableCell className="text-right">
												<Amount value={structure.deductionAmount} />
											</TableCell>
											<TableCell className="text-right">
												<Amount value={structure.advanceAmount} />
											</TableCell>
											<TableCell className="text-right font-medium">
												<Amount value={structure.netAmount} />
												{cadence.per ? (
													<div className="font-normal text-muted-foreground text-xs">
														{cadence.per}
													</div>
												) : null}
											</TableCell>
											<TableCell>{structure.stream?.name}</TableCell>
										</>
									) : (
										<TableCell colSpan={8} className="text-muted-foreground">
											Not set up
										</TableCell>
									)}
									<TableCell className="text-right">
										<Button
											size="sm"
											variant={structure ? "outline" : "default"}
											onClick={() => setParams({ staffPayStaffId: member.id })}
										>
											{structure ? "Edit" : "Set pay"}
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
