import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

export type SyncMode = "incremental" | "insert-only" | "static-refresh" | "skip";

export type ColumnInfo = {
  name: string;
  dataType: string;
  dbType: string;
  ordinal: number;
};

export type TableManifest = {
  table: string;
  columns: string[];
  columnTypes: Record<string, string>;
  keyColumns: string[];
  cursorColumns: string[];
  mode: SyncMode;
  reason?: string;
};

export type TableCursor = {
  cursorValue: string | null;
  keyValues: Record<string, unknown>;
  cursorColumns: string[];
  mode: SyncMode;
  completedFullScan?: boolean;
  syncedAt: string;
};

export type SyncState = {
  version: 1;
  updatedAt: string;
  tables: Record<string, TableCursor>;
};

export type LocalDomainNormalizationReport = {
  schoolProfilesUpdated: number;
  tenantDomainsUpdated: number;
  legacySchoolsUpdated: number;
  customDomainsCleared: number;
};

export type SyncOptions = {
  sourceUrl: string;
  targetUrl: string;
  stateFile: string;
  table?: string;
  initialCursorValue: string | null;
  dryRun: boolean;
  resetCursor: boolean;
  refreshStatic: boolean;
  staticRefreshMaxRows: number;
  readBatchSize: number;
  writeBatchSize: number;
  normalizeLocalDomains: boolean;
  keepCustomDomains: boolean;
  onProgress?: (event: SyncProgressEvent) => void;
};

export type SyncReport = {
  table: string;
  mode: SyncMode;
  read: number;
  written: number;
  cursorValue?: string | null;
  skippedReason?: string;
};

export type SyncProgressEvent =
  | { type: "manifest:start" }
  | { type: "manifest"; tableCount: number }
  | { type: "table:start"; table: string; mode: SyncMode }
  | {
      type: "table:batch";
      table: string;
      mode: SyncMode;
      read: number;
      written: number;
      cursorValue?: string | null;
    }
  | { type: "table:skip"; table: string; reason: string }
  | { type: "table:done"; report: SyncReport }
  | { type: "domain-normalization:start" }
  | { type: "domain-normalization:done"; report: LocalDomainNormalizationReport };

function normalizePgConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  if (
    sslMode &&
    ["prefer", "require", "verify-ca"].includes(sslMode) &&
    !url.searchParams.has("uselibpqcompat")
  ) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

type KeyColumnRow = {
  column_name: string;
  constraint_name: string;
  ordinal_position: bigint | number;
};

const DEFAULT_STATE: SyncState = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  tables: {},
};

const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:55432/school_clerk";
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "postgres",
]);
const PRODUCTION_TARGET_HOST_PATTERNS = [
  /supabase\.co$/i,
  /pooler\.supabase\.com$/i,
  /neon\.tech$/i,
  /railway\.app$/i,
  /render\.com$/i,
  /amazonaws\.com$/i,
  /vercel-storage\.com$/i,
];
const LOCAL_DOMAIN_TABLES = new Set(["SchoolProfile", "TenantDomain", "school"]);

