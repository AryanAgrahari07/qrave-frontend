
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
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Package, AlertTriangle, ArrowUpRight, TrendingDown, History, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MOCK_INVENTORY = [
  { id: "inv-1", name: "Wagyu Beef Patties", category: "Meat", stock: 15, unit: "kg", threshold: 5, lastOrdered: "2 days ago" },
  { id: "inv-2", name: "Brioche Buns", category: "Bakery", stock: 120, unit: "pcs", threshold: 40, lastOrdered: "1 day ago" },
  { id: "inv-3", name: "Truffle Oil", category: "Condiments", stock: 2, unit: "L", threshold: 1, lastOrdered: "1 week ago" },
  { id: "inv-4", name: "Russet Potatoes", category: "Vegetables", stock: 4, unit: "kg", threshold: 10, lastOrdered: "3 days ago" },
  { id: "inv-5", name: "Parmesan Cheese", category: "Dairy", stock: 8, unit: "kg", threshold: 3, lastOrdered: "5 days ago" },
];

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

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
              <AlertTriangle className="w-5 h-5 text-destructive" /> 02
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Items below threshold: Potatoes, Truffle Oil</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Total SKU's</CardDescription>
            <CardTitle className="text-2xl font-bold">48</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across 6 main categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Inventory Value</CardDescription>
            <CardTitle className="text-2xl font-bold">$12,450</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12% from last month
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
                {MOCK_INVENTORY.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-mono font-bold text-lg",
                          item.stock <= item.threshold ? "text-destructive" : "text-primary"
                        )}>
                          {item.stock}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {item.threshold} {item.unit}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <History className="w-3 h-3" /> {item.lastOrdered}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toast.success(`Order placed for ${item.name}`)}>
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
