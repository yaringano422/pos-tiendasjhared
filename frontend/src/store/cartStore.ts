import { create } from "zustand";
import { CartItem, Product, PriceMode } from "../types";

export interface SelectedVariant {
  variantId: string;
  variantName: string;
  priceModifier: number;
}

interface CartState {
  items: CartItem[];
  tableId: string | null;
  orderId: string | null;
  customerName: string;
  customerCount: number;
  notes: string;
  discountAmount: number;

  // AJUSTE: Ahora acepta un objeto CartItem para compatibilidad con el POS
  addItem: (item: CartItem) => void;
  removeItem: (productId: string | number) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  updateItemCustomization: (
    productId: string | number,
    newNotes: string,
    newVariants: SelectedVariant[],
  ) => void;

  setTable: (tableId: string | null) => void;
  setCustomer: (name: string, count?: number) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;

  getSubtotal: () => number;
  getTaxAmount: () => number;
  getCommisionCard: () => number; // Comisión del 5%
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  orderId: null,
  customerName: "",
  customerCount: 1,
  notes: "",
  discountAmount: 0,

  // Implementación ajustada para recibir el objeto del POS
  addItem: (newItem: CartItem) => {
    const { items } = get();
    const productId = String(newItem.product_id);
    const existingItem = items.find((i) => String(i.product_id) === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + newItem.quantity;

      // Validación de stock si el dato está disponible
      if (
        newItem.stock_disponible !== undefined &&
        newQuantity > newItem.stock_disponible
      ) {
        return;
      }

      set({
        items: items.map((i) =>
          String(i.product_id) === productId
            ? { ...i, quantity: newQuantity }
            : i,
        ),
      });
    } else {
      set({ items: [...items, newItem] });
    }
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => String(i.product_id) !== String(productId),
      ),
    }));
  },

  updateQuantity: (productId, quantity) => {
    const { items } = get();
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const item = items.find((i) => String(i.product_id) === String(productId));
    if (
      item &&
      item.stock_disponible !== undefined &&
      quantity > item.stock_disponible
    ) {
      return; // No actualizar si excede el stock
    }

    set((state) => ({
      items: state.items.map((i) =>
        String(i.product_id) === String(productId) ? { ...i, quantity } : i,
      ),
    }));
  },

  updateItemCustomization: (productId, newNotes, newVariants) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (String(item.product_id) !== String(productId)) return item;

        const previousModifiersSum = (item.variants || []).reduce(
          (acc, v) => acc + (v.priceModifier || 0),
          0,
        );
        const newModifiersSum = newVariants.reduce(
          (acc, v) => acc + (v.priceModifier || 0),
          0,
        );

        const baseOriginalPrice = item.price - previousModifiersSum;
        const newUnitPrice = baseOriginalPrice + newModifiersSum;

        return {
          ...item,
          notes: newNotes,
          variants: newVariants,
          price: newUnitPrice,
        };
      }),
    }));
  },

  setTable: (tableId) => set({ tableId }),
  setCustomer: (name, count) =>
    set({ customerName: name, customerCount: count || 1 }),
  setDiscount: (amount) => set({ discountAmount: amount }),

  clearCart: () =>
    set({
      items: [],
      tableId: null,
      orderId: null,
      customerName: "",
      customerCount: 1,
      notes: "",
      discountAmount: 0,
    }),

  // CÁLCULOS FINANCIEROS

  // Suma simple de (precio * cantidad) de todos los items
  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  // Calcula el IGV (18%) contenido en el subtotal
  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    return subtotal - subtotal / 1.18;
  },

  // Comisión por pago con tarjeta (5% sobre el valor de los productos)
  getCommisionCard: () => {
    return get().getSubtotal() * 0.05;
  },

  // Total final: Subtotal - Descuento + (Comisión si aplica)
  // Nota: La lógica de si sumar o no la comisión la manejas en el componente POS
  getTotal: () => {
    return get().getSubtotal() - get().discountAmount;
  },
}));
