import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Settings, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  useVariantsForMenuItem,
  useModifierGroupsForMenuItem,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useCreateModifierGroup,
  useLinkModifierGroup,
  useUnlinkModifierGroup,
  useCreateModifier,
  useDeleteModifier,
} from "@/hooks/api";
import { ModifierGroup, Variant } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MenuItemCustomizationProps {
  restaurantId: string;
  menuItemId: string;
  menuItemName: string;
  basePrice: number;
  currency: string;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuItemCustomization({
  restaurantId,
  menuItemId,
  menuItemName,
  basePrice,
  currency,
  isOpen,
  onClose,
}: MenuItemCustomizationProps) {
  const qc = useQueryClient();

  // -------------------------------------------------------
  // Fetch existing data (only when dialog is open)
  // -------------------------------------------------------
  const {
    data: fetchedVariants,
    isLoading: isLoadingVariants,
  } = useVariantsForMenuItem(restaurantId, isOpen ? menuItemId : null);

  const {
    data: fetchedModifierGroups,
    isLoading: isLoadingGroups,
  } = useModifierGroupsForMenuItem(restaurantId, isOpen ? menuItemId : null);

  // -------------------------------------------------------
  // Mutation hooks
  // -------------------------------------------------------
  const createVariant = useCreateVariant(restaurantId, menuItemId);
  const updateVariant = useUpdateVariant(restaurantId);
  const deleteVariant = useDeleteVariant(restaurantId);

  const createModifierGroup = useCreateModifierGroup(restaurantId);
  const linkModifierGroup = useLinkModifierGroup(restaurantId, menuItemId);
  const unlinkModifierGroup = useUnlinkModifierGroup(restaurantId, menuItemId);

  const createModifier = useCreateModifier(restaurantId);
  const deleteModifier = useDeleteModifier(restaurantId);

  // -------------------------------------------------------
  // Sync fetched data → local state whenever it arrives
  // -------------------------------------------------------
  useEffect(() => {
    if (fetchedVariants) {
      setVariants(fetchedVariants);
    }
  }, [fetchedVariants]);

  useEffect(() => {
    if (fetchedModifierGroups) {
      setModifierGroups(fetchedModifierGroups);
    }
  }, [fetchedModifierGroups]);

  // Helper: refetch both lists after any mutation
  const refreshLists = () => {
    qc.invalidateQueries({ queryKey: ["variants", restaurantId, menuItemId] });
    qc.invalidateQueries({ queryKey: ["modifier-groups-for-item", restaurantId, menuItemId] });
  };

  // -------------------------------------------------------
  // Local UI state
  // -------------------------------------------------------
  const [activeTab, setActiveTab] = useState<"variants" | "modifiers">("variants");

  // --- Variants ---
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantForm, setVariantForm] = useState({
    variantName: "",
    price: 0,
    isDefault: false,
  });

  // --- Modifier groups ---
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    selectionType: "MULTIPLE" as "SINGLE" | "MULTIPLE",
    minSelections: 0,
    maxSelections: undefined as number | undefined,
    isRequired: false,
  });

  // --- Modifiers ---
  const [isAddingModifier, setIsAddingModifier] = useState<string | null>(null);
  const [modifierForm, setModifierForm] = useState({
    name: "",
    price: 0,
    isDefault: false,
  });

  // ============================================================
  // VARIANT HANDLERS
  // ============================================================

  const handleAddVariant = async () => {
    try {
      // Send total price directly to backend
      await createVariant.mutateAsync({
        variantName: variantForm.variantName,
        price: variantForm.price,
        isDefault: variantForm.isDefault,
      });
      setVariantForm({ variantName: "", price: 0, isDefault: false });
      setIsAddingVariant(false);
      toast.success("Variant added successfully!");
      refreshLists();
    } catch {
      // toast already fired by the hook's onError
    }
  };

  const handleUpdateVariant = async () => {
    if (!editingVariant) return;
    try {
      // Send total price directly to backend
      await updateVariant.mutateAsync({
        variantId: editingVariant.id,
        data: {
          variantName: variantForm.variantName,
          price: variantForm.price,
          isDefault: variantForm.isDefault,
        },
      });
      setEditingVariant(null);
      setVariantForm({ variantName: "", price: 0, isDefault: false });
      toast.success("Variant updated successfully!");
      refreshLists();
    } catch {
      // toast already fired by the hook's onError
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Delete this variant?")) return;
    try {
      await deleteVariant.mutateAsync(variantId);
      toast.success("Variant deleted");
      refreshLists();
    } catch {
      // toast already fired by the hook's onError
    }
  };

  // ============================================================
  // MODIFIER GROUP HANDLERS
  // ============================================================

  const handleCreateModifierGroup = async () => {
    try {
      const modifierGroup = await createModifierGroup.mutateAsync(groupForm);

      // Link the newly-created group to this menu item
      await linkModifierGroup.mutateAsync(modifierGroup.id);

      setGroupForm({
        name: "",
        description: "",
        selectionType: "MULTIPLE",
        minSelections: 0,
        maxSelections: undefined,
        isRequired: false,
      });
      setIsAddingGroup(false);
      toast.success("Modifier group created!");
      refreshLists();
    } catch {
      // toast already fired by the hook's onError
    }
  };

  const handleUnlinkGroup = async (groupId: string) => {
    if (!confirm("Unlink this modifier group from this item?")) return;
    try {
      await unlinkModifierGroup.mutateAsync(groupId);
      toast.success("Modifier group unlinked");
      refreshLists();
    } catch {
      // toast already fired by the hook's onError
    }
  };

  // ============================================================
  // MODIFIER HANDLERS
  // ============================================================

  const handleAddModifier = async (groupId: string) => {
    try {
      await createModifier.mutateAsync({
        groupId,
        data: modifierForm,
      });
      setModifierForm({ name: "", price: 0, isDefault: false });
      setIsAddingModifier(null);
      toast.success("Modifier added!");
      refreshLists();
    } catch {
      // toast already fired by the hook's onError
    }
  };

  const handleDeleteModifier = async (groupId: string, modifierId: string) => {
    if (!confirm("Delete this modifier?")) return;
    try {
      await deleteModifier.mutateAsync(modifierId);
      toast.success("Modifier deleted");
      refreshLists();
    } catch {
      // toast already fired by the hook's onError
    }
  };

  // -------------------------------------------------------
  // Utility
  // -------------------------------------------------------
  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const isLoading = isLoadingVariants || isLoadingGroups;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Customize: {menuItemName}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Base Price: {currency}{Number(basePrice).toFixed(2)}
            </p>
          </DialogHeader>

          {/* Loading state while fetching initial data */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "variants" | "modifiers")}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
                <TabsTrigger value="variants">
                  Size/Variants
                  {variants.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{variants.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="modifiers">
                  Add-ons &amp; Modifiers
                  {modifierGroups.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{modifierGroups.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ================================================ VARIANTS TAB */}
              <TabsContent
                value="variants"
                className="flex-1 flex flex-col mt-0 overflow-hidden data-[state=active]:flex"
              >
                <div className="flex justify-between items-center px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Define different sizes or portions (e.g., Small, Medium, Large)
                  </p>
                  <Button size="sm" onClick={() => setIsAddingVariant(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variant
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-2 pb-4">
                    {variants.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No variants added yet. Add size options like Small, Medium, Large.
                      </div>
                    ) : (
                      variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{variant.variantName}</span>
                              {variant.isDefault && (
                                <Badge variant="outline" className="text-xs">
                                  Default
                                </Badge>
                              )}
                              {!variant.isAvailable && (
                                <Badge variant="secondary" className="text-xs">
                                  Unavailable
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {currency}{Number(variant.price).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingVariant(variant);
                                setVariantForm({
                                  variantName: variant.variantName,
                                  price: variant.price,
                                  isDefault: variant.isDefault,
                                });
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteVariant(variant.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* ============================================ MODIFIERS TAB */}
              <TabsContent
                value="modifiers"
                className="flex-1 flex flex-col mt-0 overflow-hidden data-[state=active]:flex"
              >
                <div className="flex justify-between items-center px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Add customization groups (e.g., Toppings, Spice Level)
                  </p>
                  <Button size="sm" onClick={() => setIsAddingGroup(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Group
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-3 pb-4">
                    {modifierGroups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No modifier groups yet. Create groups like "Toppings", "Spice Level", etc.
                      </div>
                    ) : (
                      modifierGroups.map((group) => {
                        const isExpanded = expandedGroups.has(group.id);
                        return (
                          <div key={group.id} className="border rounded-lg overflow-hidden">
                            {/* Group header */}
                            <div
                              className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleGroupExpanded(group.id)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{group.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {group.selectionType === "SINGLE" ? "Pick One" : "Pick Multiple"}
                                  </Badge>
                                  {group.isRequired && (
                                    <Badge className="text-xs">Required</Badge>
                                  )}
                                  <Badge variant="secondary" className="text-xs">
                                    {group.modifiers.length} options
                                  </Badge>
                                </div>
                                {group.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {group.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnlinkGroup(group.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>

                            {/* Group body (expanded) */}
                            {isExpanded && (
                              <div className="p-3 space-y-2">
                                {group.modifiers.map((modifier) => (
                                  <div
                                    key={modifier.id}
                                    className="flex items-center justify-between p-2 bg-background border rounded"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{modifier.name}</span>
                                        {modifier.isDefault && (
                                          <Badge variant="outline" className="text-xs">
                                            Default
                                          </Badge>
                                        )}
                                      </div>
                                      {modifier.price > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                          +{currency}{Number(modifier.price).toFixed(2)}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => handleDeleteModifier(group.id, modifier.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ))}

                                {/* Inline "add modifier" form */}
                                {isAddingModifier === group.id ? (
                                  <div className="border-t pt-3 space-y-3">
                                    <div className="space-y-2">
                                      <Label className="text-sm">Modifier Name</Label>
                                      <Input
                                        placeholder="e.g., Extra Cheese, Mushrooms, Mild, Spicy"
                                        value={modifierForm.name}
                                        onChange={(e) =>
                                          setModifierForm({ ...modifierForm, name: e.target.value })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm">
                                        Additional Price ({currency})
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={modifierForm.price}
                                        onChange={(e) =>
                                          setModifierForm({
                                            ...modifierForm,
                                            price: parseFloat(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleAddModifier(group.id)}
                                        disabled={!modifierForm.name}
                                      >
                                        Add Modifier
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setIsAddingModifier(null);
                                          setModifierForm({ name: "", price: 0, isDefault: false });
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2"
                                    onClick={() => setIsAddingModifier(group.id)}
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-2" />
                                    Add Option
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="px-6 py-4 border-t">
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Add/Edit - Nested Dialog with ScrollArea */}
      <Dialog open={isAddingVariant || editingVariant !== null} onOpenChange={(open) => {
        if (!open) {
          setIsAddingVariant(false);
          setEditingVariant(null);
          setVariantForm({ variantName: "", price: 0, isDefault: false });
        }
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              {editingVariant ? "Edit Variant" : "Add New Variant"}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Variant Name</Label>
                <Input
                  placeholder="e.g., Small, Medium, Large"
                  value={variantForm.variantName}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, variantName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Total Price ({currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={variantForm.price}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Enter the complete price for this variant (not the price difference)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={variantForm.isDefault}
                  onCheckedChange={(checked) =>
                    setVariantForm({ ...variantForm, isDefault: checked })
                  }
                />
                <Label>Set as default variant</Label>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button
              onClick={editingVariant ? handleUpdateVariant : handleAddVariant}
              disabled={!variantForm.variantName || !variantForm.price}
              className="w-full"
            >
              {editingVariant ? "Update" : "Add"} Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifier Group Create - Nested Dialog with ScrollArea */}
      <Dialog open={isAddingGroup} onOpenChange={(open) => {
        if (!open) {
          setIsAddingGroup(false);
          setGroupForm({
            name: "",
            description: "",
            selectionType: "MULTIPLE",
            minSelections: 0,
            maxSelections: undefined,
            isRequired: false,
          });
        }
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Create New Modifier Group</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input
                  placeholder="e.g., Toppings, Spice Level, Add-ons"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Brief description of this customization group"
                  value={groupForm.description}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Selection Type</Label>
                  <Select
                    value={groupForm.selectionType}
                    onValueChange={(value) =>
                      setGroupForm({
                        ...groupForm,
                        selectionType: value as "SINGLE" | "MULTIPLE",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single Choice</SelectItem>
                      <SelectItem value="MULTIPLE">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Min Selections</Label>
                  <Input
                    type="number"
                    min="0"
                    value={groupForm.minSelections}
                    onChange={(e) =>
                      setGroupForm({
                        ...groupForm,
                        minSelections: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={groupForm.isRequired}
                  onCheckedChange={(checked) =>
                    setGroupForm({ ...groupForm, isRequired: checked })
                  }
                />
                <Label>Required</Label>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button
              onClick={handleCreateModifierGroup}
              disabled={!groupForm.name}
              className="w-full"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}