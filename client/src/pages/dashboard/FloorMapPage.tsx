import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Utensils, Plus, Loader2, RefreshCw, Edit2, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useTables, useUpdateTableStatus, useCreateTable, useDeleteTable, useRestaurant, useStaff, useAssignWaiterToTable } from "@/hooks/api";
import type { Table, TableStatus } from "@/types";

export default function FloorMapPage() {
  const { restaurantId, user } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: tables, isLoading, refetch } = useTables(restaurantId);
  const { data: staff } = useStaff(restaurantId);
  const assignWaiter = useAssignWaiterToTable(restaurantId);
  
  const updateStatus = useUpdateTableStatus(restaurantId);
  const createTable = useCreateTable(restaurantId);
  const deleteTable = useDeleteTable(restaurantId);
  
  // Filter waiters only and check if user is admin/owner
  const waiters = staff?.filter((s) => s.role === "WAITER" && s.isActive) || [];
  const isAdmin = user?.role === "owner" || user?.role === "admin" || user?.role === "platform_admin";

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTable, setNewTable] = useState({
    tableNumber: "",
    capacity: 4,
    floorSection: "",
  });

  const toggleTableStatus = (table: Table) => {
    const newStatus: TableStatus = table.currentStatus === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE";
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

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-white border-green-100 hover:border-green-500 text-green-600";
      case "OCCUPIED":
        return "bg-slate-50 border-red-200 text-red-500";
      case "RESERVED":
        return "bg-yellow-50 border-yellow-200 text-yellow-600";
      case "BLOCKED":
        return "bg-gray-100 border-gray-300 text-gray-500";
      default:
        return "bg-white border-border";
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

  // Group tables by floor section
  const tablesBySection = tables?.reduce((acc: Record<string, Table[]>, table: Table) => {
    const section = table.floorSection || "Main Floor";
    if (!acc[section]) acc[section] = [];
    acc[section].push(table);
    return acc;
  }, {} as Record<string, Table[]>) || {};

  // Count stats
  const stats = {
    total: tables?.length || 0,
    available: tables?.filter((t: Table) => t.currentStatus === "AVAILABLE").length || 0,
    occupied: tables?.filter((t: Table) => t.currentStatus === "OCCUPIED").length || 0,
    reserved: tables?.filter((t: Table) => t.currentStatus === "RESERVED").length || 0,
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

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold">Floor Map</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Monitor and manage table occupancy in real-time.</p>
        </div>
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Tables</p>
          <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-l-4 border-l-green-500">
          <p className="text-xs sm:text-sm text-muted-foreground">Available</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.available}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-l-4 border-l-red-500">
          <p className="text-xs sm:text-sm text-muted-foreground">Occupied</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.occupied}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-l-4 border-l-yellow-500">
          <p className="text-xs sm:text-sm text-muted-foreground">Reserved</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.reserved}</p>
        </Card>
      </div>

      {tables && tables.length > 0 ? (
        <div className="space-y-6 sm:space-y-8">
          {Object.entries(tablesBySection).map(([section, sectionTables]) => (
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {sectionTables.map((table: Table) => (
                    <div key={table.id} className="relative group space-y-2">
                      <button
                        onClick={() => toggleTableStatus(table)}
                        disabled={updateStatus.isPending}
                        className={cn(
                          "w-full p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 shadow-sm",
                          getStatusColor(table.currentStatus),
                          updateStatus.isPending && "opacity-50"
                        )}
                      >
                        <span className="text-xl sm:text-2xl font-bold">{table.tableNumber}</span>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold opacity-60">Cap: {table.capacity}</span>
                        {table.assignedWaiter && (
                          <span className="text-[8px] sm:text-[9px] font-semibold text-primary px-1.5 sm:px-2 py-0.5 bg-primary/10 rounded truncate max-w-full">
                            👤 {table.assignedWaiter.fullName}
                          </span>
                        )}
                        <Badge 
                          variant={getBadgeVariant(table.currentStatus)} 
                          className={cn(
                            "text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0 h-4 sm:h-5",
                            table.currentStatus === "AVAILABLE" && "bg-green-500 hover:bg-green-600"
                          )}
                        >
                          {table.currentStatus}
                        </Badge>
                      </button>
                      
                      {/* Waiter Assignment Dropdown (Admin Only) */}
                      {isAdmin && (
                        <div className="w-full" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={table.assignedWaiterId || "none"}
                            onValueChange={(value) => handleAssignWaiter(table.id, value === "none" ? null : value)}
                            disabled={assignWaiter.isPending}
                          >
                            <SelectTrigger className="h-7 sm:h-8 text-[10px] sm:text-xs">
                              <SelectValue placeholder="Assign waiter">
                                {table.assignedWaiter ? (
                                  <span className="flex items-center gap-1 truncate">
                                    <User className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{table.assignedWaiter.fullName}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Assign</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">No waiter</SelectItem>
                              {waiters.map((waiter) => (
                                <SelectItem key={waiter.id} value={waiter.id} className="text-xs">
                                  {waiter.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {/* Delete button on hover */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.id);
                        }}
                      >
                        <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </Button>
                    </div>
                  ))}
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
    </DashboardLayout>
  );
}