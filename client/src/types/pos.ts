import type { MenuItem } from "@/types";

export interface POSCartLineItem {
  /** Unique id per cart line (so multiple customizations of same item can exist) */
  lineId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  variantId?: string;
  modifierIds?: string[];
  isVeg?: boolean;

  /** Optional: full menu item for display (if available) */
  menuItem?: MenuItem;
}

export interface POSCustomizationSelection {
  menuItemId: string;
  quantity: number;
  variantId?: string;
  modifierIds?: string[];
}
