import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Image as ImageIcon, Pencil, Trash2, X, Upload, Search, Sparkles, Loader2, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRestaurant, useMenuCategories, useCreateCategory, useUpdateCategory, useCreateMenuItem, useUpdateMenuItem, useUpdateMenuItemAvailability, useDeleteMenuItem, useDeleteCategory, useVariantsForMenuItem, useModifierGroupsForMenuItem, useMenuSuggestions } from "@/hooks/api";
import { api } from "@/lib/api";
import type { MenuCategory, MenuItem, MenuSuggestion } from "@/types";
import { MenuCardUploader } from "@/components/menu/MenuCardUploader";
import { ExtractionPreview } from "@/components/menu/ExtractionPreview";
import { MenuItemCustomization } from "@/components/menu/MenuItemCustomization";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";


// Image Crop Dialog Component
function ImageCropDialog({
  imageUrl,
  isOpen,
  onClose,
  onCropComplete,
}: {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteInternal = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const image = new Image();
      image.src = imageUrl;

      await new Promise((resolve) => {
        image.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Compress: cap maximum dimension to 800px while preserving aspect ratio
      const MAX_DIMENSION = 800;
      const srcW = croppedAreaPixels.width;
      const srcH = croppedAreaPixels.height;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
      const outW = Math.round(srcW * scale);
      const outH = Math.round(srcH * scale);

      canvas.width = outW;
      canvas.height = outH;

      // Draw the cropped (and down-scaled) image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        srcW,
        srcH,
        0,
        0,
        outW,
        outH
      );

      // Compress: JPEG quality 0.78 — visually great for food photos, ~60-80% smaller
      canvas.toBlob((blob) => {
        if (blob) {
          const sizeKB = Math.round(blob.size / 1024);
          const croppedImageUrl = URL.createObjectURL(blob);
          onCropComplete(croppedImageUrl);
          toast.success(`Image saved (${outW}×${outH}px · ${sizeKB} KB)`);
          onClose();
        }
      }, "image/jpeg", 0.78);
    } catch (error) {
      console.error("Error cropping image:", error);
      toast.error("Failed to crop image");
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageUrl, onCropComplete, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <div className="p-3 sm:p-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Crop Image</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Adjust the image crop area and zoom level
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="relative h-[280px] sm:h-[320px] md:h-[380px] bg-gray-900 overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={4 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteInternal}
            style={{
              containerStyle: {
                backgroundColor: '#1a1a1a',
              },
            }}
          />
        </div>

        <div className="p-3 sm:p-4 space-y-3 border-t">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-medium">Zoom</Label>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-xs text-muted-foreground">1x</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((zoom - 1) / 2) * 100}%, hsl(var(--muted)) ${((zoom - 1) / 2) * 100}%, hsl(var(--muted)) 100%)`
                }}
              />
              <span className="text-[10px] sm:text-xs text-muted-foreground">3x</span>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-9 sm:h-10 text-sm"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={createCroppedImage}
            className="flex-1 h-9 sm:h-10 text-sm bg-primary hover:bg-primary/90"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Apply Crop"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Separate component for menu item row to properly use hooks
function MenuItemRow({
  item,
  currency,
  onToggleAvailability,
  onEdit,
  onDelete,
  onCustomize,
  updateAvailabilityPending,
  hasCustomizations
}: {
  item: MenuItem;
  currency: string;
  onToggleAvailability: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCustomize: () => void;
  updateAvailabilityPending: boolean;
  hasCustomizations: boolean;
}) {
  return (
    <div className="p-2.5 sm:p-3 md:p-4 flex items-start gap-2 sm:gap-3 md:gap-4 hover:bg-muted/10 transition-colors group">
      {/* Item Image */}
      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-md sm:rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-border">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1 min-w-0">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h4 className="font-semibold text-xs sm:text-sm md:text-base leading-tight break-words whitespace-normal min-w-0">
              {item.name}
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {item.dietaryTags?.map((tag, i) => {
                const isVeg = tag.toLowerCase() === "veg";
                const isNonVeg = tag.toLowerCase() === "non-veg";
                return (
                  <Badge
                    key={i}
                    className={cn(
                      "text-[8px] sm:text-[9px] md:text-[10px] px-1 py-0 h-3 sm:h-3.5 md:h-4",
                      isVeg && "bg-green-100 text-green-800 border-green-200",
                      isNonVeg && "bg-red-100 text-red-800 border-red-200"
                    )}
                  >
                    {tag}
                  </Badge>
                );
              })}
              {hasCustomizations && (
                <Badge
                  className="text-[8px] sm:text-[9px] md:text-[10px] px-1 py-0 h-3 sm:h-3.5 md:h-4 bg-blue-100 text-blue-800 border-blue-200"
                >
                  <Settings className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5" />
                  Customized
                </Badge>
              )}
            </div>
          </div>
          <p className="font-mono font-medium text-xs sm:text-sm md:text-base flex-shrink-0 mt-0.5">{currency}{item.price}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 w-full mt-1 sm:mt-0">
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none flex-1">
            {item.description || "No description"}
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-muted-foreground whitespace-nowrap">In Stock</span>
              <Switch
                checked={item.isAvailable}
                onCheckedChange={onToggleAvailability}
                disabled={updateAvailabilityPending}
                className="scale-75 sm:scale-100"
              />
            </div>

            {/* Action Buttons - Mobile */}
            <div className="flex sm:hidden items-center gap-1.5 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={onCustomize}
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={onEdit}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Desktop */}
      <div className="hidden sm:flex items-center gap-1.5 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 md:h-8 text-xs gap-1"
          onClick={onCustomize}
        >
          <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 md:h-8 text-xs"
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </Button>
      </div>
    </div>
  );
}

// Hook to check if an item has customizations
function useItemCustomizations(restaurantId: string, menuItemId: string, isDialogOpen: boolean) {
  const { data: variants } = useVariantsForMenuItem(restaurantId, isDialogOpen ? null : menuItemId);
  const { data: modifierGroups } = useModifierGroupsForMenuItem(restaurantId, isDialogOpen ? null : menuItemId);

  const hasCustomizations = useMemo(() => {
    const hasVariants = variants && variants.length > 0;
    const hasModifiers = modifierGroups && modifierGroups.length > 0;
    return !!(hasVariants || hasModifiers);
  }, [variants, modifierGroups]);

  return hasCustomizations;
}

// Wrapper component to use the customization hook
function MenuItemRowWithCustomizations({
  item,
  currency,
  onToggleAvailability,
  onEdit,
  onDelete,
  onCustomize,
  updateAvailabilityPending,
  restaurantId,
  isDialogOpen
}: {
  item: MenuItem;
  currency: string;
  onToggleAvailability: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCustomize: () => void;
  updateAvailabilityPending: boolean;
  restaurantId: string | null;
  isDialogOpen: boolean;
}) {
  const hasCustomizations = useItemCustomizations(restaurantId ?? "", item.id, isDialogOpen);

  return (
    <MenuItemRow
      item={item}
      currency={currency}
      onToggleAvailability={onToggleAvailability}
      onEdit={onEdit}
      onDelete={onDelete}
      onCustomize={onCustomize}
      updateAvailabilityPending={updateAvailabilityPending}
      hasCustomizations={hasCustomizations}
    />
  );
}

// Sortable Category Component
function SortableCategory({
  category,
  currency,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddItem,
  onToggleAvailability,
  onEditItem,
  onDeleteItem,
  onCustomizeItem,
  updateAvailabilityPending,
  restaurantId,
  customizingItemId,
  dietaryFilter,
}: {
  category: MenuCategory & { items: MenuItem[] };
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onToggleAvailability: (item: MenuItem) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string) => void;
  onCustomizeItem: (item: MenuItem) => void;
  updateAvailabilityPending: boolean;
  restaurantId: string | null;
  customizingItemId: string | null;
  dietaryFilter: 'any' | 'veg' | 'non-veg';
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-background border border-border rounded-lg sm:rounded-xl shadow-sm overflow-hidden"
    >
      {/* Category Header - Responsive */}
      <div className="p-2.5 sm:p-3 md:p-4 border-b bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
          </div>
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 hover:opacity-70 transition-opacity"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
            )}
            <h3 className="font-heading font-bold text-sm sm:text-base md:text-lg truncate flex-1 text-left min-w-0">
              {category.name}
            </h3>
            <span className="bg-primary/10 text-primary text-[10px] sm:text-xs px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              {category.items.length}
            </span>
          </button>
        </div>
        <div className="flex gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 hover:bg-primary/10"
            onClick={onEdit}
          >
            <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>

      {/* Items List - Only shown when expanded */}
      {isExpanded && (
        <div className="divide-y divide-border">
          {category.items.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                {dietaryFilter !== 'any'
                  ? `No ${dietaryFilter === 'veg' ? 'Veg' : 'Non-Veg'} items`
                  : 'No items yet'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const totalItems = category.items.length; // Actually we want total items across all, but we will check it at the parent level before calling onAddItem
                  onAddItem();
                }}
              >
                <Plus className="w-3 h-3 mr-1.5" /> Add Item
              </Button>
            </div>
          ) : (
            <>
              {category.items.map((item: MenuItem) => (
                <MenuItemRowWithCustomizations
                  key={item.id}
                  item={item}
                  currency={currency}
                  onToggleAvailability={() => onToggleAvailability(item)}
                  onEdit={() => onEditItem(item)}
                  onDelete={() => onDeleteItem(item.id)}
                  onCustomize={() => onCustomizeItem(item)}
                  updateAvailabilityPending={updateAvailabilityPending}
                  restaurantId={restaurantId}
                  isDialogOpen={customizingItemId === item.id}
                />
              ))}
              <div
                className="p-2 sm:p-2.5 md:p-3 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer text-center text-xs sm:text-sm font-medium text-primary border-t border-dashed"
                onClick={onAddItem}
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 inline mr-1 sm:mr-2" /> Add Item
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function MenuPage() {
  const { restaurantId } = useAuth();
  const { planLimits, currentPlan } = useSubscription();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: menuData, isLoading } = useMenuCategories(restaurantId, restaurant?.slug ?? null);

  // Mutations
  const createCategory = useCreateCategory(restaurantId);
  const updateCategory = useUpdateCategory(restaurantId);
  const createMenuItem = useCreateMenuItem(restaurantId);
  const updateMenuItem = useUpdateMenuItem(restaurantId);
  const updateAvailability = useUpdateMenuItemAvailability(restaurantId);
  const deleteItem = useDeleteMenuItem(restaurantId);
  const deleteCategory = useDeleteCategory(restaurantId);

  // Local state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<'any' | 'veg' | 'non-veg'>('any');
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
    dietaryType: "" as "" | "Veg" | "Non-Veg"
  });

  // Menu suggestions search and infinite scroll
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { 
    data: suggestionsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useMenuSuggestions(debouncedSearchQuery);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Image crop states
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [extractionJobId, setExtractionJobId] = useState<string | null>(null);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [orderedCategoryIds, setOrderedCategoryIds] = useState<string[]>([]);

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const categoriesWithItems = useMemo(() => {
    if (!menuData) return [];
    const { categories, items } = menuData;

    const mappedCategories = categories
      .map((cat: MenuCategory) => {
        const categoryItems = items.filter((item: MenuItem) => item.categoryId === cat.id);

        let filteredItems = categoryItems;
        if (dietaryFilter === 'veg') {
          filteredItems = categoryItems.filter((item: MenuItem) =>
            item.dietaryTags?.some(tag => tag.toLowerCase() === 'veg')
          );
        } else if (dietaryFilter === 'non-veg') {
          filteredItems = categoryItems.filter((item: MenuItem) =>
            item.dietaryTags?.some(tag => tag.toLowerCase() === 'non-veg')
          );
        }

        return {
          ...cat,
          items: filteredItems,
        };
      })
      .sort((a, b) => {
        if (a.sortOrder === null && b.sortOrder === null) return 0;
        if (a.sortOrder === null) return 1;
        if (b.sortOrder === null) return -1;
        return a.sortOrder - b.sortOrder;
      });

    if (dietaryFilter === "veg" || dietaryFilter === "non-veg") {
      return mappedCategories.filter((cat) => cat.items.length > 0);
    }

    return mappedCategories;
  }, [menuData, dietaryFilter]);

  // Initialize ordered category IDs when data loads
  useEffect(() => {
    if (categoriesWithItems.length > 0 && orderedCategoryIds.length === 0) {
      setOrderedCategoryIds(categoriesWithItems.map(cat => cat.id));
    }
  }, [categoriesWithItems, orderedCategoryIds.length]);

  // Get categories in display order
  const orderedCategories = useMemo(() => {
    if (orderedCategoryIds.length === 0) return categoriesWithItems;

    return orderedCategoryIds
      .map(id => categoriesWithItems.find(cat => cat.id === id))
      .filter((cat): cat is MenuCategory & { items: MenuItem[] } => cat !== undefined);
  }, [orderedCategoryIds, categoriesWithItems]);

  const selectPrefilled = (item: MenuSuggestion) => {
    setNewItem({
      name: item.name,
      price: item.price.toString(),
      description: item.description || "",
      image: item.imageUrl || "",
      dietaryType: item.dietaryTags?.includes("Veg") ? "Veg" : item.dietaryTags?.includes("Non-Veg") ? "Non-Veg" : ""
    });
    toast.info("Item details prefilled!");
  };

  const handleImageUpload = (file: File, forEdit: boolean = false) => {
    const url = URL.createObjectURL(file);
    setTempImageUrl(url);
    setIsEditMode(forEdit);
    setIsCropDialogOpen(true);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setNewItem({ ...newItem, image: croppedImageUrl });
    setTempImageUrl(null);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    updateAvailability.mutate({
      itemId: item.id,
      isAvailable: !item.isAvailable
    });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    await createCategory.mutateAsync({ name: newCategoryName.trim() });
    setNewCategoryName("");
    setIsCategoryDialogOpen(false);
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !newCategoryName.trim()) return;

    await updateCategory.mutateAsync({
      categoryId: editingCategory.id,
      data: { name: newCategoryName.trim() }
    });
    setNewCategoryName("");
    setEditingCategory(null);
    setIsEditCategoryDialogOpen(false);
  };

  const handleOpenEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setIsEditCategoryDialogOpen(true);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !newItem.name || !newItem.price) return;

    await createMenuItem.mutateAsync({
      categoryId: selectedCategoryId,
      name: newItem.name,
      description: newItem.description || undefined,
      price: parseFloat(newItem.price),
      imageUrl: newItem.image || undefined,
      isAvailable: true,
      dietaryTags: newItem.dietaryType ? [newItem.dietaryType] : undefined,
    });

    setNewItem({ name: "", price: "", description: "", image: "", dietaryType: "" });
    setIsItemDialogOpen(false);
    setSelectedCategoryId(null);
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !newItem.name || !newItem.price) return;

    await updateMenuItem.mutateAsync({
      itemId: editingItem.id,
      data: {
        name: newItem.name,
        description: newItem.description || undefined,
        price: parseFloat(newItem.price),
        imageUrl: newItem.image || undefined,
        dietaryTags: newItem.dietaryType ? [newItem.dietaryType] : undefined,
      }
    });

    setNewItem({ name: "", price: "", description: "", image: "", dietaryType: "" });
    setEditingItem(null);
    setIsEditItemDialogOpen(false);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setSelectedCategoryId(item.categoryId);
    const dietaryType = item.dietaryTags?.find(tag => tag === "Veg" || tag === "Non-Veg") || "";
    setNewItem({
      name: item.name,
      price: item.price.toString(),
      description: item.description || "",
      image: item.imageUrl || "",
      dietaryType: dietaryType as "" | "Veg" | "Non-Veg"
    });
    setIsEditItemDialogOpen(true);
  };

  const checkAddItemLimit = (categoryId: string) => {
    const totalItems = menuData?.items?.length || 0;
    const canAddItem = planLimits.maxMenuItems === -1 || totalItems < planLimits.maxMenuItems;
    if (!canAddItem) {
      toast.error(`Menu item limit reached. The ${currentPlan} plan allows up to ${planLimits.maxMenuItems} items. Please upgrade to add more.`);
      return;
    }
    setSelectedCategoryId(categoryId);
    setIsItemDialogOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    deleteItem.mutate(itemId);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category and all its items?")) return;
    deleteCategory.mutate(categoryId);
  };

  const handleCustomizationClose = () => {
    setIsCustomizationOpen(false);
    setCustomizingItem(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedCategoryIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update sort order in the backend (silently, without individual toasts)
        updateCategoryOrder(newOrder);

        return newOrder;
      });
    }
  };

  const updateCategoryOrder = async (orderedIds: string[]) => {
    if (!restaurantId) return;

    try {
      // Update each category with its new sort order
      const updatePromises = orderedIds.map((categoryId, index) => {
        // Use the API directly to avoid multiple toast notifications
        return api.put(`/api/menu/${restaurantId}/categories/${categoryId}`, {
          sortOrder: index
        });
      });

      await Promise.all(updatePromises);

      // Show single success toast after all updates complete
      toast.success("Category order saved");
    } catch (error) {
      console.error("Failed to update category order:", error);
      toast.error("Failed to save category order");
    }
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const currency = restaurant?.currency || "₹";

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Image Crop Dialog */}
      {tempImageUrl && (
        <ImageCropDialog
          imageUrl={tempImageUrl}
          isOpen={isCropDialogOpen}
          onClose={() => {
            setIsCropDialogOpen(false);
            setTempImageUrl(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6 md:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold">Menu Builder</h2>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-0.5">
            Manage categories, dishes, and customizations
          </p>
        </div>

        {/* Action Buttons - Right aligned on desktop */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 flex-shrink-0">
          <MenuCardUploader
            restaurantId={restaurantId}
            onExtractionComplete={(jobId) => setExtractionJobId(jobId)}
          />

          <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
            setIsCategoryDialogOpen(open);
            if (!open) setNewCategoryName("");
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-lg shadow-primary/20 text-xs sm:text-sm h-8 sm:h-9">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg">Add New Category</DialogTitle>
                <DialogDescription className="text-sm">Create a new section for your menu.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCategory} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="category-name" className="text-sm">Category Name</Label>
                  <Input
                    id="category-name"
                    placeholder="e.g., Desserts, Beverages"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full text-sm" disabled={createCategory.isPending}>
                    {createCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Category
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={(open) => {
        setIsEditCategoryDialogOpen(open);
        if (!open) {
          setEditingCategory(null);
          setNewCategoryName("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Category</DialogTitle>
            <DialogDescription className="text-sm">Update the category name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name" className="text-sm">Category Name</Label>
              <Input
                id="edit-category-name"
                placeholder="Enter category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                className="text-sm"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full text-sm" disabled={updateCategory.isPending}>
                {updateCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dietary Filter Buttons - Responsive */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setDietaryFilter('any')}
          className={cn(
            "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
            dietaryFilter === 'any'
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          All Items
        </button>
        <button
          onClick={() => setDietaryFilter('veg')}
          className={cn(
            "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
            dietaryFilter === 'veg'
              ? "bg-green-500 text-white shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Veg Only
        </button>
        <button
          onClick={() => setDietaryFilter('non-veg')}
          className={cn(
            "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
            dietaryFilter === 'non-veg'
              ? "bg-red-500 text-white shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Non-Veg Only
        </button>
      </div>

      {/* Categories List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4 sm:space-y-6">
          {!menuData || menuData.categories.length === 0 ? (
            <div className="text-center py-12 sm:py-16 md:py-20 border-2 border-dashed rounded-xl">
              <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground/30" />
              <p className="text-sm sm:text-base md:text-lg font-medium text-muted-foreground">No menu categories yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-4">Start by adding your first category</p>
              <Button onClick={() => setIsCategoryDialogOpen(true)} size="sm" className="text-xs sm:text-sm">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" /> Add Category
              </Button>
            </div>
          ) : categoriesWithItems.length === 0 && dietaryFilter === 'any' ? (
            <div className="text-center py-12 sm:py-16 md:py-20 border-2 border-dashed rounded-xl">
              <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground/30" />
              <p className="text-sm sm:text-base md:text-lg font-medium text-muted-foreground">No items in any category</p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-4">Add items to your categories to get started</p>
            </div>
          ) : (
            <SortableContext
              items={orderedCategoryIds}
              strategy={verticalListSortingStrategy}
            >
              {orderedCategories.map((category) => (
                <SortableCategory
                  key={category.id}
                  category={category}
                  currency={currency}
                  isExpanded={expandedCategories.has(category.id)}
                  onToggleExpand={() => toggleCategoryExpand(category.id)}
                  onEdit={() => handleOpenEditCategory(category)}
                  onDelete={() => handleDeleteCategory(category.id)}
                  onAddItem={() => checkAddItemLimit(category.id)}
                  onToggleAvailability={handleToggleAvailability}
                  onEditItem={handleOpenEditItem}
                  onDeleteItem={handleDeleteItem}
                  onCustomizeItem={(item) => {
                    setCustomizingItem(item);
                    setIsCustomizationOpen(true);
                  }}
                  updateAvailabilityPending={updateAvailability.isPending}
                  restaurantId={restaurantId}
                  customizingItemId={customizingItem?.id ?? null}
                  dietaryFilter={dietaryFilter}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </DndContext>

      {/* Add Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
        setIsItemDialogOpen(open);
        if (!open) {
          setSelectedCategoryId(null);
          setNewItem({ name: "", price: "", description: "", image: "", dietaryType: "" });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Add New Item</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a new dish to {categoriesWithItems.find(c => c.id === selectedCategoryId)?.name || 'category'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 py-2 sm:py-4">
            {/* Suggestions Column */}
            <div className="space-y-3 sm:space-y-4 md:border-r md:pr-4 md:pr-6">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  placeholder="Search suggestions..."
                  className="pl-7 sm:pl-9 text-xs sm:text-sm h-8 sm:h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[150px] sm:h-[200px] md:h-[300px] pr-2 sm:pr-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1.5 sm:gap-2">
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" /> Suggestions
                  </p>
                  {suggestionsData?.pages.map((page, i) => (
                    <div key={i} className="space-y-1.5 sm:space-y-2">
                      {page.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectPrefilled(item)}
                          className="w-full flex items-center gap-1.5 sm:gap-2 md:gap-3 p-1.5 sm:p-2 rounded-md sm:rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all text-left"
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} loading="lazy" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md object-cover flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground"><ImageIcon className="w-4 h-4" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] sm:text-xs font-bold truncate">{item.name}</p>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{currency}{item.price}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                  {isFetchingNextPage && (
                    <div className="py-2 flex justify-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                  {hasNextPage && !isFetchingNextPage && (
                    <div ref={loadMoreRef} className="h-4" />
                  )}
                  {suggestionsData?.pages[0].items.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No suggestions found.</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Form Column */}
            <form onSubmit={handleAddItem} className="space-y-3 sm:space-y-4">
              <div className="grid gap-2 sm:gap-3 md:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="item-name" className="text-xs sm:text-sm">Item Name</Label>
                  <Input
                    id="item-name"
                    placeholder="e.g. Classic Margherita"
                    className="text-xs sm:text-sm h-8 sm:h-10"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="item-price" className="text-xs sm:text-sm">Price ({currency})</Label>
                    <Input
                      id="item-price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="text-xs sm:text-sm h-8 sm:h-10"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Image</Label>
                    {newItem.image ? (
                      <div className="relative group w-full h-8 sm:h-10 rounded-md border overflow-hidden">
                        <img src={newItem.image} className="w-full h-full object-cover" alt="" />
                        <button
                          type="button"
                          onClick={() => setNewItem({ ...newItem, image: "" })}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative h-8 sm:h-10 overflow-hidden">
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, false);
                            }
                          }}
                        />
                        <Button type="button" variant="outline" className="w-full gap-1.5 text-[10px] sm:text-xs h-full">
                          <Upload className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Upload
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="item-desc" className="text-xs sm:text-sm">Description</Label>
                  <Textarea
                    id="item-desc"
                    placeholder="Briefly describe the dish..."
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="h-16 sm:h-20 md:h-24 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Dietary Type</Label>
                  <RadioGroup
                    value={newItem.dietaryType}
                    onValueChange={(value) => setNewItem({ ...newItem, dietaryType: value as "" | "Veg" | "Non-Veg" })}
                    className="flex gap-3 sm:gap-4 md:gap-6"
                  >
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <RadioGroupItem value="Veg" id="add-veg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <Label htmlFor="add-veg" className="cursor-pointer font-normal text-xs sm:text-sm">Veg</Label>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <RadioGroupItem value="Non-Veg" id="add-non-veg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <Label htmlFor="add-non-veg" className="cursor-pointer font-normal text-xs sm:text-sm">Non-Veg</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full text-xs sm:text-sm h-8 sm:h-10" disabled={createMenuItem.isPending}>
                  {createMenuItem.isPending ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin mr-2" /> : null}
                  Add Item
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT ITEM DIALOG */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={(open) => {
        setIsEditItemDialogOpen(open);
        if (!open) {
          setEditingItem(null);
          setSelectedCategoryId(null);
          setNewItem({ name: "", price: "", description: "", image: "", dietaryType: "" });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit Menu Item</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Update the details of this item.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditItem} className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="grid gap-2 sm:gap-3 md:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="edit-item-name" className="text-xs sm:text-sm">Item Name</Label>
                <Input
                  id="edit-item-name"
                  placeholder="e.g. Classic Margherita"
                  className="text-xs sm:text-sm h-8 sm:h-10"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="edit-item-price" className="text-xs sm:text-sm">Price ({currency})</Label>
                  <Input
                    id="edit-item-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="text-xs sm:text-sm h-8 sm:h-10"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Image</Label>
                  {newItem.image ? (
                    <div className="relative group w-full h-8 sm:h-10 rounded-md border overflow-hidden">
                      <img src={newItem.image} className="w-full h-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => setNewItem({ ...newItem, image: "" })}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative h-8 sm:h-10 overflow-hidden">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, true);
                          }
                        }}
                      />
                      <Button type="button" variant="outline" className="w-full gap-1.5 text-[10px] sm:text-xs h-full">
                        <Upload className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Upload
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="edit-item-description" className="text-xs sm:text-sm">Description</Label>
                <Textarea
                  id="edit-item-description"
                  placeholder="Briefly describe the dish..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="h-16 sm:h-20 md:h-24 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Dietary Type</Label>
                <RadioGroup
                  value={newItem.dietaryType}
                  onValueChange={(value) => setNewItem({ ...newItem, dietaryType: value as "" | "Veg" | "Non-Veg" })}
                  className="flex gap-3 sm:gap-4 md:gap-6"
                >
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <RadioGroupItem value="Veg" id="edit-item-veg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <Label htmlFor="edit-item-veg" className="cursor-pointer font-normal text-xs sm:text-sm">Veg</Label>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <RadioGroupItem value="Non-Veg" id="edit-item-non-veg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <Label htmlFor="edit-item-non-veg" className="cursor-pointer font-normal text-xs sm:text-sm">Non-Veg</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full text-xs sm:text-sm h-8 sm:h-10" disabled={updateMenuItem.isPending}>
                {updateMenuItem.isPending ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin mr-2" /> : null}
                Update Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Menu Item Customization Dialog */}
      {customizingItem && (
        <MenuItemCustomization
          restaurantId={restaurantId ?? "" as string}
          menuItemId={customizingItem.id}
          menuItemName={customizingItem.name}
          basePrice={customizingItem.price}
          currency={currency}
          isOpen={isCustomizationOpen}
          onClose={handleCustomizationClose}
        />
      )}

      {/* AI Extraction Preview Dialog */}
      {extractionJobId && restaurantId && (
        <ExtractionPreview
          jobId={extractionJobId}
          restaurantId={restaurantId}
          restaurantSlug={restaurant?.slug ?? null}
          onConfirmed={() => {
            setExtractionJobId(null);
            window.location.reload();
          }}
          onCancel={() => setExtractionJobId(null)}
        />
      )}
    </DashboardLayout>
  );
}