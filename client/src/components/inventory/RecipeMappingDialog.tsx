import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  useRestaurant, useMenuCategories, useInfiniteInventory,
  useInventoryRecipes, useUpsertRecipe, useDeleteRecipe
} from "@/hooks/api";
import type { MenuItem, InventoryItem } from "@/types";

function RecipeEditor({ 
  menuItem,
  inventoryItems,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}: { 
  menuItem: MenuItem;
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

  const selectedInvItem = useMemo(() => 
    inventoryItems.find((i) => i.id === selectedInvId),
  [inventoryItems, selectedInvId]);

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

  const handleRemove = async (recipeId: string) => {
    await deleteRecipe.mutateAsync(recipeId);
  };

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="bg-muted/30 rounded-md p-3 space-y-4">
      <div className="space-y-2">
        {recipes?.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No ingredients mapped yet.</p>
        ) : (
          <div className="space-y-1.5">
            {recipes?.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-2 bg-background border px-3 py-2 rounded-md text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center min-w-0">
                  <span className="font-medium truncate">{r.materialName}</span>
                  <span className="text-muted-foreground sm:ml-2 text-xs sm:text-sm">{r.quantityPerUnit} {r.unit}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleRemove(r.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-3 pt-2 border-t border-border">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Raw Material</Label>
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between h-9 text-xs"
              >
                {selectedInvItem 
                  ? <span className="truncate">{selectedInvItem.materialName} ({selectedInvItem.currentStock} {selectedInvItem.unit} left)</span> 
                  : "Select material..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search materials..." className="h-9 text-xs" />
                <CommandList 
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                      if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                      }
                    }
                  }}
                  className="max-h-[200px]"
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
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedInvId === i.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{i.materialName} ({i.unit}) - {i.currentStock} left</span>
                      </CommandItem>
                    ))}
                    {isFetchingNextPage && (
                      <div className="py-2 flex justify-center items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-full sm:w-24 space-y-1">
          <Label className="text-xs">Qty {selectedInvItem ? `(${selectedInvItem.unit})` : ""}</Label>
          <Input 
            type="number" min="0.001" step="any" 
            className="h-9 text-xs" 
            value={qty} onChange={(e) => setQty(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <Button size="sm" className="h-9 px-4 w-full sm:w-auto" onClick={handleAdd} disabled={!selectedInvId || !Number(qty) || upsertRecipe.isPending}>
          {upsertRecipe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 sm:mr-1" />}
          <span className="sm:hidden ml-1">Add</span>
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>
    </div>
  );
}

export function RecipeMappingDialog({
  isOpen, onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { restaurantId } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  
  // Fetch menu (all categories/items)
  const { data: menuData, isLoading: loadingMenu } = useMenuCategories(restaurantId, restaurant?.slug ?? null);
  
  // Use infinite scrolling inventory query
  const filterParams = useMemo(() => ({ limit: 20 }), []);
  const { 
    data: invData, 
    isLoading: loadingInv,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteInventory(restaurantId, filterParams);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const menuItems = useMemo(() => {
    if (!menuData) return [];
    return menuData.items.filter((item: MenuItem) => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [menuData, searchTerm]);

  const inventoryItems = useMemo(() => {
    return invData?.pages.flatMap((page) => page.items) ?? [];
  }, [invData]);

  const isLoading = loadingMenu || loadingInv;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] w-[95vw] sm:w-full flex flex-col p-0">
        <div className="p-3 sm:p-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ChefHat className="w-5 h-5 text-primary" /> Recipe Mapping
            </DialogTitle>
            <DialogDescription>
              Link raw materials to menu items for automatic stock deduction.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-3 sm:p-4 border-b bg-muted/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search menu items to map..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No menu items found.
            </div>
          ) : (
            <div className="space-y-2">
              {menuItems.map((item: MenuItem) => (
                <div key={item.id} className="border rounded-lg overflow-hidden transition-all">
                  <div 
                    className="flex justify-between items-center gap-2 p-3 sm:p-4 bg-background hover:bg-muted/30 cursor-pointer"
                    onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover border shrink-0" />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <ChefHat className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm truncate">{item.name}</h4>
                        {item.description && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{item.description}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-[10px] sm:text-xs", expandedItemId === item.id ? "bg-primary/10 text-primary border-primary/20" : "")}>
                      <span className="hidden sm:inline">{expandedItemId === item.id ? "Close" : "Map Recipe"}</span>
                      <span className="sm:hidden">{expandedItemId === item.id ? "Close" : "Map"}</span>
                    </Badge>
                  </div>
                  
                  {expandedItemId === item.id && (
                    <div className="p-3 border-t bg-muted/10">
                      <RecipeEditor 
                        menuItem={item} 
                        inventoryItems={inventoryItems} 
                        fetchNextPage={fetchNextPage}
                        hasNextPage={Boolean(hasNextPage)}
                        isFetchingNextPage={isFetchingNextPage}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
