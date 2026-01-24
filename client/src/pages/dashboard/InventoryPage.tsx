
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Package, AlertTriangle, TrendingDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useInventory } from "@/hooks/api";
import type { InventoryItem } from "@/types";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
   const { restaurantId } = useAuth();
   const { data: items = [] } = useInventory(restaurantId);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (items || []).filter((item) =>
      item.materialName.toLowerCase().includes(term),
    );
  }, [items, searchTerm]);

  const lowStockCount = useMemo(
    () =>
      filteredItems.filter((item) => Number(item.currentStock) <= Number(item.reorderLevel)).length,
    [filteredItems],
  );

  const totalSkus = filteredItems.length;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">Track raw materials, stock levels, and supply alerts.</p>
        </div>
        <Button className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Stock Item
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Low Stock Alerts</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> {lowStockCount.toString().padStart(2, "0")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Items currently at or below reorder level.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Total SKU's</CardDescription>
            <CardTitle className="text-2xl font-bold">{totalSkus}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tracked raw materials in your restaurant.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Inventory Value</CardDescription>
            <CardTitle className="text-2xl font-bold">—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground text-green-600 flex items-center gap-1">
              Real-time inventory valuation coming soon.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Stock Ledger
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search raw materials..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Item Name</TableHead>
                  <TableHead className="font-bold">Category</TableHead>
                  <TableHead className="font-bold">Current Stock</TableHead>
                  <TableHead className="font-bold">Threshold</TableHead>
                  <TableHead className="font-bold">Last Restocked</TableHead>
                  <TableHead className="font-bold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: InventoryItem) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold">{item.materialName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {item.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-mono font-bold text-lg",
                            Number(item.currentStock) <= Number(item.reorderLevel) ? "text-destructive" : "text-primary",
                          )}
                        >
                          {item.currentStock}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {item.reorderLevel} {item.unit}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.success(`Restock workflow for ${item.materialName} coming soon`)}
                      >
                        Restock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
