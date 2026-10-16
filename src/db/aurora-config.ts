export type AuroraConfig = {
  host: string;
  port: number;
  user: string;
  database: string;
  region: string;
};

export function auroraConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AuroraConfig | null {
  const host = env.AURORA_HOST?.trim();
  if (!host) {
    return null;
  }
  const port = Number(env.AURORA_PORT ?? 5432);
  return {
    host,
    port: Number.isFinite(port) ? port : 5432,
    user: env.AURORA_USER?.trim() || "postgres",
    database: env.AURORA_DATABASE?.trim() || "postgres",
    region: env.AWS_REGION?.trim() || "ap-southeast-1",
  };
}
