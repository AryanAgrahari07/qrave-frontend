
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MOCK_MENU_CATEGORIES } from "@/lib/mockData";
import { Plus, GripVertical, Image as ImageIcon, Pencil, Trash2, X, Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MenuPage() {
  const [categories, setCategories] = useState(MOCK_MENU_CATEGORIES);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                    <DialogDescription>Add a new dish to the {category.name} category.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddItem} className="space-y-4 py-4">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="item-name">Item Name</Label>
                        <Input id="item-name" placeholder="e.g. Classic Margherita" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="item-price">Price ($)</Label>
                          <Input id="item-price" type="number" step="0.01" placeholder="0.00" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Image</Label>
                          <Button type="button" variant="outline" className="w-full gap-2">
                            <Upload className="w-4 h-4" /> Upload
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="item-desc">Description</Label>
                        <Textarea id="item-desc" placeholder="Briefly describe the dish..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full">Add to Menu</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
