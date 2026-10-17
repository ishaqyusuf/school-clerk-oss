"use client";

import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { Button } from "@school-clerk/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import {
	Briefcase,
	CalendarPlus,
	ChevronDown,
	CreditCard,
	IdCard,
	Package,
	Plus,
	School,
} from "lucide-react";
import Link from "next/link";

export function ReceivePaymentAction() {
	const { setParams } = useReceivePaymentParams();

	return (
		<Button
			className="w-fit gap-2"
			onClick={() => setParams({ receivePayment: true })}
		>
			<CreditCard className="h-4 w-4" />
			Receive Payment
		</Button>
	);
}

export function CollectByClassAction() {
	return (
		<Button asChild variant="outline" className="w-fit gap-2">
			<Link href="/finance/student-payments/class">
				<School className="h-4 w-4" />
				Collect by class
			</Link>
		</Button>
	);
}

export function PaySalariesAction() {
	const { setParams } = useFinanceSheetParams();

	return (
		<Button className="w-fit gap-2" onClick={() => setParams({ paySalaries: true })}>
			<IdCard className="h-4 w-4" />
			Pay salaries
		</Button>
	);
}

/** Adds this month's or this term's salaries from each staff member's pay setup. */
export function CreateSalariesAction({
	variant = "outline",
}: {
	variant?: "default" | "outline";
}) {
	const { setParams } = useFinanceSheetParams();

	return (
		<Button
			variant={variant}
			className="w-fit gap-2"
			onClick={() => setParams({ createSalaries: true })}
		>
			<CalendarPlus className="h-4 w-4" />
			Create salaries
		</Button>
	);
}

export function PayServiceAction() {
	const { setParams } = useFinanceSheetParams();

	return (
		<Button
			className="w-fit gap-2"
			onClick={() => setParams({ recordExpense: "SERVICE" })}
		>
			<Briefcase className="h-4 w-4" />
			Pay for a service
		</Button>
	);
}

export function RecordPurchaseAction() {
	const { setParams } = useFinanceSheetParams();

	return (
		<Button
			className="w-fit gap-2"
			onClick={() => setParams({ recordExpense: "PURCHASE" })}
		>
			<Package className="h-4 w-4" />
			Record a purchase
		</Button>
	);
}

/** The four everyday jobs from one button. */
export function FinanceNewMenu() {
	const { setParams } = useFinanceSheetParams();
	const { setParams: setReceivePaymentParams } = useReceivePaymentParams();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className="w-fit gap-2">
					<Plus className="h-4 w-4" />
					New
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuItem
					onSelect={() => setReceivePaymentParams({ receivePayment: true })}
				>
					<CreditCard className="mr-2 h-4 w-4" />
					Receive student payment
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => setParams({ paySalaries: true })}>
					<IdCard className="mr-2 h-4 w-4" />
					Pay salaries
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() => setParams({ recordExpense: "SERVICE" })}
				>
					<Briefcase className="mr-2 h-4 w-4" />
					Pay for a service
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() => setParams({ recordExpense: "PURCHASE" })}
				>
					<Package className="mr-2 h-4 w-4" />
					Record a purchase
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
