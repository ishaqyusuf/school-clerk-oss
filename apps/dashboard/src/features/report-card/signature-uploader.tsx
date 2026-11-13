"use client";

import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { toast } from "@school-clerk/ui/use-toast";
import { ImageUp, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { prepareSignatureImage } from "./signature-image";

export function SignatureUploader({
	value,
	onChange,
	disabled,
	label = "Signature",
	className,
}: {
	value: string | null | undefined;
	onChange: (value: string | null) => void;
	disabled?: boolean;
	label?: string;
	className?: string;
}) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);

	async function handleFile(file: File | undefined) {
		if (!file) return;
		setBusy(true);
		try {
			onChange(await prepareSignatureImage(file));
		} catch (error) {
			toast({
				title: "Signature not added",
				description:
					error instanceof Error ? error.message : "Try another image.",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	return (
		<div className={cn("flex items-center gap-3", className)}>
			<div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-md border border-dashed bg-white">
				{value ? (
					<img
						alt={label}
						src={value}
						className="max-h-14 max-w-36 object-contain"
					/>
				) : (
					<span className="text-xs text-neutral-500">No signature</span>
				)}
			</div>
			<div className="flex flex-wrap gap-2">
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept="image/png,image/jpeg,image/webp"
					className="sr-only"
					disabled={disabled || busy}
					onChange={(event) => void handleFile(event.target.files?.[0])}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled || busy}
					onClick={() => inputRef.current?.click()}
				>
					<ImageUp data-icon="inline-start" />
					{busy ? "Preparing…" : value ? "Replace" : "Upload"}
				</Button>
				{value ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={disabled || busy}
						onClick={() => onChange(null)}
					>
						<Trash2 data-icon="inline-start" />
						Remove
					</Button>
				) : null}
			</div>
		</div>
	);
}
