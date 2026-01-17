
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MOCK_MENU_CATEGORIES } from "@/lib/mockData";
import { Plus, GripVertical, Image as ImageIcon, Pencil, Trash2, X, Upload, Search, Sparkles } from "lucide-react";
import { useState } from "react";
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

export default function MenuPage() {
  const [categories, setCategories] = useState(MOCK_MENU_CATEGORIES);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Prefilled options state
  const [searchQuery, setSearchQuery] = useState("");
  const PREFILLED_ITEMS = [
    { name: "Classic Margherita Pizza", description: "Fresh mozzarella, tomato sauce, and basil on a crispy crust.", price: 15.99, image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&q=80&w=300&h=300" },
    { name: "Caesar Salad", description: "Romaine lettuce, croutons, and parmesan with house-made dressing.", price: 12.50, image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=300&h=300" },
    { name: "Chicken Alfredo", description: "Creamy fettuccine with grilled chicken and garlic bread.", price: 18.99, image: "https://images.unsplash.com/photo-1645112481338-30145014976d?auto=format&fit=crop&q=80&w=300&h=300" },
    { name: "Beef Lasagna", description: "Layers of pasta, meat sauce, and melted cheese.", price: 16.50, image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&q=80&w=300&h=300" },
    { name: "Chocolate Lava Cake", description: "Warm chocolate cake with a gooey center and vanilla ice cream.", price: 8.99, image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=300&h=300" },
    { name: "Garlic Prawns", description: "Sizzling prawns in garlic butter with fresh herbs.", price: 21.00, image: "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&q=80&w=300&h=300" },
  ];

  const filteredPrefilled = PREFILLED_ITEMS.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    image: ""
  });

  const selectPrefilled = (item: typeof PREFILLED_ITEMS[0]) => {
    setNewItem({
      name: item.name,
      price: item.price.toString(),
      description: item.description,
      image: item.image
    });
    toast.info("Item details prefilled! You can now adjust the price.");
  };

  const toggleAvailability = (catId: string, itemId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          items: cat.items.map(item => {
            if (item.id === itemId) {
              const newState = !item.available;
              toast.success(`${item.name} is now ${newState ? 'available' : 'unavailable'}`);
              return { ...item, available: newState };
            }
            return item;
          })
        };
      }
      return cat;
    }));
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("New category added successfully");
    setIsCategoryDialogOpen(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("New item added to menu");
    setIsItemDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Menu Builder</h2>
          <p className="text-muted-foreground">Manage your categories and real-time dish availability.</p>
        </div>
        
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>Create a new section for your menu (e.g., Desserts, Beverages).</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCategory} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input id="category-name" placeholder="Enter category name..." required />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">Create Category</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category.id} className="bg-background border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                <h3 className="font-heading font-bold text-lg">{category.name}</h3>
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">{category.items.length} items</span>
              </div>
              <div className="flex gap-2">
                 <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
              </div>
            </div>
            
            <div className="divide-y divide-border">
              {category.items.map((item) => (
                <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-muted/10 transition-colors group">
                  <GripVertical className="w-5 h-5 text-muted-foreground/50 cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-border">
                    {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <p className="font-semibold truncate">{item.name}</p>
                      <p className="font-mono font-medium">${item.price}</p>
                    </div>
                    <div className="flex items-center justify-between">
                       <p className="text-sm text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                       <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">In Stock</span>
                          <Switch 
                            checked={item.available} 
                            onCheckedChange={() => toggleAvailability(category.id, item.id)}
                          />
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="h-8">Edit</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              
              <Dialog open={isItemDialogOpen && selectedCategoryId === category.id} onOpenChange={(open) => {
                setIsItemDialogOpen(open);
                if (!open) setSelectedCategoryId(null);
              }}>
                <DialogTrigger asChild>
                  <div 
                    className="p-3 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer text-center text-sm font-medium text-primary border-t border-dashed"
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <Plus className="w-4 h-4 inline mr-2" /> Add Item to {category.name}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                    <DialogDescription>Add a new dish to the {category.name} category.</DialogDescription>
                  </DialogHeader>
                  <div className="grid md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4 border-r pr-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search global menu..." 
                          className="pl-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" /> Suggestions
                          </p>
                          {filteredPrefilled.map((item, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => selectPrefilled(item)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all text-left"
                            >
                              <img src={item.image} className="w-12 h-12 rounded-md object-cover flex-shrink-0" alt="" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">${item.price}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <form onSubmit={handleAddItem} className="space-y-4">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="item-name">Item Name</Label>
                          <Input 
                            id="item-name" 
                            placeholder="e.g. Classic Margherita" 
                            value={newItem.name}
                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                            required 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="item-price">Price ($)</Label>
                            <Input 
                              id="item-price" 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              value={newItem.price}
                              onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Image</Label>
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
                                  onChange={() => {
                                    setNewItem({...newItem, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300&h=300"});
                                    toast.success("Image uploaded!");
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
                          <Label htmlFor="item-desc">Description</Label>
                          <Textarea 
                            id="item-desc" 
                            placeholder="Briefly describe the dish..." 
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                            className="h-24"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full">Add to Menu</Button>
                      </DialogFooter>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
