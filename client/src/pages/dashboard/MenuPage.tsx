import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Image as ImageIcon, Pencil, Trash2, X, Upload, Search, Sparkles, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
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
import { useRestaurant, useMenuCategories, useCreateCategory, useUpdateCategory, useCreateMenuItem, useUpdateMenuItem, useUpdateMenuItemAvailability, useDeleteMenuItem, useDeleteCategory } from "@/hooks/api";
import type { MenuCategory, MenuItem } from "@/types";

// Prefilled item suggestions
const PREFILLED_ITEMS = [
  { name: "Classic Margherita Pizza", description: "Fresh mozzarella, tomato sauce, and basil on a crispy crust.", price: 299, image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Caesar Salad", description: "Romaine lettuce, croutons, and parmesan with house-made dressing.", price: 199, image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Chicken Alfredo", description: "Creamy fettuccine with grilled chicken and garlic bread.", price: 349, image: "https://images.unsplash.com/photo-1645112481338-30145014976d?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Beef Lasagna", description: "Layers of pasta, meat sauce, and melted cheese.", price: 329, image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Chocolate Lava Cake", description: "Warm chocolate cake with a gooey center and vanilla ice cream.", price: 149, image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Garlic Prawns", description: "Sizzling prawns in garlic butter with fresh herbs.", price: 449, image: "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Butter Chicken", description: "Creamy tomato-based curry with tender chicken pieces.", price: 299, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Paneer Tikka", description: "Grilled cottage cheese marinated in spiced yogurt.", price: 249, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Masala Dosa", description: "Crispy rice crepe filled with spiced potato filling.", price: 149, image: "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&q=80&w=300&h=300" },
  { name: "Biryani", description: "Fragrant basmati rice layered with spiced meat.", price: 349, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=300&h=300" },
];

export default function MenuPage() {
  const { restaurantId } = useAuth();
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

  // Organize items by category and apply dietary filter
  const categoriesWithItems = useMemo(() => {
    if (!menuData) return [];
    const { categories, items } = menuData;
    
    // Filter items by dietary type if filter is active
    let filteredItems = items;
    if (dietaryFilter === 'veg') {
      filteredItems = items.filter((item: MenuItem) => 
        item.dietaryTags?.some(tag => tag.toLowerCase() === 'veg')
      );
    } else if (dietaryFilter === 'non-veg') {
      filteredItems = items.filter((item: MenuItem) => 
        item.dietaryTags?.some(tag => tag.toLowerCase() === 'non-veg')
      );
    }
    
    return categories
      .map((cat: MenuCategory) => ({
        ...cat,
        items: filteredItems.filter((item: MenuItem) => item.categoryId === cat.id),
      }))
      .filter((cat) => cat.items.length > 0); // Hide empty categories when filtering
  }, [menuData, dietaryFilter]);

  const filteredPrefilled = PREFILLED_ITEMS.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectPrefilled = (item: typeof PREFILLED_ITEMS[0]) => {
    setNewItem({
      name: item.name,
      price: item.price.toString(),
      description: item.description,
      image: item.image,
      dietaryType: "" as "" | "Veg" | "Non-Veg"
    });
    toast.info("Item details prefilled! You can now adjust the price.");
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

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    deleteItem.mutate(itemId);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category and all its items?")) return;
    deleteCategory.mutate(categoryId);
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold">Menu Builder</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your categories and real-time dish availability.</p>
        </div>
        
        <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
          setIsCategoryDialogOpen(open);
          if (!open) setNewCategoryName("");
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>Create a new section for your menu (e.g., Desserts, Beverages).</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCategory} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input 
                  id="category-name" 
                  placeholder="Enter category name..." 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required 
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={createCategory.isPending}>
                  {createCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Category
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={isEditCategoryDialogOpen} onOpenChange={(open) => {
          setIsEditCategoryDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            setNewCategoryName("");
          }
        }}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update the category name.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditCategory} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">Category Name</Label>
                <Input 
                  id="edit-category-name" 
                  placeholder="Enter category name..." 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required 
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={updateCategory.isPending}>
                  {updateCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update Category
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dietary Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setDietaryFilter('any')}
          className={cn(
            "px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex-1 sm:flex-none min-w-[80px]",
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
            "px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex-1 sm:flex-none min-w-[80px]",
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
            "px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex-1 sm:flex-none min-w-[80px]",
            dietaryFilter === 'non-veg'
              ? "bg-red-500 text-white shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Non-Veg Only
        </button>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {categoriesWithItems.length === 0 ? (
          <div className="text-center py-12 sm:py-20 border-2 border-dashed rounded-xl">
            <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-muted-foreground/30" />
            {dietaryFilter !== 'any' ? (
              <>
                <p className="text-base sm:text-lg font-medium text-muted-foreground">
                  No {dietaryFilter === 'veg' ? 'Veg' : 'Non-Veg'} items found
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 px-4">
                  Try selecting a different filter or add items with this dietary type
                </p>
                <Button onClick={() => setDietaryFilter('any')} variant="outline" size="sm">
                  Show All Items
                </Button>
              </>
            ) : (
              <>
                <p className="text-base sm:text-lg font-medium text-muted-foreground">No menu categories yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 px-4">Start by adding your first category</p>
                <Button onClick={() => setIsCategoryDialogOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Add Category
                </Button>
              </>
            )}
          </div>
        ) : (
          categoriesWithItems.map((category) => (
            <div key={category.id} className="bg-background border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-3 sm:p-4 border-b bg-muted/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground cursor-move flex-shrink-0" />
                  <h3 className="font-heading font-bold text-base sm:text-lg truncate">{category.name}</h3>
                  <span className="bg-primary/10 text-primary text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {category.items.length}
                  </span>
                </div>
                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/10"
                    onClick={() => handleOpenEditCategory(category)}
                  >
                    <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="divide-y divide-border">
                {category.items.map((item: MenuItem) => (
                  <div key={item.id} className="p-3 sm:p-4 flex items-start sm:items-center gap-2 sm:gap-4 hover:bg-muted/10 transition-colors group">
                    <GripVertical className="hidden sm:block w-5 h-5 text-muted-foreground/50 cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-border">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base truncate">{item.name}</p>
                          {item.dietaryTags?.map((tag, i) => {
                            const isVeg = tag.toLowerCase() === "veg";
                            const isNonVeg = tag.toLowerCase() === "non-veg";
                            return (
                              <Badge 
                                key={i}
                                className={cn(
                                  "text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4",
                                  isVeg && "bg-green-100 text-green-800 border-green-200",
                                  isNonVeg && "bg-red-100 text-red-800 border-red-200"
                                )}
                              >
                                {tag}
                              </Badge>
                            );
                          })}
                        </div>
                        <p className="font-mono font-medium text-sm sm:text-base flex-shrink-0">{currency}{item.price}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {item.description || "No description"}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground whitespace-nowrap">In Stock</span>
                          <Switch 
                            checked={item.isAvailable} 
                            onCheckedChange={() => handleToggleAvailability(item)}
                            disabled={updateAvailability.isPending}
                            className="scale-75 sm:scale-100"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex sm:hidden flex-col gap-1 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs px-2"
                        onClick={() => handleOpenEditItem(item)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8"
                        onClick={() => handleOpenEditItem(item)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Dialog open={isItemDialogOpen && selectedCategoryId === category.id} onOpenChange={(open) => {
                  setIsItemDialogOpen(open);
                  if (!open) {
                    setSelectedCategoryId(null);
                    setNewItem({ name: "", price: "", description: "", image: "", dietaryType: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <div 
                      className="p-2.5 sm:p-3 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer text-center text-xs sm:text-sm font-medium text-primary border-t border-dashed"
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-2" /> Add Item to {category.name}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Item</DialogTitle>
                      <DialogDescription>Add a new dish to the {category.name} category.</DialogDescription>
                    </DialogHeader>
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-6 py-4">
                      <div className="space-y-4 md:border-r md:pr-6">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search suggestions..." 
                            className="pl-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-[200px] sm:h-[300px] pr-2 sm:pr-4">
                          <div className="space-y-2">
                            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-primary" /> Suggestions
                            </p>
                            {filteredPrefilled.map((item, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => selectPrefilled(item)}
                                className="w-full flex items-center gap-2 sm:gap-3 p-2 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all text-left"
                              >
                                <img src={item.image} className="w-10 h-10 sm:w-12 sm:h-12 rounded-md object-cover flex-shrink-0" alt="" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{item.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{currency}{item.price}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="item-name" className="text-sm">Item Name</Label>
                            <Input 
                              id="item-name" 
                              placeholder="e.g. Classic Margherita" 
                              className="text-sm"
                              value={newItem.name}
                              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                              required 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="item-price" className="text-sm">Price ({currency})</Label>
                              <Input 
                                id="item-price" 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                className="text-sm"
                                value={newItem.price}
                                onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                                required 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Image</Label>
                              {newItem.image ? (
                                <div className="relative group w-full h-10 rounded-md border overflow-hidden">
                                  <img src={newItem.image} className="w-full h-full object-cover" alt="" />
                                  <button 
                                    type="button"
                                    onClick={() => setNewItem({...newItem, image: ""})}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              ) : (
                                <div className="relative h-10 overflow-hidden">
                                  <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const url = URL.createObjectURL(file);
                                        setNewItem({...newItem, image: url});
                                        toast.success("Image selected!");
                                      }
                                    }}
                                  />
                                  <Button type="button" variant="outline" className="w-full gap-2 text-xs h-full">
                                    <Upload className="w-3 h-3" /> Upload
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-item-desc" className="text-sm">Description</Label>
                            <Textarea 
                              id="edit-item-desc" 
                              placeholder="Briefly describe the dish..." 
                              value={newItem.description}
                              onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                              className="h-20 sm:h-24 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Dietary Type</Label>
                            <RadioGroup 
                              value={newItem.dietaryType} 
                              onValueChange={(value) => setNewItem({...newItem, dietaryType: value as "" | "Veg" | "Non-Veg"})}
                              className="flex gap-4 sm:gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Veg" id="edit-veg" />
                                <Label htmlFor="edit-veg" className="cursor-pointer font-normal text-sm">Veg</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Non-Veg" id="edit-non-veg" />
                                <Label htmlFor="edit-non-veg" className="cursor-pointer font-normal text-sm">Non-Veg</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="w-full" disabled={updateMenuItem.isPending}>
                            {updateMenuItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Update Item
                          </Button>
                        </DialogFooter>
                      </form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}