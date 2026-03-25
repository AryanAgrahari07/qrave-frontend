import React, { createContext, useContext, useState, useEffect } from "react";
import type { MenuItem } from "@/types";

export interface CartItem {
  id: string; // unique cart item id (e.g. uuid)
  menuItemId: string;
  name: string;
  nameTranslations?: Record<string, string>;
  price: number;
  quantity: number;
  notes?: string;
  selectedVariantId?: string | null;
  variantName?: string | null;
  variantNameTranslations?: Record<string, string>;
  selectedModifiers?: Array<{
    id: string;
    name: string;
    nameTranslations?: Record<string, string>;
    price: number;
    groupId?: string;
    groupName?: string;
  }>;
}

interface CartState {
  items: CartItem[];
  tableId: string | null;
  orderId: string | null;
  customerSessionId: string | null;
  restaurantSlug: string | null;
}

interface CartContextType {
  state: CartState;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  setTableId: (tableId: string | null) => void;
  setOrderSession: (orderId: string, sessionId: string) => void;
  clearOrderSession: () => void;
  initializeForRestaurant: (slug: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "qrz_customer_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error("Failed to parse cart from local storage", err);
    }
    return {
      items: [],
      tableId: null,
      orderId: null,
      customerSessionId: null,
      restaurantSlug: null,
    };
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Read ?table= param from URL on initial load if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTableId = params.get("table");
    if (urlTableId && urlTableId !== state.tableId) {
      setState((prev) => ({ ...prev, tableId: urlTableId }));
    }
  }, []); // Run once

  const initializeForRestaurant = (slug: string) => {
    if (state.restaurantSlug !== slug) {
      // Clear cart if switching to a different restaurant's menu
      setState({
        items: [],
        tableId: null,
        orderId: null,
        customerSessionId: null,
        restaurantSlug: slug,
      });
    }
  };

  const addItem = (item: Omit<CartItem, "id">) => {
    // Basic check to see if an identical item is already in cart
    // An identical item has same menuItemId, variant, modifiers, and notes
    const identicalItemIndex = state.items.findIndex(
      (i) =>
        i.menuItemId === item.menuItemId &&
        i.selectedVariantId === item.selectedVariantId &&
        i.notes === item.notes &&
        JSON.stringify(i.selectedModifiers) === JSON.stringify(item.selectedModifiers)
    );

    if (identicalItemIndex >= 0) {
      // Increment quantity of existing
      setState((prev) => {
        const newItems = [...prev.items];
        newItems[identicalItemIndex].quantity += item.quantity;
        return { ...prev, items: newItems };
      });
    } else {
      // Add new
      const newItem: CartItem = {
        ...item,
        id: crypto.randomUUID(),
      };
      setState((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    }
  };

  const removeItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  };

  const updateQuantity = (id: string, delta: number) => {
    setState((prev) => ({
      ...prev,
      items: prev.items
        .map((i) => {
          if (i.id === id) {
            const newQ = i.quantity + delta;
            return { ...i, quantity: Math.max(0, newQ) };
          }
          return i;
        })
        .filter((i) => i.quantity > 0), // Auto-remove if quantity goes to 0
    }));
  };

  const clearCart = () => {
    setState((prev) => ({ ...prev, items: [] }));
  };

  const setTableId = (tableId: string | null) => {
    setState((prev) => ({ ...prev, tableId }));
  };

  const setOrderSession = (orderId: string, sessionId: string) => {
    setState((prev) => ({
      ...prev,
      orderId,
      customerSessionId: sessionId,
      items: [], // usually clear cart when order is placed successfully
    }));
  };

  const clearOrderSession = () => {
    setState((prev) => ({
      ...prev,
      orderId: null,
      customerSessionId: null,
      items: [],
    }));
  };

  return (
    <CartContext.Provider
      value={{
        state,
        isCartOpen,
        setIsCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setTableId,
        setOrderSession,
        clearOrderSession,
        initializeForRestaurant,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
