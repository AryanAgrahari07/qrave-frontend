import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChefHat, Loader2, Plus, Trash2, Search, Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  useInfiniteInventory,
  useInventoryRecipes, useUpsertRecipe, useDeleteRecipe,
  useRestaurant, useMenuCategories,
} from "@/hooks/api";
import type { InventoryItem } from "@/types";

/* ─────────── RecipeEditor (expanded per menu item) ─────────── */

function RecipeEditor({
  menuItem,
  inventoryItems,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  menuItem: any;
  inventoryItems: InventoryItem[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) {
  const { restaurantId } = useAuth();
  const { data: recipes, isLoading } = useInventoryRecipes(restaurantId, menuItem.id);
  const upsertRecipe = useUpsertRecipe(restaurantId);
  const deleteRecipe = useDeleteRecipe(restaurantId);

  const [selectedInvId, setSelectedInvId] = useState("");
  const [qty, setQty] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);

  const selectedInvItem = useMemo(
    () => inventoryItems.find((i) => i.id === selectedInvId),
    [inventoryItems, selectedInvId],
  );

  const handleAdd = async () => {
    if (!selectedInvId || !Number(qty)) return;
    await upsertRecipe.mutateAsync({
      menuItemId: menuItem.id,
      inventoryItemId: selectedInvId,
      quantityPerUnit: Number(qty),
    });
    setSelectedInvId("");
    setQty("");
  };

  if (isLoading)
    return (
      <div className="py-4 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );

  return (
    <div className="bg-muted/30 rounded-md p-2.5 sm:p-3 space-y-3">
      {/* Existing ingredients */}
      {recipes?.length === 0 ? (
        <p className="text-[11px] sm:text-xs text-muted-foreground italic">
          No ingredients mapped yet.
        </p>
      ) : (
        <div className="space-y-1">
          {recipes?.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-1.5 bg-background border px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center min-w-0 gap-0.5 sm:gap-0">
                <span className="font-medium text-[11px] sm:text-sm truncate">{r.materialName}</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs sm:ml-2">
                  {r.quantityPerUnit} {r.unit}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => deleteRecipe.mutateAsync(r.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add ingredient row */}
      <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border sm:grid-cols-[1fr_80px_auto] sm:items-end">
        {/* Material picker */}
        <div className="space-y-1">
          <Label className="text-[10px] sm:text-xs">Raw Material</Label>
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between h-8 sm:h-9 text-[11px] sm:text-xs"
              >
                {selectedInvItem ? (
                  <span className="truncate">
                    {selectedInvItem.materialName} ({selectedInvItem.currentStock} {selectedInvItem.unit})
                  </span>
                ) : (
                  "Select material..."
                )}
                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search materials..." className="h-8 sm:h-9 text-xs" />
                <CommandList
                  onScroll={(e) => {
                    const t = e.currentTarget;
                    if (t.scrollHeight - t.scrollTop <= t.clientHeight + 50 && hasNextPage && !isFetchingNextPage) {
                      fetchNextPage();
                    }
                  }}
                  className="max-h-[180px]"
                >
                  <CommandEmpty>No material found.</CommandEmpty>
                  <CommandGroup>
                    {inventoryItems.map((i) => (
                      <CommandItem
                        key={i.id}
                        value={`${i.materialName} ${i.unit}`}
                        onSelect={() => {
                          setSelectedInvId(i.id === selectedInvId ? "" : i.id);
                          setOpenCombobox(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-3.5 w-3.5", selectedInvId === i.id ? "opacity-100" : "opacity-0")} />
                        <span className="truncate text-xs">
                          {i.materialName} ({i.unit}) – {i.currentStock} left
                        </span>
                      </CommandItem>
                    ))}
                    {isFetchingNextPage && (
                      <div className="py-2 flex justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Quantity + Add button on same row for mobile */}
        <div className="flex gap-2 sm:contents">
          <div className="flex-1 sm:flex-none space-y-1">
            <Label className="text-[10px] sm:text-xs">
              Qty{selectedInvItem ? ` (${selectedInvItem.unit})` : ""}
            </Label>
            <Input
              type="number"
              min="0.001"
              step="any"
              className="h-8 sm:h-9 text-[11px] sm:text-xs"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              className="h-8 sm:h-9 px-3 sm:px-4"
              onClick={handleAdd}
              disabled={!selectedInvId || !Number(qty) || upsertRecipe.isPending}
            >
              {upsertRecipe.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span className="ml-1 text-xs">Add</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Inner dialog content (only mounts when open) ─────────── */

function RecipeMappingDialogInner() {
  const { restaurantId } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Fetch restaurant → slug → actual menu items
  const { data: restaurant } = useRestaurant(restaurantId);
  const slug = restaurant?.slug ?? null;
  const { data: menuData, isLoading: loadingMenu } = useMenuCategories(restaurantId, slug);

  const filterParams = useMemo(() => ({ limit: 20 }), []);
  const {
    data: invData,
    isLoading: loadingInv,
    fetchNextPage: fetchNextInvPage,
    hasNextPage: hasNextInvPage,
    isFetchingNextPage: isFetchingNextInvPage,
  } = useInfiniteInventory(restaurantId, filterParams);

  // Client-side search filter over real menu items
  const menuItems = useMemo(() => {
    const all = menuData?.items ?? [];
    if (!searchTerm.trim()) return all;
    const q = searchTerm.toLowerCase();
    return all.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q),
    );
  }, [menuData, searchTerm]);

  const inventoryItems = useMemo(
    () => invData?.pages.flatMap((p) => p.items) ?? [],
    [invData],
  );

  const isLoading = loadingMenu || loadingInv;

  return (
    <>
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4 border-b shrink-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
            <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Recipe Mapping
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-sm">
            Link raw materials to menu items for automatic stock deduction.
          </DialogDescription>
        </DialogHeader>
      </div>

      {/* ── Search ── */}
      <div className="px-3 py-2.5 sm:px-5 sm:py-3 border-b bg-muted/10 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-9 h-8 sm:h-9 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* ── Scrollable menu item list ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
        {isLoading && menuItems.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {searchTerm ? "No matching menu items." : "No menu items found."}
          </div>
        ) : (
          <div className="space-y-2">
            {menuItems.map((item: any) => (
              <div
                key={item.id}
                className="border rounded-lg overflow-hidden transition-colors"
              >
                {/* Row */}
                <button
                  type="button"
                  className="w-full flex justify-between items-center gap-2 p-2.5 sm:p-3.5 bg-background hover:bg-muted/40 transition-colors text-left"
                  onClick={() =>
                    setExpandedItemId(expandedItemId === item.id ? null : item.id)
                  }
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-7 h-7 sm:w-9 sm:h-9 rounded object-cover border shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded bg-muted flex items-center justify-center shrink-0">
                        <ChefHat className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[11px] sm:text-sm truncate leading-tight">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[9px] sm:text-xs py-0.5 px-1.5 sm:px-2",
                      expandedItemId === item.id
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "",
                    )}
                  >
                    {expandedItemId === item.id ? "Close" : "Map"}
                  </Badge>
                </button>

                {/* Expanded recipe editor */}
                {expandedItemId === item.id && (
                  <div className="p-2.5 sm:p-3 border-t bg-muted/10">
                    <RecipeEditor
                      menuItem={item}
                      inventoryItems={inventoryItems}
                      fetchNextPage={fetchNextInvPage}
                      hasNextPage={Boolean(hasNextInvPage)}
                      isFetchingNextPage={isFetchingNextInvPage}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────── Exported wrapper ─────────── */

export function RecipeMappingDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full h-[85vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        {isOpen && <RecipeMappingDialogInner />}
      </DialogContent>
    </Dialog>
  );
}
