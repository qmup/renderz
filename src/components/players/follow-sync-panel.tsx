"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  createSyncCode,
  linkSyncCode,
  unlinkSync,
  useFollowSyncCode,
} from "@/components/players/followed-players";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SYNC_QUERY_PARAM = "sync";

type SyncError =
  | "syncNotFound"
  | "syncUnreachable"
  | "syncCreateFailed"
  | "syncCopyFailed";

function syncLink(code: string): string {
  const url = new URL("/players/following", window.location.origin);
  url.searchParams.set(SYNC_QUERY_PARAM, code);
  return url.toString();
}

export function FollowSyncPanel() {
  const { m } = usePreferences();
  const code = useFollowSyncCode();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SyncError | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  function fail(next: SyncError) {
    setError(next);
    setOpen(true);
  }

  async function link(value: string) {
    setBusy(true);
    setError(null);
    try {
      const ok = await linkSyncCode(value);
      if (ok) {
        setInput("");
      } else {
        fail("syncNotFound");
      }
    } catch {
      fail("syncUnreachable");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get(SYNC_QUERY_PARAM);
    if (!fromUrl) {
      return;
    }
    url.searchParams.delete(SYNC_QUERY_PARAM);
    window.history.replaceState(null, "", url.toString());
    linkSyncCode(fromUrl)
      .then((ok) => {
        if (!ok) {
          fail("syncNotFound");
        }
      })
      .catch(() => fail("syncUnreachable"));
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await createSyncCode();
    } catch {
      fail("syncCreateFailed");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(syncLink(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      fail("syncCopyFailed");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.trim()) {
      void link(input);
    }
  }

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group border-border rounded-lg border text-sm"
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 p-3 font-medium [&::-webkit-details-marker]:hidden">
        <RefreshCw aria-hidden className="size-3.5" />
        {m.syncTitle}
        <span
          aria-hidden
          className="text-muted-foreground ml-auto inline-block transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">
        {code ? (
          <>
            <p className="text-muted-foreground">
              {m.syncLinkedBefore}{" "}
              <span className="text-foreground font-mono font-semibold tracking-wider select-all">
                {code}
              </span>
              {m.syncLinkedAfter}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={copy}>
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copied ? m.syncCopied : m.syncCopyLink}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={unlinkSync}
              >
                {m.syncStop}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" size="sm" onClick={create} disabled={busy}>
              {m.syncCreate}
            </Button>
            <span className="text-muted-foreground">{m.syncOr}</span>
            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={m.syncEnterCode}
                aria-label={m.syncCodeLabel}
                autoCapitalize="characters"
                autoComplete="off"
                className="w-36 font-mono uppercase"
              />
              <Button type="submit" size="sm" variant="outline" disabled={busy}>
                {m.syncLink}
              </Button>
            </form>
          </div>
        )}
        {error ? <p className="text-destructive">{m[error]}</p> : null}
      </div>
    </details>
  );
}
