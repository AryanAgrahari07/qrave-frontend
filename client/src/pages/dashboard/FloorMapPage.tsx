import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Utensils, Plus, Loader2, RefreshCw, Edit2, Trash2, User, Receipt, DollarSign, CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { 
  useTables, 
  useUpdateTableStatus, 
  useCreateTable, 
  useDeleteTable, 
  useRestaurant, 
  useStaff, 
  useAssignWaiterToTable,
  useMenuCategories,
  useCreateOrder,
  useOrders,
  useUpdatePaymentStatus,
  useCloseOrder,
} from "@/hooks/api";
import type { Table, TableStatus, MenuItem, Order, PaymentMethod } from "@/types";
import { MobilePOS } from "@/components/pos/mobilepos";
import { DesktopPOS } from "@/components/pos/desktoppos";
import { getCustomizationSummary } from "@/components/menu/Customizedorderitemdisplay";

export default function FloorMapPage() {
  const { restaurantId, user } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: tables, isLoading, refetch } = useTables(restaurantId);
  const { data: staff } = useStaff(restaurantId);
  const { data: menuData } = useMenuCategories(restaurantId, restaurant?.slug ?? null);
  const { data: ordersData } = useOrders(restaurantId, { limit: 30, offset: 0 });
  const orders = ordersData?.orders ?? [];
  
  const assignWaiter = useAssignWaiterToTable(restaurantId);
  const updateStatus = useUpdateTableStatus(restaurantId);
  const createTable = useCreateTable(restaurantId);
  const deleteTable = useDeleteTable(restaurantId);
  const createOrder = useCreateOrder(restaurantId);
  const updatePaymentStatus = useUpdatePaymentStatus(restaurantId);
  const closeOrder = useCloseOrder(restaurantId);
  
  // Filter waiters only and check if user is admin/owner
  const waiters = staff?.filter((s) => s.role === "WAITER" && s.isActive) || [];
  const isAdmin = user?.role === "owner" || user?.role === "admin" || user?.role === "platform_admin";

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTable, setNewTable] = useState({
    tableNumber: "",
    capacity: 4,
    floorSection: "",
  });

  // POS States
  const [isPOSOpen, setIsPOSOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);
  const [manualCart, setManualCart] = useState<
    {
      id: string;
      name: string;
      price: number;
      quantity: number;
      variantId?: string;
      modifierIds?: string[];
      isVeg?: boolean;
    }[]
  >([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "due">("due");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePOS, setShowMobilePOS] = useState(false);

  // Bill Dialog States
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);

  const currency = restaurant?.currency || "₹";
  const gstRate = parseFloat(restaurant?.taxRateGst || "5") / 100;

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Set initial active category
  useMemo(() => {
    if (!activeCategory && menuData?.categories && menuData.categories.length > 0) {
      setActiveCategory(menuData.categories[0].id);
    }
  }, [menuData, activeCategory]);

  // Get active order for a table (used to derive OCCUPIED state instantly)
  const getTableOrder = (tableId: string) => {
    return orders.find(
      (o: Order) =>
        o.tableId === tableId &&
        // treat as active unless explicitly closed/served+paid or cancelled
        !(o.paymentStatus === "PAID" && o.status === "SERVED" && o.isClosed) &&
        o.status !== "CANCELLED",
    );
  };

  const getEffectiveTableStatus = (table: Table): TableStatus => {
    const activeOrder = getTableOrder(table.id);
    if (activeOrder) return "OCCUPIED";
    return table.currentStatus;
  };

  const getEffectiveWaiterName = (table: Table): string | null => {
    // Show ONLY explicitly assigned waiter for the table.
    // Important: when admin switches to "No waiter", we must not fall back to order.placedByStaff,
    // otherwise it looks like unassign didn't work.
    if (table.assignedWaiter?.fullName) return table.assignedWaiter.fullName;

    // If we only have the ID (common with optimistic updates), resolve it from staff list.
    if (table.assignedWaiterId && staff) {
      const waiter = staff.find((s) => s.id === table.assignedWaiterId);
      if (waiter?.fullName) return waiter.fullName;
    }

    return null;
  };

  const toggleTableStatus = (table: Table) => {
    // Disable status toggle if table has an active order
    const tableOrder = getTableOrder(table.id);
    if (tableOrder) {
      toast.info("Cannot change status while order is active");
      return;
    }
    
    const current = getEffectiveTableStatus(table);
    const newStatus: TableStatus = current === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE";
    updateStatus.mutate({ tableId: table.id, status: newStatus });
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.tableNumber.trim()) return;
    
    const slug = restaurant?.slug || "restaurant";
    const qrCodePayload = `${window.location.origin}/r/${slug}?table=${newTable.tableNumber}`;
    
    await createTable.mutateAsync({
      tableNumber: newTable.tableNumber.trim(),
      capacity: newTable.capacity,
      floorSection: newTable.floorSection.trim() || undefined,
      qrCodePayload,
    });
    
    setNewTable({ tableNumber: "", capacity: 4, floorSection: "" });
    setIsAddDialogOpen(false);
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    deleteTable.mutate(tableId);
  };

  const handleAssignWaiter = async (tableId: string, staffId: string | null) => {
    try {
      await assignWaiter.mutateAsync({ tableId, staffId });
    } catch {
      // Error handled by mutation
    }
  };

  // POS Handlers
  const handlePlaceOrder = (table: Table) => {
    setSelectedTableForOrder(table);
    setManualCart([]);
    setPaymentMethod("due");
    
    if (isMobile) {
      setShowMobilePOS(true);
    } else {
      setIsPOSOpen(true);
    }
  };

  const addToManualCart = (item: MenuItem) => {
    const hasCustomizationOptions =
      (item.variants && item.variants.length > 0) ||
      (item.modifierGroups && item.modifierGroups.length > 0);

    if (hasCustomizationOptions) {
      setCustomizingItem(item);
    } else {
      setManualCart((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        const isVeg = item.dietaryTags?.some((tag) => tag.toLowerCase() === "veg");
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            isVeg,
          },
        ];
      });
    }
  };

  const removeFromManualCart = (itemId: string) => {
    setManualCart((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) return prev;
      
      if (item.quantity === 1) {
        return prev.filter((i) => i.id !== itemId);
      }
      return prev.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    });
  };

  const incrementManualCart = (itemId: string) => {
    setManualCart((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    );
  };

  const handleAddCustomizedToCart = (selection: {
    menuItemId: string;
    quantity: number;
    variantId?: string;
    modifierIds?: string[];
  }) => {
    if (!customizingItem) return;

    let price = parseFloat(customizingItem.price as any);

    if (selection.variantId) {
      const variant = customizingItem.variants?.find(
        (v) => v.id === selection.variantId,
      );
      if (variant) price = parseFloat(variant.price as any);
    }

    if (selection.modifierIds) {
      customizingItem.modifierGroups?.forEach((group) => {
        group.modifiers?.forEach((mod) => {
          if (selection.modifierIds!.includes(mod.id)) {
            price += parseFloat(mod.price as any);
          }
        });
      });
    }

    const isVeg = customizingItem.dietaryTags?.some((tag) => tag.toLowerCase() === "veg");

    const cartItem = {
      id: customizingItem.id,
      name: customizingItem.name,
      price,
      quantity: selection.quantity,
      variantId: selection.variantId,
      modifierIds: selection.modifierIds,
      isVeg,
    };

    setManualCart((prev) => [...prev, cartItem]);
    setCustomizingItem(null);
  };

  const handleSave = () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
    toast.success("Order saved!");
  };

  const handleSaveAndPrint = () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
    toast.success("Order saved and sent to printer!");
  };

  const handleSendToKitchen = async () => {
    if (manualCart.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    if (!selectedTableForOrder) {
      toast.error("No table selected");
      return;
    }

    try {
      const paymentStatusMap = {
        "cash": "PAID",
        "card": "PAID", 
        "upi": "PAID",
        "due": "DUE",
      };

      await createOrder.mutateAsync({
        tableId: selectedTableForOrder.id,
        orderType: "DINE_IN",
        items: manualCart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          variantId: item.variantId,
          modifierIds: item.modifierIds,
        })),
        assignedWaiterId: selectedTableForOrder.assignedWaiterId || undefined,
        paymentMethod: paymentMethod.toUpperCase() as "CASH" | "CARD" | "UPI" | "DUE",
        paymentStatus: paymentStatusMap[paymentMethod] as "PAID" | "DUE",
      });

      toast.success(
        `Order ${paymentMethod !== 'due' ? 'placed and paid' : 'sent to kitchen'}! Table ${selectedTableForOrder.tableNumber} - ${manualCart.length} items`,
      );

      setManualCart([]);
      setPaymentMethod("due");
      setIsPOSOpen(false);
      setShowMobilePOS(false);
      setSelectedTableForOrder(null);
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClosePOS = () => {
    setIsPOSOpen(false);
    setShowMobilePOS(false);
    setManualCart([]);
    setSelectedTableForOrder(null);
    setSearchQuery("");
    setIsSearchOpen(false);
    setActiveCategory(menuData?.categories?.[0]?.id || "");
  };

  const handleViewBill = (order: Order) => {
    setSelectedOrderForBill(order);
    setIsBillDialogOpen(true);
  };

  const handlePayment = async (order: Order, method: PaymentMethod) => {
    try {
      const totalAmount = parseFloat(order.totalAmount);
      const paid_amount = parseFloat(order.paid_amount || "0");
      const outstandingAmount = totalAmount - paid_amount;

      const updatedOrder = await updatePaymentStatus.mutateAsync({
        orderId: order.id,
        paymentStatus: "PAID",
        paymentMethod: method,
      });

      setSelectedOrderForBill(updatedOrder);

      toast.success(
        order.paymentStatus === "PARTIALLY_PAID"
          ? `Outstanding amount of ${currency}${outstandingAmount.toFixed(2)} paid via ${method}`
          : `Payment of ${currency}${totalAmount.toFixed(2)} received via ${method}`
      );

      refetch();
      
      setTimeout(() => {
        setIsBillDialogOpen(false);
        setSelectedOrderForBill(null);
      }, 1500);
      
    } catch (error: any) {
      console.error("❌ Payment error:", error);
      toast.error(error.message || "Failed to process payment");
    }
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-white border-green-200 hover:border-green-400 text-green-600";
      case "OCCUPIED":
        return "bg-red-50/30 border-red-200 text-red-400";
      case "RESERVED":
        return "bg-yellow-50/30 border-yellow-200 text-yellow-600";
      case "BLOCKED":
        return "bg-gray-50 border-gray-300 text-gray-500";
      default:
        return "bg-white border-gray-200";
    }
  };

  const getBadgeVariant = (status: TableStatus) => {
    switch (status) {
      case "AVAILABLE":
        return "default";
      case "OCCUPIED":
        return "destructive";
      case "RESERVED":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPaymentStatusColor = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case "PAID":
        return "bg-green-100 text-green-700 border border-green-200";
      case "PARTIALLY_PAID":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      case "DUE":
      default:
        return "bg-red-100 text-red-600 border border-red-200";
    }
  };

  // Group tables by floor section
  const tablesBySection = tables?.reduce((acc: Record<string, Table[]>, table: Table) => {
    const section = table.floorSection || "Main Floor";
    if (!acc[section]) acc[section] = [];
    acc[section].push(table);
    return acc;
  }, {} as Record<string, Table[]>) || {};

  // Mobile floor selection (section)
  const sectionKeys = useMemo(() => Object.keys(tablesBySection), [tablesBySection]);
  const [selectedSection, setSelectedSection] = useState<string>("");

  useEffect(() => {
    if (!selectedSection && sectionKeys.length > 0) {
      setSelectedSection(sectionKeys[0]);
    }
  }, [sectionKeys, selectedSection]);

  // Count stats (derive occupancy from active orders so it updates instantly)
  const stats = {
    total: tables?.length || 0,
    available:
      tables?.filter((t: Table) => getEffectiveTableStatus(t) === "AVAILABLE").length || 0,
    occupied:
      tables?.filter((t: Table) => getEffectiveTableStatus(t) === "OCCUPIED").length || 0,
    reserved:
      tables?.filter((t: Table) => getEffectiveTableStatus(t) === "RESERVED").length || 0,
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Render mobile POS overlay when active
  if (showMobilePOS && isMobile) {
    return (
      <MobilePOS
        categories={menuData?.categories || []}
        menuItems={menuData?.items || []}
        activeCategory={activeCategory}
        orderItems={Object.fromEntries(
          manualCart.map((item) => [item.id, item.quantity])
        )}
        tableNumber={selectedTableForOrder?.id || ""}
        waiterName={selectedTableForOrder?.assignedWaiterId || null}
        diningType="dine-in"
        paymentMethod={paymentMethod}
        onCategoryChange={setActiveCategory}
        onAddItem={addToManualCart}
        onRemoveItem={removeFromManualCart}
        onIncrement={incrementManualCart}
        onTableChange={() => {}} // Table is pre-selected
        onWaiterChange={() => {}} // Waiter is pre-assigned
        onDiningTypeChange={() => {}} // Always dine-in
        onPaymentMethodChange={setPaymentMethod}
        onSendToKitchen={handleSendToKitchen}
        onSave={handleSave}
        onSaveAndPrint={handleSaveAndPrint}
        onClose={handleClosePOS}
        currency={currency}
        gstRate={gstRate}
        tables={tables}
        staff={staff}
        isLoading={createOrder.isPending}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
        <div className="hidden sm:block">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold">Floor Map</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor and manage table occupancy in real-time.</p>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {isMobile && sectionKeys.length > 1 ? (
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select floor" />
              </SelectTrigger>
              <SelectContent>
                {sectionKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={() => refetch()} className="shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20 flex-1 sm:flex-none">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Table</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">Add New Table</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">Create a new table for your restaurant floor.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTable} className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="table-number" className="text-xs sm:text-sm">Table Number *</Label>
                    <Input 
                      id="table-number" 
                      placeholder="e.g., 1, A1, VIP1" 
                      value={newTable.tableNumber}
                      onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity" className="text-xs sm:text-sm">Capacity *</Label>
                    <Input 
                      id="capacity" 
                      type="number" 
                      min="1" 
                      max="20"
                      value={newTable.capacity}
                      onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 1 })}
                      required
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor-section" className="text-xs sm:text-sm">Floor Section</Label>
                  <Input 
                    id="floor-section" 
                    placeholder="e.g., Main Floor, Patio, VIP Area"
                    value={newTable.floorSection}
                    onChange={(e) => setNewTable({ ...newTable, floorSection: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full h-10 sm:h-11" disabled={createTable.isPending}>
                    {createTable.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Table
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
        <Card className="p-2.5 sm:p-4">
          <p className="text-[11px] sm:text-sm text-muted-foreground">Total Tables</p>
          <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-2.5 sm:p-4 border-l-4 border-l-green-500">
          <p className="text-[11px] sm:text-sm text-muted-foreground">Available</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.available}</p>
        </Card>
        <Card className="p-2.5 sm:p-4 border-l-4 border-l-red-500">
          <p className="text-[11px] sm:text-sm text-muted-foreground">Occupied</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.occupied}</p>
        </Card>
        <Card className="p-2.5 sm:p-4 border-l-4 border-l-yellow-500">
          <p className="text-[11px] sm:text-sm text-muted-foreground">Reserved</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.reserved}</p>
        </Card>
      </div>

      {tables && tables.length > 0 ? (
        <div className="space-y-6 sm:space-y-8">
          {(isMobile
            ? Object.entries(tablesBySection).filter(([section]) => !selectedSection || section === selectedSection)
            : Object.entries(tablesBySection)
          ).map(([section, sectionTables]) => (
            <Card key={section} className="border-none shadow-none bg-transparent">
              <CardHeader className="px-0 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-heading font-bold text-lg sm:text-xl flex items-center gap-2">
                    <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> {section}
                    <Badge variant="outline" className="ml-2 text-xs">{sectionTables.length} tables</Badge>
                  </h3>
                  <div className="flex gap-3 sm:gap-4 text-[10px] sm:text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" /> 
                      <span className="hidden sm:inline">Available</span>
                      <span className="sm:hidden">Avail</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400" /> 
                      <span className="hidden sm:inline">Occupied</span>
                      <span className="sm:hidden">Occup</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" /> 
                      <span className="hidden sm:inline">Reserved</span>
                      <span className="sm:hidden">Resv</span>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 py-4">
                  {sectionTables.map((table: Table) => {
                    const tableOrder = getTableOrder(table.id);
                    const hasBill = !!tableOrder;
                    const billAmount = hasBill ? parseFloat(tableOrder.totalAmount) : 0;
                    const paymentStatus = tableOrder?.paymentStatus;

                    const effectiveStatus = getEffectiveTableStatus(table);
                    const effectiveWaiterName = getEffectiveWaiterName(table);

                    return (
                      <div key={table.id} className="relative group pb-6">
                        {/* Assign Waiter Icon - Top Center, half out (Admin Only) */}
                        {isAdmin && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={table.assignedWaiterId || "none"}
                              onValueChange={(value) => handleAssignWaiter(table.id, value === "none" ? null : value)}
                              disabled={assignWaiter.isPending}
                            >
                              <SelectTrigger className="h-5 w-5 rounded-full bg-white border-2 border-gray-200 hover:border-primary hover:shadow-md transition-all p-0 [&>svg]:hidden">
                                <SelectValue>
                                  <User className="w-4.5 h-.5 text-gray-500 mx-auto" />
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs">
                                  <span className="flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" />
                                    No waiter
                                  </span>
                                </SelectItem>
                                {waiters.map((waiter) => (
                                  <SelectItem key={waiter.id} value={waiter.id} className="text-xs">
                                    <span className="flex items-center gap-2">
                                      <User className="w-3.5 h-3.5" />
                                      {waiter.fullName}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Delete button - Top Right, half out */}
                        <button
                          className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-white border-2 border-red-400 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all text-red-500 hover:bg-red-50 hover:border-red-500 z-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTable(table.id);
                          }}
                          title="Delete Table"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Main Table Card */}
                        <button
                          onClick={() => toggleTableStatus(table)}
                          disabled={updateStatus.isPending || hasBill}
                          className={cn(
                            "w-full aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all shadow-sm relative pt-4",
                            getStatusColor(effectiveStatus),
                            hasBill ? "cursor-default" : "hover:shadow-md active:scale-[0.98]"
                          )}
                        >
                          {/* Table Number */}
                          <span className={cn(
                            "text-xl font-bold",
                            effectiveStatus === "AVAILABLE" ? "text-green-600" : "text-red-400"
                          )}>
                            {table.tableNumber}
                          </span>
                          
                          {/* Capacity */}
                          <span className={cn(
                            "text-xs uppercase tracking-wider font-medium",
                            effectiveStatus === "AVAILABLE" ? "text-green-500/70" : "text-red-300"
                          )}>
                            {table.capacity} SEATS
                          </span>

                          {/* Waiter */}
                          {effectiveWaiterName && (
                            <span
                              className={cn(
                                "max-w-[90%] text-[10px] sm:text-xs font-semibold truncate",
                                effectiveStatus === "AVAILABLE" ? "text-green-600/80" : "text-red-200"
                              )}
                              title={effectiveWaiterName}
                            >
                              {effectiveWaiterName}
                            </span>
                          )}
                          
                          {/* Bill Info */}
                          {hasBill && (
                            <div className="w-full mt-2 space-y-2 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <Receipt className="w-4 h-4 text-red-400" />
                                <span className="text-base font-bold text-red-400">
                                  {currency}{billAmount.toFixed(0)}
                                </span>
                              </div>
                              <Badge 
                                className={cn(
                                  "text-xs px-3 py-1 font-semibold rounded-full",
                                  getPaymentStatusColor(paymentStatus)
                                )}
                              >
                                {paymentStatus === "PARTIALLY_PAID" ? "PARTIAL" : paymentStatus || "DUE"}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Waiter Info - Inside card at bottom */}
                          {effectiveWaiterName && !hasBill && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                              <span className="text-[10px] font-semibold text-primary px-3 py-1 bg-primary/10 rounded-full whitespace-nowrap">
                                👤 {effectiveWaiterName}
                              </span>
                            </div>
                          )}
                        </button>
                        
                        {/* Bottom Icons - Half in, half out */}
                        <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 flex gap-4 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaceOrder(table);
                            }}
                            className="h-9 w-9 rounded-full bg-white border-2 border-red-400 flex items-center justify-center shadow-md hover:bg-red-50 hover:border-red-500 hover:shadow-lg transition-all"
                            title="Add Order"
                          >
                            <Plus className="w-4.5 h-4.5 text-red-500" />
                          </button>
                          {hasBill && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewBill(tableOrder);
                              }}
                              className="h-9 w-9 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center shadow-md hover:bg-blue-50 hover:border-blue-500 hover:shadow-lg transition-all"
                              title="View Bill"
                            >
                              <Receipt className="w-4.5 h-4.5 text-blue-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 sm:py-20 border-2 border-dashed rounded-xl">
          <Utensils className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-base sm:text-lg font-medium text-muted-foreground">No tables configured</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">Add tables to start managing your floor</p>
          <Button onClick={() => setIsAddDialogOpen(true)} className="h-9 sm:h-10">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Table
          </Button>
        </div>
      )}

      {/* Desktop POS Dialog */}
      {!isMobile && (
        <Dialog
          open={isPOSOpen}
          onOpenChange={(open) => {
            if (!open && customizingItem) return;
            setIsPOSOpen(open);
            if (!open) {
              handleClosePOS();
            }
          }}
        >
          <DesktopPOS
            categories={menuData?.categories || []}
            menuItems={menuData?.items || []}
            activeCategory={activeCategory}
            manualCart={manualCart}
            selectedTableId={selectedTableForOrder?.id || ""}
            selectedWaiterId={selectedTableForOrder?.assignedWaiterId || null}
            orderMethod="dine-in"
            paymentMethod={paymentMethod}
            customizingItem={customizingItem}
            searchQuery={searchQuery}
            isSearchOpen={isSearchOpen}
            onCategoryChange={setActiveCategory}
            onAddToManualCart={addToManualCart}
            onRemoveFromManualCart={removeFromManualCart}
            onIncrementManualCart={incrementManualCart}
            onTableChange={() => {}} // Table is pre-selected
            onWaiterChange={() => {}} // Waiter is pre-assigned
            onOrderMethodChange={() => {}} // Always dine-in
            onPaymentMethodChange={setPaymentMethod}
            onSendToKitchen={handleSendToKitchen}
            onSave={handleSave}
            onSaveAndPrint={handleSaveAndPrint}
            onCloseCustomization={() => setCustomizingItem(null)}
            onAddCustomizedToCart={handleAddCustomizedToCart}
            onSearchQueryChange={setSearchQuery}
            onSearchOpenChange={setIsSearchOpen}
            currency={currency}
            gstRate={gstRate}
            tables={tables}
            staff={staff}
            isLoading={createOrder.isPending}
          />
        </Dialog>
      )}

      {/* Bill Dialog */}
      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
            <DialogDescription>
              {selectedOrderForBill && (
                <div className="mt-2 space-y-1">
                  <div className="font-semibold text-base">
                    Table {selectedOrderForBill.table?.tableNumber}
                  </div>

                  {/* Waiter name - same placement (under table), different style */}
                  {selectedOrderForBill.placedByStaff?.fullName && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Waiter:</span>{" "}
                      <span className="font-semibold italic text-primary">
                        {selectedOrderForBill.placedByStaff.fullName}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedOrderForBill && (
            <div className="space-y-4 min-h-0">
              {/* Order Items */}
              <div className="max-h-[35vh] overflow-y-auto pr-1">
                <h4 className="font-semibold text-sm mb-2">Items</h4>
                <div className="space-y-1.5">
                  {selectedOrderForBill.items?.map((item, i) => {
                    const customizationSummary = getCustomizationSummary(item);
                    return (
                      <div
                        key={i}
                        className="flex justify-between items-start text-xs bg-muted/60 px-2.5 py-1.5 rounded-md border"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {item.quantity}x {item.itemName}
                          </div>
                          {customizationSummary && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {customizationSummary}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold ml-2">
                          {currency}{parseFloat(item.totalPrice).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Bill Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {currency}{parseFloat(selectedOrderForBill.subtotalAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    CGST ({(gstRate * 100 / 2).toFixed(1)}%)
                  </span>
                  <span className="font-medium">
                    {currency}{(parseFloat(selectedOrderForBill.gstAmount) / 2).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    SGST ({(gstRate * 100 / 2).toFixed(1)}%)
                  </span>
                  <span className="font-medium">
                    {currency}{(parseFloat(selectedOrderForBill.gstAmount) / 2).toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary text-xl">
                    {currency}{parseFloat(selectedOrderForBill.totalAmount).toFixed(2)}
                  </span>
                </div>

                {/* Show amount already paid for PARTIALLY_PAID orders */}
                {selectedOrderForBill.paymentStatus === "PARTIALLY_PAID" && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Already Paid</span>
                      <span className="font-medium">
                        - {currency}{parseFloat(selectedOrderForBill.paid_amount || "0").toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold text-orange-600">
                      <span>Outstanding Amount</span>
                      <span>
                        {currency}
                        {(
                          parseFloat(selectedOrderForBill.totalAmount) -
                          parseFloat(selectedOrderForBill.paid_amount || "0")
                        ).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">Payment Status</span>
                <Badge
                  className={cn(
                    "flex items-center gap-1.5",
                    getPaymentStatusColor(selectedOrderForBill.paymentStatus)
                  )}
                >
                  {selectedOrderForBill.paymentStatus || "DUE"}
                </Badge>
              </div>

              {/* Close Order - show only when paid + served and not already closed */}
              {selectedOrderForBill.paymentStatus === "PAID" &&
                selectedOrderForBill.status === "SERVED" &&
                !selectedOrderForBill.isClosed && (
                  <>
                    <Separator />
                    <Button
                      variant="default"
                      className="w-full"
                      disabled={closeOrder.isPending}
                      onClick={async () => {
                        try {
                          await closeOrder.mutateAsync(selectedOrderForBill.id);
                          setIsBillDialogOpen(false);
                          setSelectedOrderForBill(null);
                        } catch {
                          // handled by hook
                        }
                      }}
                    >
                      {closeOrder.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Close Order
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Closing will end this table session so new orders create a fresh bill.
                    </p>
                  </>
                )}

              {/* Payment Buttons - Show if not fully paid */}
              {selectedOrderForBill.paymentStatus !== "PAID" && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-sm mb-3">
                      {selectedOrderForBill.paymentStatus === "PARTIALLY_PAID" 
                        ? "Pay Outstanding Amount"
                        : "Accept Payment"}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => handlePayment(selectedOrderForBill, "CASH")}
                        variant="outline"
                        className="flex flex-col items-center gap-1 h-auto py-3"
                        disabled={updatePaymentStatus.isPending}
                      >
                        <DollarSign className="w-5 h-5" />
                        <span className="text-xs">Cash</span>
                      </Button>
                      <Button
                        onClick={() => handlePayment(selectedOrderForBill, "CARD")}
                        variant="outline"
                        className="flex flex-col items-center gap-1 h-auto py-3"
                        disabled={updatePaymentStatus.isPending}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-xs">Card</span>
                      </Button>
                      <Button
                        onClick={() => handlePayment(selectedOrderForBill, "UPI")}
                        variant="outline"
                        className="flex flex-col items-center gap-1 h-auto py-3"
                        disabled={updatePaymentStatus.isPending}
                      >
                        <QrCode className="w-5 h-5" />
                        <span className="text-xs">UPI</span>
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}