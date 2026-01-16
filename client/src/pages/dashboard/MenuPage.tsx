
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_MENU_CATEGORIES } from "@/lib/mockData";
import { Plus, GripVertical, Image as ImageIcon, Pencil, Trash2 } from "lucide-react";

export default function MenuPage() {
  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Menu Builder</h2>
          <p className="text-muted-foreground">Manage your categories and dishes.</p>
        </div>
        <Button className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="space-y-8">
        {MOCK_MENU_CATEGORIES.map((category) => (
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
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="h-8">Edit</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer text-center text-sm font-medium text-primary border-t border-dashed">
                <Plus className="w-4 h-4 inline mr-2" /> Add Item to {category.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
