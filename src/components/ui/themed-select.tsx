"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ThemedSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export function ThemedSelect<T extends string>({
  id,
  value,
  options,
  onChange,
  className,
  "aria-labelledby": ariaLabelledBy,
}: {
  id?: string;
  value: T;
  options: ReadonlyArray<ThemedSelectOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  "aria-labelledby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listId = `${id ?? generatedId}-list`;
  const selected = options.find((option) => option.value === value);
  const label = selected?.label ?? value;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={ariaLabelledBy}
        className="border-input bg-background text-foreground hover:bg-muted/60 dark:bg-input/30 dark:hover:bg-input/50 flex h-8 w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-56 w-full min-w-full overflow-y-auto rounded-lg border p-1 shadow-md"
        >
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  className={cn(
                    "hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground focus-visible:outline-none",
                    checked && "bg-muted/80",
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {checked ? (
                    <Check className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
