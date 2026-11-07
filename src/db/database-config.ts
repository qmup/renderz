export function databaseUrlFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return env.DATABASE_URL?.trim() || null;
}

export function isPostgresConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return databaseUrlFromEnv(env) !== null;
}
