import { create } from "zustand";
import { CartItem, Product, PriceMode } from "../types";

export interface SelectedVariant {
  variantId: string;
  variantName: string;
  priceModifier: number;
}

// Extendemos conceptualmente lo que debe tener cada CartItem para soportar los respaldos
interface CartState {
  items: any[]; // Usamos any o actualiza tu interfaz CartItem en types.ts para incluir price_normal, price_major y modo_precio
  tableId: string | null;
  orderId: string | null;
  customerName: string;
  customerCount: number;
  notes: string;
  discountAmount: number;

  addItem: (item: CartItem) => void;
  removeItem: (productId: string | number) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  updateItemCustomization: (
    productId: string | number,
    newNotes: string,
    newVariants: SelectedVariant[],
  ) => void;

  // ACCIONES PARA PASAR EL CONTROL DE PRECIOS AL STORE
  setGlobalPriceMode: (mode: PriceMode) => void;
  updateItemPrice: (productId: string | number, price: number) => void;

  setTable: (tableId: string | null) => void;
  setCustomer: (name: string, count?: number) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;

  getSubtotal: () => number;
  getTaxAmount: () => number;
  getCommisionCard: () => number;
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

  addItem: (newItem: any) => {
    const { items } = get();
    const productId = String(newItem.product_id);
    const existingItem = items.find((i) => String(i.product_id) === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + newItem.quantity;

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
      return;
    }

    set((state) => ({
      items: state.items.map((i) =>
        String(i.product_id) === String(productId) ? { ...i, quantity } : i,
      ),
    }));
  },

  // RECALCULACIÓN GLOBAL AL CAMBIAR TIPO DE VENTA
  setGlobalPriceMode: (mode: PriceMode) => {
    set((state) => ({
      items: state.items.map((item) => {
        let nuevoPrecio = item.price;

        // Recuperamos los respaldos guardados originalmente al añadir el producto
        const normal = item.price_normal ?? item.price;
        const major = item.price_major ?? item.price;

        if (mode === "menor") nuevoPrecio = normal;
        if (mode === "mayorista") nuevoPrecio = major;
        // Si es 'personalizado', mantiene el precio que tiene actualmente hasta que el usuario lo edite

        return {
          ...item,
          modo_precio: mode,
          price: nuevoPrecio,
        };
      }),
    }));
  },

  // PERMITE EDITAR EL PRECIO UNITARIO MANUALMENTE EN MODO PERSONALIZADO
  updateItemPrice: (productId, price) => {
    set((state) => ({
      items: state.items.map((item) =>
        String(item.product_id) === String(productId)
          ? { ...item, price: price, modo_precio: "personalizado" }
          : item,
      ),
    }));
  },

  updateItemCustomization: (productId, newNotes, newVariants) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (String(item.product_id) !== String(productId)) return item;

        const previousModifiersSum = (item.variants || []).reduce(
          (acc: number, v: SelectedVariant) => acc + (v.priceModifier || 0),
          0,
        );

        const newModifiersSum = newVariants.reduce(
          (acc: number, v: SelectedVariant) => acc + (v.priceModifier || 0),
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

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    return subtotal - subtotal / 1.18;
  },

  getCommisionCard: () => {
    return get().getSubtotal() * 0.05;
  },

  getTotal: () => {
    return get().getSubtotal() - get().discountAmount;
  },
}));
