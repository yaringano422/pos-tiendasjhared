import React, { useState } from "react";
import { X, DollarSign, FileText } from "lucide-react";

interface ModalCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (price: number, notes: string) => void;
  initialPrice: number;
  productName: string;
}

export default function ModalCustomization({
  isOpen,
  onClose,
  onConfirm,
  initialPrice,
  productName,
}: ModalCustomizationProps) {
  const [customPrice, setCustomPrice] = useState(initialPrice);
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#16191f] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Personalizar Venta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-400">
            Ajustando precio para:{" "}
            <span className="text-blue-400 font-medium">{productName}</span>
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Precio Especial (S/.)
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="w-full bg-[#0f1115] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Notas / Observaciones
            </label>
            <div className="relative">
              <FileText
                className="absolute left-3 top-3 text-gray-500"
                size={18}
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Incluye mica de regalo o falla técnica específica..."
                className="w-full bg-[#0f1115] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all h-24 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(customPrice, notes)}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            Aplicar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
