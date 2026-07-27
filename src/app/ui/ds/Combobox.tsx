// src/app/ui/ds/Combobox.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { HOVER_TINT_CLASS } from "./tint";

export interface ComboboxOption {
  id: string;
  label: string;
}

export interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export default function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyMessage = "No matches found.",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) setHighlightedIndex(0);
  }, [open, query]);

  function openList() {
    setOpen(true);
    setQuery("");
    // Runs after the input swaps from the read-only trigger to the search
    // field in the same render pass, so the ref is already attached by the
    // time this callback fires - a plain focus() call here would target the
    // pre-swap node (or nothing) and silently no-op.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectOption(optionId: string) {
    onChange(optionId);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[highlightedIndex];
      if (option) selectOption(option.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  const listboxId = `${id ?? "combobox"}-listbox`;
  const activeOptionId = filtered[highlightedIndex] ? `${listboxId}-${filtered[highlightedIndex].id}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full border border-divider bg-surface px-3 py-2.5 text-[14px] text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        />
      ) : (
        <button
          type="button"
          id={id}
          onClick={openList}
          className="flex w-full items-center justify-between border border-divider bg-surface px-3 py-2.5 text-left text-[14px] text-text"
        >
          <span>{selected?.label ?? placeholder}</span>
          <ChevronDown size={16} className="shrink-0 text-muted-400" />
        </button>
      )}

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto border border-divider bg-surface"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2.5 text-[14px] text-muted-400">{emptyMessage}</li>
          )}
          {filtered.map((option, index) => (
            <li
              key={option.id}
              id={`${listboxId}-${option.id}`}
              role="option"
              aria-selected={option.id === value}
              onMouseDown={(e) => {
                // onMouseDown (not onClick) fires before the container's
                // mousedown-based click-outside listener above, so selecting
                // a row commits the value instead of just closing the list.
                e.preventDefault();
                selectOption(option.id);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`cursor-pointer px-3 py-2.5 text-[14px] text-text ${HOVER_TINT_CLASS} ${
                index === highlightedIndex ? "bg-accent-100" : ""
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
