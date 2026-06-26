"use client";

import * as React from "react";

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  options?: { name: string }[];
  providers?: { name: string }[];
}

export function Combobox({
  value,
  onChange,
  options = [],
  providers = [],
  placeholder = "Seleccionar...",
}: ComboboxProps) {
  // UNIFICACIÓN TOTAL: Combinamos ambos arrays siempre
  const data = [...options, ...providers];
  const listId = React.useId();

  return (
    <div className="relative w-full">
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 mt-1 outline-none focus:border-brand-500 transition-all text-white placeholder:text-gray-500"
      />
      <datalist id={listId}>
        {data.map((item, index) => (
          // Usamos un índice único o item.name como key
          <option key={`${item.name}-${index}`} value={item.name} />
        ))}
      </datalist>
    </div>
  );
}
