import type { ReactNode } from "react";
import { isDev } from "@/lib/dev";
import { cn } from "@/lib/utils";

export function CatalogNotice({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children?: ReactNode;
  tone?: "info" | "warning" | "danger";
}) {
  if (!isDev) {
    return null;
  }
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "danger" && "border-destructive/40 bg-destructive/5 text-destructive",
        tone === "warning" && "border-foreground/15 bg-muted text-foreground",
        tone === "info" && "border-border bg-muted/40 text-foreground",
      )}
    >
      <p className="font-medium">{title}</p>
      {children ? <div className="text-muted-foreground mt-1">{children}</div> : null}
    </div>
  );
}
