
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, Package, AlertTriangle, Plus, Loader2, RefreshCw, ArrowUpDown,
  ArrowUp, ArrowDown, Pencil, PackagePlus, SlidersHorizontal, Trash2,
  ChevronLeft, ChevronRight, PackageX, PackageCheck, TrendingDown, Bell,
  MinusCircle, Settings2, ChefHat,
} from "lucide-react";
import { useMemo, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  useInventory, useInventoryAlerts, useCreateInventoryItem, useUpdateInventoryItem,
  useRestockInventoryItem, useAdjustInventoryStock, useDeleteInventoryItem,
  useDecreaseInventoryStock, useInventoryToggle, useSetInventoryToggle,
} from "@/hooks/api";
import type { InventoryFilters } from "@/hooks/api";
import type { InventoryItem } from "@/types";
import { RecipeMappingDialog } from "@/components/inventory/RecipeMappingDialog";

const UNITS = ["kg", "g", "L", "mL", "pcs", "dozen", "box", "pack", "bottle", "can", "bag", "bunch", "slice", "cup", "tbsp", "tsp"];
const PAGE_SIZE = 15;

type SortField = InventoryFilters["sortBy"];
type SortDir = "asc" | "desc";

function getStockStatus(item: InventoryItem) {
  const stock = Number(item.currentStock);
  const reorder = Number(item.reorderLevel);
  if (stock <= 0) return "out";
  if (stock <= reorder) return "low";
  return "ok";
}

