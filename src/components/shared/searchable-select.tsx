"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface SearchableOption {
  label: string;
  value: string;
  sublabel?: string;
  badge?: string;
  unit?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  allOptionLabel?: string;
  allOptionValue?: string;
  className?: string;
  triggerClassName?: string;
  dropdownWidth?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  options = [],
  value,
  onChange,
  allOptionLabel = "All",
  allOptionValue = "ALL",
  className,
  triggerClassName,
  dropdownWidth = "w-64",
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(query)) ||
        (opt.badge && opt.badge.toLowerCase().includes(query)) ||
        (opt.unit && opt.unit.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  // Find the selected option label
  const selectedOption = useMemo(() => {
    if (value === allOptionValue || !value) {
      return null;
    }
    return options.find((opt) => opt.value === value) || null;
  }, [options, value, allOptionValue]);

  const displayLabel = selectedOption
    ? selectedOption.label
    : allOptionLabel;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-semibold text-slate-800 transition-all hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-700",
          isOpen && "border-sky-500 ring-2 ring-sky-500/20 dark:border-sky-500",
          triggerClassName
        )}
      >
        {label && (
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 select-none">
            {label}
          </span>
        )}
        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-sky-600 dark:text-sky-400"
          )}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={cn(
            "absolute left-0 z-50 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10 min-w-[220px]",
            dropdownWidth
          )}
        >
          {/* Full-width Search Bar Header */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-850/50">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {/* "All" Option */}
            {!searchQuery && allOptionLabel && (
              <button
                type="button"
                onClick={() => handleSelect(allOptionValue)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left",
                  value === allOptionValue || !value
                    ? "bg-sky-50 text-sky-700 font-bold dark:bg-sky-950/60 dark:text-sky-300"
                    : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <span className="truncate">{allOptionLabel}</span>
                {(value === allOptionValue || !value) && (
                  <Check className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0 ml-1.5" />
                )}
              </button>
            )}

            {/* Empty State */}
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching results found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left",
                      isSelected
                        ? "bg-sky-50 text-sky-700 font-bold dark:bg-sky-950/60 dark:text-sky-300"
                        : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 px-1 font-semibold text-slate-500 border-slate-300 dark:border-slate-700 dark:text-slate-400"
                        >
                          {opt.badge}
                        </Badge>
                      )}
                      {opt.unit && (
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 px-1 font-semibold text-indigo-600 border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
                        >
                          {opt.unit}
                        </Badge>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
