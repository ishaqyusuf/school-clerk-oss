import type { ModuleKey, ResolvedNavModule } from "@school-clerk/navigation";

export function resolveSelectedModule(
	modules: ResolvedNavModule[],
	selectedModuleKey?: ModuleKey | null,
	activeModuleKey?: ModuleKey | null,
) {
	return (
		modules.find((module) => module.key === selectedModuleKey) ??
		modules.find((module) => module.key === activeModuleKey) ??
		modules[0] ??
		null
	);
}
