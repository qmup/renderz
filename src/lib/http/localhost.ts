export function hostnameFromHostHeader(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end > 0 ? trimmed.slice(1, end) : trimmed;
  }
  return trimmed.split(":")[0] ?? trimmed;
}

export function isLocalhostHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

export function isLocalhostRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return isLocalhostHostname(hostnameFromHostHeader(host));
}
