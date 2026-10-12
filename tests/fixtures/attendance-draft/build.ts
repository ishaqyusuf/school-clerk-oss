import { existsSync } from "node:fs";
import { resolve } from "node:path";
const root = process.cwd();
const adapter = resolve(root, "tests/fixtures/attendance-draft/adapters.tsx");
const outdir = process.argv[2];
if (!outdir) throw new Error("Provide a fixture output directory");
const result = await Bun.build({
	entrypoints: ["tests/fixtures/attendance-draft/fixture.tsx"],
	outdir,
	target: "browser",
	define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
	plugins: [
		{
			name: "attendance-fixture",
			setup(build) {
				build.onResolve(
					{ filter: /^react($|\/)|^react-dom($|\/)|^@tanstack\/react-query$/ },
					({ path }) => ({ path: Bun.resolveSync(path, root) }),
				);
				build.onResolve(
					{ filter: /use-auth$|use-classroom-params$|trpc\/client$/ },
					() => ({ path: adapter }),
				);
				build.onResolve({ filter: /^@\// }, ({ path }) => {
					const resolved = [".ts", ".tsx", "/index.ts", "/index.tsx"]
						.map((ext) =>
							resolve(root, "apps/dashboard/src", path.slice(2) + ext),
						)
						.find(existsSync);
					if (!resolved) throw new Error(`Cannot resolve ${path}`);
					return { path: resolved };
				});
			},
		},
	],
});
if (!result.success) throw new Error(result.logs.join("\n"));
const postcss = (await import("postcss")).default;
const tailwind = (await import("@tailwindcss/postcss")).default;
const cssPath = resolve(root, "packages/ui/src/styles/globals.css");
const css = await postcss([tailwind()]).process(
	await Bun.file(cssPath).text(),
	{ from: cssPath },
);
await Bun.write(resolve(outdir, "fixture.css"), css.css);
await Bun.write(
	resolve(outdir, "index.html"),
	'<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script></html>',
);
