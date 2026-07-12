export function databaseProfileForEnv(
  env: Record<string, string | undefined>,
): "local" | "remote-dev" | "prod";

export function applyDatabaseProfile<TEnv extends Record<string, string | undefined>>(
  env: TEnv,
): TEnv;