function StockBar({ item }: { item: InventoryItem }) {
  const stock = Number(item.currentStock);
  const reorder = Number(item.reorderLevel);
  const status = getStockStatus(item);
  // Use reorder * 2 as the "full" reference or at least the current stock
  const max = Math.max(reorder * 2, stock, 1);
  const pct = Math.min((stock / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            status === "out" ? "bg-destructive" : status === "low" ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { restaurantId } = useAuth();

  // Filters and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<SortField>("material_name");
  const [sortOrder, setSortOrder] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter, sortBy, sortOrder]);

  const filters: InventoryFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: statusFilter,
    sortBy,
    sortOrder,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }), [debouncedSearch, statusFilter, sortBy, sortOrder, page]);

  const { data, isLoading, refetch, isRefetching } = useInventory(restaurantId, filters);
  const { data: alerts } = useInventoryAlerts(restaurantId);
  const createItem = useCreateInventoryItem(restaurantId);
  const updateItem = useUpdateInventoryItem(restaurantId);
  const restockItem = useRestockInventoryItem(restaurantId);
  const adjustStock = useAdjustInventoryStock(restaurantId);
  const deleteItem = useDeleteInventoryItem(restaurantId);
  const decreaseStock = useDecreaseInventoryStock(restaurantId);
  const { data: isEnabled } = useInventoryToggle(restaurantId);
  const toggleMutation = useSetInventoryToggle(restaurantId);

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDecreaseOpen, setIsDecreaseOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({ materialName: "", unit: "kg", currentStock: "", reorderLevel: "" });
  const [restockQty, setRestockQty] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [decreaseQty, setDecreaseQty] = useState("");
  const [decreaseReason, setDecreaseReason] = useState("");

  // Alert banner dismissed
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  const resetForm = () => setFormData({ materialName: "", unit: "kg", currentStock: "", reorderLevel: "" });

  const handleAdd = async () => {
    if (!formData.materialName.trim()) return;
    await createItem.mutateAsync({
      materialName: formData.materialName.trim(),
      unit: formData.unit,
      currentStock: Number(formData.currentStock) || 0,
      reorderLevel: Number(formData.reorderLevel) || 0,
    });
    setIsAddOpen(false);
    resetForm();
  };

  const openEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      materialName: item.materialName,
      unit: item.unit,
      currentStock: String(item.currentStock),
      reorderLevel: String(item.reorderLevel),
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedItem || !formData.materialName.trim()) return;
    await updateItem.mutateAsync({
      itemId: selectedItem.id,
      data: {
        materialName: formData.materialName.trim(),
        unit: formData.unit,
        currentStock: formData.currentStock,
        reorderLevel: formData.reorderLevel,
      },
    });
    setIsEditOpen(false);
    setSelectedItem(null);
    resetForm();
  };

  const openRestock = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockQty("");
    setIsRestockOpen(true);
  };

  const handleRestock = async () => {
    if (!selectedItem || !Number(restockQty)) return;
    await restockItem.mutateAsync({ itemId: selectedItem.id, quantity: Number(restockQty) });
    setIsRestockOpen(false);
    setSelectedItem(null);
  };

  const openDecrease = (item: InventoryItem) => {
    setSelectedItem(item);
    setDecreaseQty("");
    setDecreaseReason("");
    setIsDecreaseOpen(true);
  };

  const handleDecrease = async () => {
    if (!selectedItem || !Number(decreaseQty)) return;
    await decreaseStock.mutateAsync({ itemId: selectedItem.id, quantity: Number(decreaseQty), reason: decreaseReason || undefined });
    setIsDecreaseOpen(false);
    setSelectedItem(null);
  };

  const openAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustQty(String(item.currentStock));
    setIsAdjustOpen(true);
  };

  const handleAdjust = async () => {
    if (!selectedItem) return;
    await adjustStock.mutateAsync({ itemId: selectedItem.id, newStock: Number(adjustQty) || 0 });
    setIsAdjustOpen(false);
    setSelectedItem(null);
  };

  const openDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    await deleteItem.mutateAsync(selectedItem.id);
    setIsDeleteOpen(false);
    setSelectedItem(null);
  };

  const handleSort = useCallback((field: SortField) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("asc");
      return field;
    });
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortOrder === "asc"
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const totalAlerts = (alerts?.lowStock ?? 0) + (alerts?.outOfStock ?? 0);
  const showAlertBanner = totalAlerts > 0 && !alertsDismissed;

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
      <div className="space-y-5 sm:space-y-6">
        {/* Alert Banner */}
        {showAlertBanner && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-3 sm:p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Stock Alert — {totalAlerts} item{totalAlerts !== 1 ? "s" : ""} need attention
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">
                {alerts?.outOfStock ? `${alerts.outOfStock} out of stock` : ""}
                {alerts?.outOfStock && alerts?.lowStock ? " · " : ""}
                {alerts?.lowStock ? `${alerts.lowStock} running low` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                onClick={() => { setStatusFilter("low_stock"); setAlertsDismissed(true); }}
              >
                View Items
              </Button>
              <button
                onClick={() => setAlertsDismissed(true)}
                className="text-amber-600/60 hover:text-amber-600 dark:text-amber-400/60 dark:hover:text-amber-400 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold">Inventory</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Track raw materials, stock levels, and supply alerts.</p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center justify-start sm:justify-end w-full sm:w-auto">
            <div className="flex items-center self-start sm:self-auto bg-muted/40 rounded-full px-3 py-1.5 border border-border shrink-0 mr-1 sm:mr-2">
              <Switch
                checked={isEnabled ?? false}
                onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                disabled={toggleMutation.isPending}
                id="inventory-toggle"
                className="scale-75 sm:scale-100"
              />
              <Label htmlFor="inventory-toggle" className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap cursor-pointer ml-2">
                {isEnabled ? "Tracking On" : "Tracking Off"}
              </Label>
            </div>

            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} className="shrink-0 h-9">
              <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={() => setIsRecipeOpen(true)} variant="outline" className="h-9 gap-1.5 shadow-sm border-primary/20 hover:bg-primary/5 text-primary shrink-0 flex-1 sm:flex-none justify-center">
              <ChefHat className="w-4 h-4" />
              <span className="truncate">Recipes</span>
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setIsAddOpen(true); }} className="h-9 gap-1.5 shadow-lg shadow-primary/20 flex-1 sm:flex-none justify-center">
              <Plus className="w-4 h-4" />
              <span className="truncate">Add Item</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card
            className={cn(
              "cursor-pointer shadow-sm hover:shadow-md transition-all",
              statusFilter === "all" && "ring-2 ring-primary/30"
            )}
            onClick={() => setStatusFilter("all")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
              <CardDescription className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-muted-foreground">
                Total Items
              </CardDescription>
              <PackageCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold font-heading leading-tight break-words">
                {alerts?.totalItems ?? 0}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 break-words">
                All tracked raw materials
              </p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "cursor-pointer shadow-sm hover:shadow-md transition-all",
              statusFilter === "low_stock" && "ring-2 ring-amber-500/40"
            )}
            onClick={() => setStatusFilter(statusFilter === "low_stock" ? "all" : "low_stock")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
              <CardDescription className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-muted-foreground">
                Low Stock
              </CardDescription>
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className={cn(
                "text-lg sm:text-2xl font-bold font-heading leading-tight break-words",
                alerts?.lowStock ? "text-amber-600 dark:text-amber-400" : ""
              )}>
                {alerts?.lowStock ?? 0}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 break-words">
                Below reorder threshold
              </p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "cursor-pointer shadow-sm hover:shadow-md transition-all",
              statusFilter === "out_of_stock" && "ring-2 ring-destructive/40"
            )}
            onClick={() => setStatusFilter(statusFilter === "out_of_stock" ? "all" : "out_of_stock")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
              <CardDescription className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-muted-foreground">
                Out of Stock
              </CardDescription>
              <PackageX className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className={cn(
                "text-lg sm:text-2xl font-bold font-heading leading-tight break-words",
                alerts?.outOfStock ? "text-destructive" : ""
              )}>
                {alerts?.outOfStock ?? 0}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 break-words">
                Completely depleted
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filters */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Stock Ledger
                {pagination && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({pagination.total} item{pagination.total !== 1 ? "s" : ""})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 sm:flex-initial sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    className="pl-9 h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                >
                  <option value="all">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-0 pb-0 sm:pb-0">
            {items.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 sm:py-16 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/60 flex items-center justify-center">
                  <Package className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-base font-medium text-muted-foreground">
                  {debouncedSearch || statusFilter !== "all" ? "No items match your filters" : "No inventory items yet"}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-5">
                  {debouncedSearch || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Add your first raw material to start tracking stock."}
                </p>
                {!debouncedSearch && statusFilter === "all" && (
                  <Button onClick={() => { resetForm(); setIsAddOpen(true); }} variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> Add First Item
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <div className="rounded-md border-t overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead
                            className="font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={() => handleSort("material_name")}
                          >
                            <span className="flex items-center">Item Name <SortIcon field="material_name" /></span>
                          </TableHead>
                          <TableHead
                            className="font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={() => handleSort("unit")}
                          >
                            <span className="flex items-center">Unit <SortIcon field="unit" /></span>
                          </TableHead>
                          <TableHead
                            className="font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={() => handleSort("current_stock")}
                          >
                            <span className="flex items-center">Current Stock <SortIcon field="current_stock" /></span>
                          </TableHead>
                          <TableHead className="font-semibold">Stock Level</TableHead>
                          <TableHead
                            className="font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={() => handleSort("reorder_level")}
                          >
                            <span className="flex items-center">Reorder At <SortIcon field="reorder_level" /></span>
                          </TableHead>
                          <TableHead
                            className="font-semibold cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={() => handleSort("updated_at")}
                          >
                            <span className="flex items-center">Last Updated <SortIcon field="updated_at" /></span>
                          </TableHead>
                          <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const status = getStockStatus(item);
                          return (
                            <TableRow key={item.id} className="hover:bg-muted/20 transition-colors group">
                              <TableCell className="font-semibold">{item.materialName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] font-medium">{item.unit}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "font-mono font-bold text-base",
                                  status === "out" ? "text-destructive" : status === "low" ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                                )}>
                                  {item.currentStock}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <StockBar item={item} />
                                  {status === "out" && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Empty</Badge>}
                                  {status === "low" && <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" variant="outline">Low</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {item.reorderLevel} {item.unit}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Restock" onClick={() => openRestock(item)}>
                                    <PackagePlus className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Decrease Stock" onClick={() => openDecrease(item)}>
                                    <MinusCircle className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Adjust Stock" onClick={() => openAdjust(item)}>
                                    <SlidersHorizontal className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(item)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => openDelete(item)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-border">
                  {items.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <div key={item.id} className="px-4 py-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{item.materialName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[9px]">{item.unit}</Badge>
                              {status === "out" && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Empty</Badge>}
                              {status === "low" && <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" variant="outline">Low</Badge>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn(
                              "font-mono font-bold text-lg",
                              status === "out" ? "text-destructive" : status === "low" ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                            )}>
                              {item.currentStock}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Reorder: {item.reorderLevel}</p>
                          </div>
                        </div>
                        <StockBar item={item} />
                        <div className="flex items-center justify-between gap-1 pt-1 w-full">
                          <Button variant="outline" size="sm" className="h-8 px-2.5 min-[380px]:px-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/30" onClick={() => openRestock(item)}>
                            <PackagePlus className="w-4 h-4 shrink-0" />
                            <span className="hidden min-[380px]:inline ml-1.5">Restock</span>
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 min-[380px]:px-3 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/30" onClick={() => openDecrease(item)}>
                            <MinusCircle className="w-4 h-4 shrink-0" />
                            <span className="hidden min-[380px]:inline ml-1.5">Use</span>
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 min-[380px]:px-3" onClick={() => openAdjust(item)}>
                            <SlidersHorizontal className="w-4 h-4 shrink-0" />
                            <span className="hidden min-[380px]:inline ml-1.5">Adjust</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => openDelete(item)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 px-4 sm:px-6 py-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Page {pagination.currentPage} of {pagination.totalPages}
                      <span className="hidden sm:inline"> · {pagination.total} items</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0 text-xs"
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={!pagination.hasMore}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Add Item Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Add Inventory Item
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a new raw material to track stock levels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Material Name *</Label>
              <Input
                placeholder="e.g. Chicken Breast, Basmati Rice"
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Unit *</Label>
              <select
                className="flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Initial Stock</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Reorder Level</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  className="h-9 sm:h-10 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Alert when stock drops to this level</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto h-9 text-sm">Cancel</Button>
            <Button onClick={handleAdd} disabled={createItem.isPending || !formData.materialName.trim()} className="w-full sm:w-auto h-9 text-sm">
              {createItem.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Item Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Material Name *</Label>
              <Input
                value={formData.materialName}
                onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Unit</Label>
              <select
                className="flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Current Stock</Label>
                <Input
                  type="number" min="0" step="any"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Reorder Level</Label>
                <Input
                  type="number" min="0" step="any"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto h-9 text-sm">Cancel</Button>
            <Button onClick={handleEdit} disabled={updateItem.isPending || !formData.materialName.trim()} className="w-full sm:w-auto h-9 text-sm">
              {updateItem.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restock Dialog ── */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="max-w-sm w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-emerald-600" /> Restock
            </DialogTitle>
            <DialogDescription>
              Add stock to <span className="font-semibold">{selectedItem?.materialName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">Current Stock</span>
              <span className="font-mono font-bold">{selectedItem?.currentStock} {selectedItem?.unit}</span>
            </div>
            <div className="space-y-2">
              <Label>Quantity to Add *</Label>
              <Input
                type="number" min="0.001" step="any"
                placeholder="Enter quantity"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="h-10"
                autoFocus
              />
            </div>
            {restockQty && Number(restockQty) > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-700 dark:text-emerald-300">New Total</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {(Number(selectedItem?.currentStock || 0) + Number(restockQty)).toFixed(2)} {selectedItem?.unit}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsRestockOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleRestock} disabled={restockItem.isPending || !Number(restockQty)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
              {restockItem.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Restock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Stock Dialog ── */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="max-w-sm w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" /> Adjust Stock
            </DialogTitle>
            <DialogDescription>
              Set exact stock for <span className="font-semibold">{selectedItem?.materialName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">Current Stock</span>
              <span className="font-mono font-bold">{selectedItem?.currentStock} {selectedItem?.unit}</span>
            </div>
            <div className="space-y-2">
              <Label>New Stock Quantity *</Label>
              <Input
                type="number" min="0" step="any"
                placeholder="Enter new stock level"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="h-10"
                autoFocus
              />
            </div>
            {adjustQty !== String(selectedItem?.currentStock) && (
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                Number(adjustQty) > Number(selectedItem?.currentStock || 0)
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-amber-500/10 border-amber-500/20"
              )}>
                <span className="text-xs text-muted-foreground">Change</span>
                <span className={cn(
                  "font-mono font-bold text-sm",
                  Number(adjustQty) > Number(selectedItem?.currentStock || 0) ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {Number(adjustQty) > Number(selectedItem?.currentStock || 0) ? "+" : ""}
                  {(Number(adjustQty) - Number(selectedItem?.currentStock || 0)).toFixed(2)} {selectedItem?.unit}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjustStock.isPending} className="w-full sm:w-auto">
              {adjustStock.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecipeMappingDialog
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
      />

      {/* ── Decrease Stock Dialog ── */}
      <Dialog open={isDecreaseOpen} onOpenChange={setIsDecreaseOpen}>
        <DialogContent className="max-w-sm w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-amber-600" /> Decrease Stock
            </DialogTitle>
            <DialogDescription>
              Use stock from <span className="font-semibold">{selectedItem?.materialName}</span> for manual entries, wastage, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">Current Stock</span>
              <span className="font-mono font-bold">{selectedItem?.currentStock} {selectedItem?.unit}</span>
            </div>
            <div className="space-y-2">
              <Label>Quantity to Decrease *</Label>
              <Input
                type="number" min="0.001" step="any"
                placeholder="Enter quantity"
                value={decreaseQty}
                onChange={(e) => setDecreaseQty(e.target.value)}
                className="h-10"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input
                placeholder="e.g., Wastage, Staff meal"
                value={decreaseReason}
                onChange={(e) => setDecreaseReason(e.target.value)}
                className="h-10"
              />
            </div>
            {decreaseQty && Number(decreaseQty) > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs text-amber-700 dark:text-amber-300">New Total</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                  {Math.max(Number(selectedItem?.currentStock || 0) - Number(decreaseQty), 0).toFixed(2)} {selectedItem?.unit}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDecreaseOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleDecrease} disabled={decreaseStock.isPending || !Number(decreaseQty)} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white">
              {decreaseStock.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Decrease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-full p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{selectedItem?.materialName}</span> from your inventory?
              This action can be undone by contacting support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