export function quoteIdent(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function buildCursorExpression(cursorColumns: string[]): string {
  return `COALESCE(${[
    ...cursorColumns.map(quoteIdent),
    "'1000-01-01 00:00:00+00'::timestamptz",
  ].join(", ")})`;
}

function placeholder(index: number) {
  return `$${index}`;
}

export function buildCursorWhereClause(
  cursorExpression: string,
  keyColumns: string[],
  cursor?: TableCursor,
): { sql: string; params: unknown[] } {
  if (!cursor?.cursorValue) {
    return { sql: "", params: [] };
  }

  const params: unknown[] = [cursor.cursorValue, cursor.cursorValue];
  const keyComparisons: string[] = [];

  for (let index = 0; index < keyColumns.length; index += 1) {
    const equalParts: string[] = [];
    for (const prefixColumn of keyColumns.slice(0, index)) {
      params.push(cursor.keyValues[prefixColumn]);
      equalParts.push(`${quoteIdent(prefixColumn)} = ${placeholder(params.length)}`);
    }

    const keyColumn = keyColumns[index]!;
    const comparison = `${quoteIdent(keyColumn)} > ${placeholder(params.length + 1)}`;
    params.push(cursor.keyValues[keyColumn]);
    const equalPrefix = equalParts.join(" AND ");
    keyComparisons.push(equalPrefix ? `(${equalPrefix} AND ${comparison})` : `(${comparison})`);
  }

  return {
    sql: `WHERE (${cursorExpression} > ${placeholder(1)} OR (${cursorExpression} = ${placeholder(
      2,
    )} AND (${keyComparisons.join(" OR ")})))`,
    params,
  };
}

export function buildKeysetWhereClause(
  keyColumns: string[],
  keyValues?: Record<string, unknown>,
  cursorExpression?: string,
  minCursorValue?: string | null,
): { sql: string; params: unknown[] } {
  if ((!keyValues || keyColumns.length === 0) && (!cursorExpression || !minCursorValue)) {
    return { sql: "", params: [] };
  }

  const params: unknown[] = [];
  const filters: string[] = [];
  const keyComparisons: string[] = [];

  if (cursorExpression && minCursorValue) {
    params.push(minCursorValue);
    filters.push(`${cursorExpression} > ${placeholder(params.length)}`);
  }

  if (keyValues && keyColumns.length > 0) {
    for (let index = 0; index < keyColumns.length; index += 1) {
      const equalParts: string[] = [];
      for (const prefixColumn of keyColumns.slice(0, index)) {
        params.push(keyValues[prefixColumn]);
        equalParts.push(`${quoteIdent(prefixColumn)} = ${placeholder(params.length)}`);
      }

      const keyColumn = keyColumns[index]!;
      const comparison = `${quoteIdent(keyColumn)} > ${placeholder(params.length + 1)}`;
      params.push(keyValues[keyColumn]);
      const equalPrefix = equalParts.join(" AND ");
      keyComparisons.push(equalPrefix ? `(${equalPrefix} AND ${comparison})` : `(${comparison})`);
    }
    filters.push(`(${keyComparisons.join(" OR ")})`);
  }

  return {
    sql: `WHERE ${filters.join(" AND ")}`,
    params,
  };
}

export function buildUpsertSql(
  table: string,
  columns: string[],
  keyColumns: string[],
  rowCount: number,
  columnTypes: Record<string, string> = {},
): string {
  if (rowCount < 1) {
    throw new Error("rowCount must be greater than zero");
  }

  if (keyColumns.length === 0) {
    throw new Error(`Cannot upsert ${table}: no primary or unique key columns detected.`);
  }

  const columnList = columns.map(quoteIdent).join(", ");
  let paramIndex = 1;
  const placeholders = Array.from({ length: rowCount }, () => {
    const rowPlaceholders = columns.map((column) => {
      const valuePlaceholder = placeholder(paramIndex++);
      const columnType = columnTypes[column];
      return columnType ? `${valuePlaceholder}::${columnType}` : valuePlaceholder;
    });
    return `(${rowPlaceholders.join(", ")})`;
  }).join(", ");
  const conflictTarget = keyColumns.map(quoteIdent).join(", ");
  const updates = columns
    .map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`)
    .join(", ");

  return `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES ${placeholders} ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates}`;
}

export function normalizeUpsertValue(value: unknown, columnType?: string): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return isJsonColumnType(columnType) ? JSON.stringify(value) : value;
  }

  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }

  return value;
}

export function buildUpsertValues(
  columns: string[],
  rows: Array<Record<string, unknown>>,
  columnTypes: Record<string, string> = {},
): unknown[] {
  return rows.flatMap((row) =>
    columns.map((column) => normalizeUpsertValue(row[column], columnTypes[column])),
  );
}

export function classifyTable(input: {
  table: string;
  columns: string[];
  columnTypes?: Record<string, string>;
  keyColumns: string[];
  refreshStatic: boolean;
}): TableManifest {
  const columnTypes = input.columnTypes ?? {};
  const hasUpdatedAt = input.columns.includes("updatedAt");
  const hasCreatedAt = input.columns.includes("createdAt");
  const hasLegacyUpdatedAt = input.columns.includes("updated_at");
  const hasLegacyCreatedAt = input.columns.includes("created_at");

  if (input.keyColumns.length === 0) {
    return {
      table: input.table,
      columns: input.columns,
      columnTypes,
      keyColumns: [],
      cursorColumns: [],
      mode: "skip",
      reason: "No primary or unique key was detected.",
    };
  }

  if (hasUpdatedAt) {
    return {
      table: input.table,
      columns: input.columns,
      columnTypes,
      keyColumns: input.keyColumns,
      cursorColumns: hasCreatedAt ? ["updatedAt", "createdAt"] : ["updatedAt"],
      mode: "incremental",
    };
  }

  if (hasLegacyUpdatedAt) {
    return {
      table: input.table,
      columns: input.columns,
      columnTypes,
      keyColumns: input.keyColumns,
      cursorColumns: hasLegacyCreatedAt ? ["updated_at", "created_at"] : ["updated_at"],
      mode: "incremental",
    };
  }

  if (hasCreatedAt) {
    return {
      table: input.table,
      columns: input.columns,
      columnTypes,
      keyColumns: input.keyColumns,
      cursorColumns: ["createdAt"],
      mode: "insert-only",
      reason: "No updatedAt column; new rows are synced by createdAt only.",
    };
  }

  if (hasLegacyCreatedAt) {
    return {
      table: input.table,
      columns: input.columns,
      columnTypes,
      keyColumns: input.keyColumns,
      cursorColumns: ["created_at"],
      mode: "insert-only",
      reason: "No updated_at column; new rows are synced by created_at only.",
    };
  }

  if (input.refreshStatic) {
    return {
      table: input.table,
      columns: input.columns,
      columnTypes,
      keyColumns: input.keyColumns,
      cursorColumns: [],
      mode: "static-refresh",
      reason: "No timestamp column; table is eligible for opt-in full refresh upsert.",
    };
  }

  return {
    table: input.table,
    columns: input.columns,
    columnTypes,
    keyColumns: input.keyColumns,
    cursorColumns: [],
    mode: "skip",
    reason: "No updatedAt/createdAt timestamp column. Pass --refresh-static to upsert small static tables.",
  };
}

export function assertSafeConnections(sourceUrl: string, targetUrl: string): void {
  const source = new URL(sourceUrl);
  const target = new URL(targetUrl);
  const sourceDatabase = source.pathname.replace(/^\//, "");
  const targetDatabase = target.pathname.replace(/^\//, "");

  if (
    source.hostname === target.hostname &&
    source.port === target.port &&
    sourceDatabase === targetDatabase
  ) {
    throw new Error("Refusing to sync because source and target point at the same database.");
  }

  if (PRODUCTION_TARGET_HOST_PATTERNS.some((pattern) => pattern.test(target.hostname))) {
    throw new Error(`Refusing to write to production-looking target host: ${target.hostname}`);
  }

  if (!LOCAL_HOSTS.has(target.hostname) && !target.hostname.endsWith(".local")) {
    throw new Error(
      `Refusing to write to non-local target host: ${target.hostname}. Set LOCAL_POSTGRES_URL to a local PostgreSQL database.`,
    );
  }
}

export async function readState(stateFile: string): Promise<SyncState> {
  try {
    const raw = await readFile(stateFile, "utf8");
    const parsed = JSON.parse(raw) as SyncState;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? DEFAULT_STATE.updatedAt,
      tables: parsed.tables ?? {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...DEFAULT_STATE, tables: {} };
    }

    throw error;
  }
}

export async function writeState(stateFile: string, state: SyncState): Promise<void> {
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(
    stateFile,
    `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export function parseArgs(argv: string[]): Partial<SyncOptions> & { help?: boolean } {
  const parsed: Partial<SyncOptions> & { help?: boolean } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      return value;
    };

    switch (arg) {
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--reset-cursor":
      case "--reset-state":
        parsed.resetCursor = true;
        break;
      case "--refresh-static":
        parsed.refreshStatic = true;
        break;
      case "--skip-local-domain-normalization":
        parsed.normalizeLocalDomains = false;
        break;
      case "--keep-custom-domains":
        parsed.keepCustomDomains = true;
        break;
      case "--table":
        parsed.table = next();
        break;
      case "--state-file":
        parsed.stateFile = next();
        break;
      case "--source-url":
        parsed.sourceUrl = next();
        break;
      case "--target-url":
        parsed.targetUrl = next();
        break;
      case "--initial-cursor-value":
        parsed.initialCursorValue = next();
        break;
      case "--read-batch-size":
        parsed.readBatchSize = Number(next());
        break;
      case "--write-batch-size":
        parsed.writeBatchSize = Number(next());
        break;
      case "--static-refresh-max-rows":
        parsed.staticRefreshMaxRows = Number(next());
        break;
      case "-h":
      case "--help":
        parsed.help = true;
        break;
      default:
        if (arg?.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  return parsed;
}

export function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    values[match[1]!] = match[2]!.trim().replace(/^['"]|['"]$/g, "");
  }

  return values;
}

export async function readFirstEnvValue(
  files: string[],
  keys: string[],
): Promise<string | undefined> {
  for (const file of files) {
    try {
      const env = parseEnvFile(await readFile(file, "utf8"));
      for (const key of keys) {
        if (env[key]) {
          return env[key];
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  return undefined;
}

export async function resolveOptions(
  argv: string[],
  cwd = process.cwd(),
): Promise<SyncOptions & { help?: boolean }> {
  const parsed = parseArgs(argv);
  const repoRoot = cwd.endsWith("packages/db") ? resolve(cwd, "../..") : cwd;
  const sourceUrl =
    parsed.sourceUrl ??
    process.env.PROD_POSTGRES_URL ??
    process.env.SOURCE_POSTGRES_URL ??
    process.env.PROD_DATABASE_URL ??
    process.env.SOURCE_DATABASE_URL ??
    (await readFirstEnvValue(
      [resolve(cwd, ".env.production"), resolve(repoRoot, ".env.production")],
      ["PROD_POSTGRES_URL", "SOURCE_POSTGRES_URL", "POSTGRES_URL", "DATABASE_URL"],
    )) ??
    (await readFirstEnvValue(
      [resolve(cwd, ".env.local"), resolve(repoRoot, ".env.local")],
      ["PROD_POSTGRES_URL", "SOURCE_POSTGRES_URL", "PROD_DATABASE_URL", "SOURCE_DATABASE_URL"],
    ));
  const targetUrl =
    parsed.targetUrl ??
    process.env.LOCAL_POSTGRES_URL ??
    process.env.TARGET_POSTGRES_URL ??
    process.env.LOCAL_DATABASE_URL ??
    process.env.TARGET_DATABASE_URL ??
    (await readFirstEnvValue(
      [resolve(cwd, ".env.local"), resolve(cwd, ".env"), resolve(repoRoot, ".env.local"), resolve(repoRoot, ".env")],
      ["LOCAL_POSTGRES_URL", "TARGET_POSTGRES_URL", "LOCAL_DATABASE_URL", "TARGET_DATABASE_URL", "POSTGRES_URL", "DIRECT_URL"],
    )) ??
    DEFAULT_LOCAL_DATABASE_URL;

  const options = {
    sourceUrl: sourceUrl ?? "",
    targetUrl: targetUrl ?? "",
    stateFile: parsed.stateFile ?? resolve(repoRoot, ".local-db-sync/state.json"),
    table: parsed.table,
    initialCursorValue:
      parsed.initialCursorValue ?? process.env.LOCAL_SYNC_INITIAL_CURSOR_VALUE ?? null,
    dryRun: parsed.dryRun ?? false,
    resetCursor: parsed.resetCursor ?? false,
    refreshStatic: parsed.refreshStatic ?? false,
    staticRefreshMaxRows: parsed.staticRefreshMaxRows ?? 5_000,
    readBatchSize: parsed.readBatchSize ?? 10_000,
    writeBatchSize: parsed.writeBatchSize ?? 500,
    normalizeLocalDomains: parsed.normalizeLocalDomains ?? true,
    keepCustomDomains: parsed.keepCustomDomains ?? false,
    help: parsed.help,
  } satisfies SyncOptions & { help?: boolean };

  if (parsed.help) {
    return options;
  }

  if (!sourceUrl) {
    throw new Error(
      "Missing production database URL. Set PROD_POSTGRES_URL, SOURCE_POSTGRES_URL, or packages/db/.env.production POSTGRES_URL.",
    );
  }

  if (!targetUrl) {
    throw new Error(
      "Missing local database URL. Set LOCAL_POSTGRES_URL, TARGET_POSTGRES_URL, or packages/db/.env.local POSTGRES_URL.",
    );
  }

  return options;
}

export async function getTableManifest(
  db: PrismaClient,
  refreshStatic: boolean,
  tableFilter?: string,
): Promise<TableManifest[]> {
  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const filteredTables = tables
    .map((row) => row.table_name)
    .filter((table) => table !== "_prisma_migrations")
    .filter((table) => !tableFilter || table === tableFilter);
  const manifests: TableManifest[] = [];

  for (const table of filteredTables) {
    const columns = await getColumns(db, table);
    const keyColumns = await getBestKeyColumns(db, table);
    manifests.push(
      classifyTable({
        table,
        columns: columns.map((column) => column.name),
        columnTypes: Object.fromEntries(
          columns.map((column) => [column.name, column.dbType]),
        ),
        keyColumns,
        refreshStatic,
      }),
    );
  }

  return manifests;
}

async function getColumns(db: PrismaClient, table: string): Promise<ColumnInfo[]> {
  return db.$queryRawUnsafe<ColumnInfo[]>(
    `
      SELECT
        c.column_name AS "name",
        c.data_type AS "dataType",
        format_type(a.atttypid, a.atttypmod) AS "dbType",
        c.ordinal_position AS "ordinal"
      FROM information_schema.columns c
      JOIN pg_class cls
        ON cls.relname = c.table_name
      JOIN pg_namespace ns
        ON ns.oid = cls.relnamespace
        AND ns.nspname = c.table_schema
      JOIN pg_attribute a
        ON a.attrelid = cls.oid
        AND a.attname = c.column_name
      WHERE c.table_schema = current_schema()
        AND c.table_name = $1
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY c.ordinal_position
    `,
    table,
  );
}

async function getBestKeyColumns(db: PrismaClient, table: string): Promise<string[]> {
  const primaryRows = await db.$queryRawUnsafe<KeyColumnRow[]>(
    `
      SELECT kcu.column_name, kcu.constraint_name, kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_schema = kcu.constraint_schema
        AND tc.constraint_name = kcu.constraint_name
        AND tc.table_name = kcu.table_name
      WHERE tc.table_schema = current_schema()
        AND tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `,
    table,
  );

  if (primaryRows.length > 0) {
    return primaryRows.map((row) => row.column_name);
  }

  const uniqueRows = await db.$queryRawUnsafe<KeyColumnRow[]>(
    `
      SELECT kcu.column_name, kcu.constraint_name, kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_schema = kcu.constraint_schema
        AND tc.constraint_name = kcu.constraint_name
        AND tc.table_name = kcu.table_name
      WHERE tc.table_schema = current_schema()
        AND tc.table_name = $1
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY kcu.constraint_name, kcu.ordinal_position
    `,
    table,
  );

  const indexes = new Map<string, KeyColumnRow[]>();
  for (const row of uniqueRows) {
    indexes.set(row.constraint_name, [...(indexes.get(row.constraint_name) ?? []), row]);
  }

  return (
    [...indexes.values()]
      .sort((left, right) => left.length - right.length)
      .at(0)
      ?.sort((left, right) => Number(left.ordinal_position) - Number(right.ordinal_position))
      .map((row) => row.column_name) ?? []
  );
}

export async function syncDatabases(options: SyncOptions): Promise<SyncReport[]> {
  assertSafeConnections(options.sourceUrl, options.targetUrl);

  const source = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizePgConnectionString(options.sourceUrl),
    }),
  });
  const target = options.dryRun
    ? undefined
    : new PrismaClient({
        adapter: new PrismaPg({
          connectionString: normalizePgConnectionString(options.targetUrl),
        }),
      });
  const reports: SyncReport[] = [];
  const state = await readState(options.stateFile);
  let disabledTargetForeignKeyChecks = false;
  let disabledTargetTriggerTables: string[] = [];

  try {
    if (target) {
      await target.$executeRawUnsafe("SET session_replication_role = replica");
      disabledTargetForeignKeyChecks = true;
    }

    options.onProgress?.({ type: "manifest:start" });
    const manifests = await getTableManifest(source, options.refreshStatic, options.table);

    if (options.table && manifests.length === 0) {
      throw new Error(`Table not found in source database: ${options.table}`);
    }

    options.onProgress?.({ type: "manifest", tableCount: manifests.length });

    if (options.resetCursor) {
      for (const manifest of manifests) {
        delete state.tables[manifest.table];
      }
      if (!options.dryRun) {
        await writeState(options.stateFile, state);
      }
    }

    if (target) {
      disabledTargetTriggerTables = await disableTargetTableTriggers(target);
    }

    for (const manifest of manifests) {
      options.onProgress?.({ type: "table:start", table: manifest.table, mode: manifest.mode });

      if (manifest.mode === "skip") {
        const report = {
          table: manifest.table,
          mode: manifest.mode,
          read: 0,
          written: 0,
          skippedReason: manifest.reason,
        } satisfies SyncReport;
        options.onProgress?.({
          type: "table:skip",
          table: manifest.table,
          reason: manifest.reason ?? "Skipped.",
        });
        options.onProgress?.({ type: "table:done", report });
        reports.push(report);
        continue;
      }

      const report =
        manifest.mode === "static-refresh"
          ? await syncStaticTable(source, target, manifest, options)
          : await syncCursorTable(source, target, manifest, state, options);
      options.onProgress?.({ type: "table:done", report });
      reports.push(report);
    }

    if (target && shouldNormalizeLocalDomains(options)) {
      options.onProgress?.({ type: "domain-normalization:start" });
      const report = await normalizeLocalTenantDomains(target, options.keepCustomDomains);
      options.onProgress?.({ type: "domain-normalization:done", report });
    }
  } finally {
    if (target && disabledTargetTriggerTables.length > 0) {
      await enableTargetTableTriggers(target, disabledTargetTriggerTables).catch((error) => {
        console.error("Failed to re-enable target table triggers.", error);
      });
    }
    if (target && disabledTargetForeignKeyChecks) {
      await target
        .$executeRawUnsafe("SET session_replication_role = DEFAULT")
        .catch((error) => {
          console.error(
            "Failed to restore target session_replication_role. Disconnecting target client.",
            error,
          );
        });
    }
    await source.$disconnect();
    await target?.$disconnect();
  }

  return reports;
}

async function getBaseTableNames(db: PrismaClient): Promise<string[]> {
  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `;

  return tables.map((row) => row.table_name);
}

async function disableTargetTableTriggers(db: PrismaClient): Promise<string[]> {
  const tables = await getBaseTableNames(db);

  for (const table of tables) {
    await db.$executeRawUnsafe(`ALTER TABLE ${quoteIdent(table)} DISABLE TRIGGER ALL`);
  }

  return tables;
}

async function enableTargetTableTriggers(db: PrismaClient, tables: string[]): Promise<void> {
  for (const table of [...tables].reverse()) {
    await db.$executeRawUnsafe(`ALTER TABLE ${quoteIdent(table)} ENABLE TRIGGER ALL`);
  }
}

function shouldNormalizeLocalDomains(options: SyncOptions) {
  return (
    options.normalizeLocalDomains &&
    !options.dryRun &&
    (!options.table || LOCAL_DOMAIN_TABLES.has(options.table))
  );
}

async function syncCursorTable(
  source: PrismaClient,
  target: PrismaClient | undefined,
  manifest: TableManifest,
  state: SyncState,
  options: SyncOptions,
): Promise<SyncReport> {
  const cursorExpression = buildCursorExpression(manifest.cursorColumns);
  let cursor = applyInitialCursorFloor(
    state.tables[manifest.table],
    manifest,
    options.initialCursorValue,
  );
  let totalRead = 0;
  let totalWritten = 0;
  let latestCursor: TableCursor | undefined = cursor;
  let keyScanCursor: Record<string, unknown> | undefined;
  let keyScanMinCursorValue: string | null | undefined;
  let usingKeyScan = !cursor?.completedFullScan;

  while (true) {
    const rows = usingKeyScan
      ? await readRowsByKeyset(
          source,
          manifest,
          cursorExpression,
          keyScanCursor,
          options.readBatchSize,
          keyScanMinCursorValue,
        )
      : await readRowsByCursor(source, manifest, cursorExpression, cursor, options.readBatchSize);

    if (rows.length === 0) {
      break;
    }

    totalRead += rows.length;
    const lastRow = rows[rows.length - 1]!;
    keyScanCursor = Object.fromEntries(manifest.keyColumns.map((column) => [column, lastRow[column]]));
    latestCursor = usingKeyScan
      ? buildMaxCursor(rows, manifest, latestCursor)
      : {
          cursorValue: normalizeCursorValue(lastRow.__sync_cursor),
          keyValues: keyScanCursor,
          cursorColumns: manifest.cursorColumns,
          mode: manifest.mode,
          completedFullScan: true,
          syncedAt: new Date().toISOString(),
        };

    if (!options.dryRun) {
      if (!target) {
        throw new Error("Internal sync error: target database client is required when dryRun is false.");
      }
      totalWritten += await upsertRows(target, manifest, rows, options.writeBatchSize);
      state.tables[manifest.table] = latestCursor;
      await writeState(options.stateFile, state);
    }

    options.onProgress?.({
      type: "table:batch",
      table: manifest.table,
      mode: manifest.mode,
      read: totalRead,
      written: totalWritten,
      cursorValue: latestCursor?.cursorValue,
    });

    if (!usingKeyScan) {
      cursor = latestCursor;
    }

    if (rows.length < options.readBatchSize) {
      break;
    }
  }

  if (usingKeyScan && latestCursor) {
    latestCursor.completedFullScan = true;
    latestCursor.syncedAt = new Date().toISOString();
    if (!options.dryRun) {
      state.tables[manifest.table] = latestCursor;
      await writeState(options.stateFile, state);
    }
  }

  return {
    table: manifest.table,
    mode: manifest.mode,
    read: totalRead,
    written: totalWritten,
    cursorValue: latestCursor?.cursorValue,
    skippedReason: manifest.reason,
  };
}

function applyInitialCursorFloor(
  cursor: TableCursor | undefined,
  manifest: TableManifest,
  initialCursorValue: string | null,
): TableCursor | undefined {
  if (!initialCursorValue || manifest.cursorColumns.length === 0) {
    return cursor;
  }

  if (cursor && compareCursorValues(cursor.cursorValue, initialCursorValue) >= 0) {
    return cursor;
  }

  return {
    cursorValue: initialCursorValue,
    keyValues: Object.fromEntries(manifest.keyColumns.map((column) => [column, null])),
    cursorColumns: manifest.cursorColumns,
    mode: manifest.mode,
    completedFullScan: true,
    syncedAt: new Date().toISOString(),
  };
}

async function readRowsByCursor(
  source: PrismaClient,
  manifest: TableManifest,
  cursorExpression: string,
  cursor: TableCursor | undefined,
  readBatchSize: number,
) {
  const where = buildCursorWhereClause(cursorExpression, manifest.keyColumns, cursor);
  const orderBy = [cursorExpression, ...manifest.keyColumns.map(quoteIdent)].join(", ");
  const limitPlaceholder = placeholder(where.params.length + 1);

  return source.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT ${manifest.columns.map(quoteIdent).join(", ")}, ${cursorExpression} AS "__sync_cursor"
      FROM ${quoteIdent(manifest.table)}
      ${where.sql}
      ORDER BY ${orderBy}
      LIMIT ${limitPlaceholder}
    `,
    ...where.params,
    readBatchSize,
  );
}

async function readRowsByKeyset(
  source: PrismaClient,
  manifest: TableManifest,
  cursorExpression: string,
  keyValues: Record<string, unknown> | undefined,
  readBatchSize: number,
  minCursorValue?: string | null,
) {
  const where = buildKeysetWhereClause(
    manifest.keyColumns,
    keyValues,
    cursorExpression,
    minCursorValue,
  );
  const limitPlaceholder = placeholder(where.params.length + 1);

  return source.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT ${manifest.columns.map(quoteIdent).join(", ")}, ${cursorExpression} AS "__sync_cursor"
      FROM ${quoteIdent(manifest.table)}
      ${where.sql}
      ORDER BY ${manifest.keyColumns.map(quoteIdent).join(", ")}
      LIMIT ${limitPlaceholder}
    `,
    ...where.params,
    readBatchSize,
  );
}

function buildMaxCursor(
  rows: Array<Record<string, unknown>>,
  manifest: TableManifest,
  previous?: TableCursor,
): TableCursor {
  let maxCursorValue = previous?.cursorValue ?? null;
  let maxKeyValues = previous?.keyValues ?? {};

  for (const row of rows) {
    const rowCursorValue = normalizeCursorValue(row.__sync_cursor);
    if (compareCursorValues(rowCursorValue, maxCursorValue) >= 0) {
      maxCursorValue = rowCursorValue;
      maxKeyValues = Object.fromEntries(manifest.keyColumns.map((column) => [column, row[column]]));
    }
  }

  return {
    cursorValue: maxCursorValue,
    keyValues: maxKeyValues,
    cursorColumns: manifest.cursorColumns,
    mode: manifest.mode,
    completedFullScan: false,
    syncedAt: new Date().toISOString(),
  };
}

function compareCursorValues(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  return left.localeCompare(right);
}

async function syncStaticTable(
  source: PrismaClient,
  target: PrismaClient | undefined,
  manifest: TableManifest,
  options: SyncOptions,
): Promise<SyncReport> {
  const countRows = await source.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) AS "count" FROM ${quoteIdent(manifest.table)}`,
  );
  const count = Number(countRows[0]?.count ?? 0);

  if (count > options.staticRefreshMaxRows) {
    return {
      table: manifest.table,
      mode: "skip",
      read: 0,
      written: 0,
      skippedReason: `Static table has ${count} rows, above --static-refresh-max-rows=${options.staticRefreshMaxRows}.`,
    };
  }

  const rows = await source.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT ${manifest.columns.map(quoteIdent).join(", ")} FROM ${quoteIdent(manifest.table)}`,
  );
  let written = 0;
  if (!options.dryRun) {
    if (!target) {
      throw new Error("Internal sync error: target database client is required when dryRun is false.");
    }
    written = await upsertRows(target, manifest, rows, options.writeBatchSize);
  }

  options.onProgress?.({
    type: "table:batch",
    table: manifest.table,
    mode: manifest.mode,
    read: rows.length,
    written,
  });

  return {
    table: manifest.table,
    mode: manifest.mode,
    read: rows.length,
    written,
    skippedReason: manifest.reason,
  };
}

async function upsertRows(
  target: PrismaClient,
  manifest: TableManifest,
  rows: Array<Record<string, unknown>>,
  writeBatchSize: number,
): Promise<number> {
  let written = 0;

  for (let index = 0; index < rows.length; index += writeBatchSize) {
    const batch = rows.slice(index, index + writeBatchSize);
    const sql = buildUpsertSql(
      manifest.table,
      manifest.columns,
      manifest.keyColumns,
      batch.length,
      manifest.columnTypes,
    );
    const values = buildUpsertValues(manifest.columns, batch, manifest.columnTypes);
    await target.$executeRawUnsafe(sql, ...values);
    written += batch.length;
  }

  return written;
}

export async function normalizeLocalTenantDomains(
  db: PrismaClient,
  keepCustomDomains = false,
): Promise<LocalDomainNormalizationReport> {
  const report: LocalDomainNormalizationReport = {
    schoolProfilesUpdated: 0,
    tenantDomainsUpdated: 0,
    legacySchoolsUpdated: 0,
    customDomainsCleared: 0,
  };
  const schoolProfileSlugs = new Map<string, string>();

  if (await hasTable(db, "SchoolProfile")) {
    const columns = await getColumnNameSet(db, "SchoolProfile");
    if (columns.has("id") && columns.has("subDomain")) {
      const rows = await db.$queryRawUnsafe<
        Array<{ id: string; subDomain: string | null; name?: string | null; slug?: string | null }>
      >(
        `SELECT "id", "subDomain", ${columns.has("name") ? '"name"' : "NULL"} AS "name", ${
          columns.has("slug") ? '"slug"' : "NULL"
        } AS "slug" FROM "SchoolProfile"`,
      );
      const used = new Set<string>();

      for (const row of rows) {
        const normalized = uniqueTenantSlug(
          normalizeTenantSlug(row.subDomain ?? row.slug ?? row.name ?? row.id),
          used,
          row.id,
        );
        schoolProfileSlugs.set(row.id, normalized);
        if (row.subDomain !== normalized) {
          await db.$executeRawUnsafe(
            `UPDATE "SchoolProfile" SET "subDomain" = $1 WHERE "id" = $2`,
            normalized,
            row.id,
          );
          report.schoolProfilesUpdated += 1;
        }
      }
    }
  }

  if (await hasTable(db, "TenantDomain")) {
    const columns = await getColumnNameSet(db, "TenantDomain");
    if (columns.has("id") && columns.has("subdomain")) {
      const rows = await db.$queryRawUnsafe<
        Array<{
          id: string;
          subdomain: string | null;
          customDomain?: string | null;
          schoolProfileId?: string | null;
        }>
      >(
        `SELECT "id", "subdomain", ${
          columns.has("customDomain") ? '"customDomain"' : "NULL"
        } AS "customDomain", ${
          columns.has("schoolProfileId") ? '"schoolProfileId"' : "NULL"
        } AS "schoolProfileId" FROM "TenantDomain"`,
      );
      const used = new Set<string>();

      for (const row of rows) {
        const preferred =
          (row.schoolProfileId ? schoolProfileSlugs.get(row.schoolProfileId) : null) ??
          normalizeTenantSlug(row.subdomain ?? row.customDomain ?? row.id);
        const normalized = uniqueTenantSlug(preferred, used, row.id);
        const nextCustomDomain = keepCustomDomains
          ? row.customDomain ?? null
          : isLocalDomain(row.customDomain)
            ? row.customDomain ?? null
            : null;
        const customDomainCleared = (row.customDomain ?? null) !== null && nextCustomDomain === null;

        if (row.subdomain !== normalized || (row.customDomain ?? null) !== nextCustomDomain) {
          await db.$executeRawUnsafe(
            `UPDATE "TenantDomain" SET "subdomain" = $1${
              columns.has("customDomain") ? ', "customDomain" = $2' : ""
            } WHERE "id" = ${columns.has("customDomain") ? "$3" : "$2"}`,
            ...(columns.has("customDomain")
              ? [normalized, nextCustomDomain, row.id]
              : [normalized, row.id]),
          );
          report.tenantDomainsUpdated += 1;
          if (customDomainCleared) {
            report.customDomainsCleared += 1;
          }
        }
      }
    }
  }

  if (await hasTable(db, "school")) {
    const columns = await getColumnNameSet(db, "school");
    if (columns.has("id") && columns.has("sub_domain")) {
      const rows = await db.$queryRawUnsafe<
        Array<{ id: string; sub_domain: string | null; name?: string | null }>
      >(
        `SELECT "id", "sub_domain", ${columns.has("name") ? '"name"' : "NULL"} AS "name" FROM "school"`,
      );
      const used = new Set<string>();

      for (const row of rows) {
        const normalized = uniqueTenantSlug(
          normalizeTenantSlug(row.sub_domain ?? row.name ?? row.id),
          used,
          row.id,
        );
        if (row.sub_domain !== normalized) {
          await db.$executeRawUnsafe(
            `UPDATE "school" SET "sub_domain" = $1 WHERE "id" = $2`,
            normalized,
            row.id,
          );
          report.legacySchoolsUpdated += 1;
        }
      }
    }
  }

  return report;
}

async function hasTable(db: PrismaClient, table: string) {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = $1
      ) AS "exists"
    `,
    table,
  );

  return rows[0]?.exists ?? false;
}

async function getColumnNameSet(db: PrismaClient, table: string) {
  const columns = await getColumns(db, table);
  return new Set(columns.map((column) => column.name));
}

function normalizeTenantSlug(value: string | null | undefined) {
  const normalizedHost = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^dashboard\./, "");
  const firstLabel = normalizedHost.includes(".")
    ? (normalizedHost.split(".").filter(Boolean)[0] ?? normalizedHost)
    : normalizedHost;
  const slug = firstLabel
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "school";
}

function uniqueTenantSlug(slug: string, used: Set<string>, id: string) {
  let candidate = slug;
  let index = 2;
  const suffix = id.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase();

  while (used.has(candidate)) {
    candidate = `${slug}-${suffix || index}`;
    if (used.has(candidate)) {
      candidate = `${slug}-${index}`;
    }
    index += 1;
  }

  used.add(candidate);
  return candidate;
}

function isLocalDomain(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const host = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  );
}

function isJsonColumnType(columnType: string | undefined) {
  return columnType === "json" || columnType === "jsonb";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeCursorValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
