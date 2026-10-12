"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@school-clerk/ui/sheet";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Switch } from "@school-clerk/ui/switch";
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue,
} from "@school-clerk/ui/select";
import type { z } from "zod";
import { assistantSettingsSchema } from "@school-clerk/ai/contracts";
const defaults: z.infer<typeof assistantSettingsSchema> = {
	enabled: false,
	preferredProvider: "deepseek",
	preferredModel: "deepseek-chat",
	maxSteps: 5,
	dailyRequestLimit: 100,
	dailyTokenLimit: 1000000,
	concurrentRunLimit: 1,
	disabledCapabilities: [],
};
export function AssistantSettings({
	open,
	onOpenChange,
}: { open: boolean; onOpenChange: (value: boolean) => void }) {
	const trpc = useTRPC();
	const client = useQueryClient();
	const settings = useQuery(
		trpc.assistant.settings.queryOptions(undefined, { enabled: open }),
	);
	const usage = useQuery(
		trpc.assistant.usage.queryOptions(undefined, { enabled: open }),
	);
	const [value, setValue] = useState(defaults);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		if (settings.data) {
			const config = settings.data.config;
			setValue(
				config
					? {
							...defaults,
							...config,
							preferredProvider: (config.preferredProvider ??
								"deepseek") as typeof defaults.preferredProvider,
							preferredModel: config.preferredModel ?? "deepseek-chat",
							disabledCapabilities: Array.isArray(config.disabledCapabilities)
								? (config.disabledCapabilities as string[])
								: [],
						}
					: defaults,
			);
		}
	}, [settings.data]);
	const save = useMutation(
		trpc.assistant.saveSettings.mutationOptions({
			onSuccess: async () => {
				await client.invalidateQueries({ queryKey: trpc.assistant.pathKey() });
				onOpenChange(false);
			},
			onError: (e) => setError(e.message),
		}),
	);
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Assistant settings</SheetTitle>
					<SheetDescription>
						School administrators control availability and usage. Domain
						permissions still apply.
					</SheetDescription>
				</SheetHeader>
				{settings.isError ? (
					<p role="alert">Settings unavailable: {settings.error.message}</p>
				) : (
					<form
						className="mt-6 space-y-5"
						onSubmit={(event) => {
							event.preventDefault();
							setError(null);
							const parsed = assistantSettingsSchema.safeParse({
								enabled: value.enabled,
								preferredProvider: value.preferredProvider,
								preferredModel: value.preferredModel,
								maxSteps: value.maxSteps,
								dailyRequestLimit: value.dailyRequestLimit,
								dailyTokenLimit: value.dailyTokenLimit,
								concurrentRunLimit: value.concurrentRunLimit,
								disabledCapabilities: value.disabledCapabilities,
							});
							if (!parsed.success) {
								setError(parsed.error.issues[0]?.message ?? "Check settings.");
								return;
							}
							save.mutate(parsed.data);
						}}
					>
						<div className="flex items-center justify-between">
							<Label htmlFor="assistant-enabled">Enable assistant</Label>
							<Switch
								id="assistant-enabled"
								checked={value.enabled}
								onCheckedChange={(enabled) => setValue({ ...value, enabled })}
							/>
						</div>
						{settings.data && !settings.data.available && (
							<p className="text-sm text-muted-foreground">
								The school also needs the AI Assistant module enabled in module
								settings.
							</p>
						)}
						<div className="space-y-2">
							<Label>Provider</Label>
							<Select
								value={value.preferredProvider}
								onValueChange={(provider) =>
									setValue({
										...value,
										preferredProvider:
											provider as typeof value.preferredProvider,
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["deepseek", "openai", "anthropic", "gemini"].map(
										(provider) => (
											<SelectItem key={provider} value={provider}>
												{provider}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="assistant-model">Model</Label>
							<Input
								id="assistant-model"
								value={value.preferredModel}
								onChange={(e) =>
									setValue({ ...value, preferredModel: e.target.value })
								}
							/>
						</div>
						{(
							[
								["maxSteps", "Maximum steps"],
								["dailyRequestLimit", "Daily requests per user"],
								["dailyTokenLimit", "Daily token allowance per user"],
								["concurrentRunLimit", "Concurrent responses per user"],
							] as const
						).map(([key, title]) => (
							<div key={key} className="space-y-2">
								<Label htmlFor={key}>{title}</Label>
								<Input
									id={key}
									type="number"
									value={value[key]}
									onChange={(e) =>
										setValue({ ...value, [key]: Number(e.target.value) })
									}
								/>
							</div>
						))}
						<fieldset className="space-y-3">
							<legend className="mb-3 text-sm font-medium">Capabilities</legend>
							{settings.data?.capabilities.map((cap) => (
								<div
									key={cap.key}
									className="flex items-center justify-between gap-3"
								>
									<Label htmlFor={cap.key}>{cap.title}</Label>
									<Switch
										id={cap.key}
										checked={!value.disabledCapabilities.includes(cap.key)}
										onCheckedChange={(enabled) =>
											setValue({
												...value,
												disabledCapabilities: enabled
													? value.disabledCapabilities.filter(
															(key) => key !== cap.key,
														)
													: [...value.disabledCapabilities, cap.key],
											})
										}
									/>
								</div>
							))}
						</fieldset>
						<div className="rounded-lg border p-3 text-sm">
							<p>
								Today (UTC): {usage.data?.requests ?? 0} requests ·{" "}
								{usage.data?.tokens ?? 0} recorded tokens
							</p>
							{!!usage.data?.unknown && (
								<p className="mt-1 text-muted-foreground">
									{usage.data.unknown} responses have unconfirmed usage; their
									reservation remains counted.
								</p>
							)}
						</div>
						{error && (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						)}
						<Button
							type="submit"
							disabled={save.isPending || settings.isPending}
						>
							Save settings
						</Button>
					</form>
				)}
			</SheetContent>
		</Sheet>
	);
}
