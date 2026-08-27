"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type BrandComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

export function BrandCombobox({ value, onChange, id }: BrandComboboxProps) {
  const [brands, setBrands] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/products/brands")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setBrands(json.data);
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const term = value.trim().toLowerCase();
    const filtered = term ? brands.filter((b) => b.toLowerCase().includes(term)) : brands;
    return filtered.slice(0, 8);
  }, [brands, value]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="e.g. Pilot"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {suggestions.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => {
                onChange(brand);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-sm hover:bg-muted",
                brand === value && "bg-muted"
              )}
            >
              {brand}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
