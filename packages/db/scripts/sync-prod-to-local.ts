#!/usr/bin/env bun

import {
  resolveOptions,
  syncDatabases,
  type SyncMode,
  type SyncProgressEvent,
} from "../src/local-sync";

function printHelp() {
  console.log(`Usage:
  bun run sync -- -m prod-local [options]
  bun run sync -- -m remote-local [options]
  bun run sync -- -m prod-remote [options]

Options:
  -m, --mode <mode>                 prod-local, remote-local, or prod-remote (default: prod-local)
  --dry-run                         Inspect changed rows without writing locally
  --table <name>                    Sync one table only
  --source-url <url>                Override source DATABASE_URL
  --target-url <url>                Override target DATABASE_URL
  --state-file <path>               Override cursor state file
  --initial-cursor-value <value>    Floor for fresh/stale cursors; unset by default for full initial sync
  --reset                           Alias for --reset-cursor
  --reset-cursor                    Ignore saved cursor for the selected table(s)
  --read-batch-size <number>        Source read batch size (default: 10000)
  --write-batch-size <number>       Local upsert batch size (default: 500)
  --refresh-static                  Upsert small tables that have no timestamp cursor
  --static-refresh-max-rows <n>     Max rows for --refresh-static tables (default: 5000)
  --skip-local-domain-normalization Skip local tenant domain compatibility updates
  --keep-custom-domains             Preserve imported customDomain values
  -h, --help                        Show this help

Environment:
  prod-local    source .env.prod DATABASE_URL, target .env.local DATABASE_URL
  remote-local  source .env.remote.local DATABASE_URL over .env.local, target .env.local DATABASE_URL
  prod-remote   source .env.prod DATABASE_URL, target .env.remote.local DATABASE_URL over .env.local

Explicit SOURCE_DATABASE_URL and TARGET_DATABASE_URL still override mode resolution for one-off runs.
Without a local target URL, local mode falls back to postgresql://postgres:postgres@127.0.0.1:55432/school_clerk.`);
}

function printReport(
  reports: Awaited<ReturnType<typeof syncDatabases>>,
  dryRun: boolean,
  startedAt: number,
) {
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const totals = reports.reduce(
    (acc, report) => {
      acc.read += report.read;
      acc.written += report.written;
      if (report.mode === "skip") {
        acc.skipped += 1;
      }
      return acc;
    },
    { read: 0, written: 0, skipped: 0 },
  );

  console.log(`\n${dryRun ? "Dry run" : "Sync"} complete in ${elapsed}s`);
  console.log(
    `Tables: ${reports.length}, skipped: ${totals.skipped}, rows read: ${totals.read}, rows written: ${totals.written}`,
  );

  for (const report of reports) {
    const status = report.mode === "skip" ? "SKIP" : report.mode.toUpperCase();
    const cursor = report.cursorValue ? ` cursor=${report.cursorValue}` : "";
    const reason = report.skippedReason ? ` - ${report.skippedReason}` : "";
    console.log(
      `${status.padEnd(14)} ${report.table}: read=${report.read} written=${report.written}${cursor}${reason}`,
    );
  }
}

function formatElapsed(startedAt: number) {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`.padStart(7);
}

function formatMode(mode: SyncMode) {
  return mode.padEnd(14);
}

function formatTable(table: string) {
  return table.length > 32 ? `${table.slice(0, 29)}...` : table.padEnd(32);
}

function createProgressReporter(startedAt: number) {
  return (event: SyncProgressEvent) => {
    const elapsed = formatElapsed(startedAt);

    switch (event.type) {
      case "manifest:start":
        console.log(`[${elapsed}] Inspecting source schema...`);
        break;
      case "manifest":
        console.log(`[${elapsed}] Found ${event.tableCount} table${event.tableCount === 1 ? "" : "s"} to inspect.`);
        break;
      case "table:start":
        console.log(`[${elapsed}] START ${formatMode(event.mode)} ${formatTable(event.table)}`);
        break;
      case "table:batch": {
        const cursor = event.cursorValue ? ` cursor=${event.cursorValue}` : "";
        console.log(
          `[${elapsed}] BATCH ${formatMode(event.mode)} ${formatTable(event.table)} read=${event.read} written=${event.written}${cursor}`,
        );
        break;
      }
      case "table:skip":
        console.log(`[${elapsed}] SKIP  ${formatMode("skip")} ${formatTable(event.table)} ${event.reason}`);
        break;
      case "table:done": {
        const { report } = event;
        const reason = report.skippedReason ? ` - ${report.skippedReason}` : "";
        console.log(
          `[${elapsed}] DONE  ${formatMode(report.mode)} ${formatTable(report.table)} read=${report.read} written=${report.written}${reason}`,
        );
        break;
      }
      case "domain-normalization:start":
        console.log(`[${elapsed}] Normalizing imported tenant domains for local development...`);
        break;
      case "domain-normalization:done":
        console.log(
          `[${elapsed}] Local domain normalization: SchoolProfile=${event.report.schoolProfilesUpdated}, TenantDomain=${event.report.tenantDomainsUpdated}, legacy school=${event.report.legacySchoolsUpdated}, custom domains cleared=${event.report.customDomainsCleared}`,
        );
        break;
    }
  };
}

const startedAt = Date.now();

try {
  const options = await resolveOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log(
    `${options.dryRun ? "Dry running" : "Syncing"} ${options.pairMode} (${options.sourceMode} -> ${options.targetMode})...`,
  );
  console.log(`State file: ${options.stateFile}`);
  if (options.initialCursorValue) {
    console.log(`Initial cursor floor: ${options.initialCursorValue}`);
  }
  if (options.table) {
    console.log(`Table filter: ${options.table}`);
  }
  if (options.resetCursor) {
    console.log("Cursor reset: enabled");
  }
  if (!options.dryRun && options.normalizeLocalDomains) {
    console.log(
      `Local domain normalization: enabled${options.keepCustomDomains ? " (custom domains preserved)" : ""}`,
    );
  }

  const reports = await syncDatabases({
    ...options,
    onProgress: createProgressReporter(startedAt),
  });
  printReport(reports, options.dryRun, startedAt);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
