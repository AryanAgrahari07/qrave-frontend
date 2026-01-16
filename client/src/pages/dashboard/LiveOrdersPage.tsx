
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_ORDERS, MOCK_QUEUE, MOCK_TABLES } from "@/lib/mockData";
import { CheckCircle2, Clock, Utensils, ArrowRight, UserPlus, Users as UsersIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function LiveOrdersPage() {
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const handleSeatGuest = () => {
    if (!selectedTable) return;
    toast.success(`Seating ${selectedGuest.name} at Table ${selectedTable}`);
    setSelectedGuest(null);
    setSelectedTable(null);
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Live Terminal</h2>
          <p className="text-muted-foreground">Manage orders and guest queue in real-time.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="shadow-sm">
             <UserPlus className="w-4 h-4 mr-2" /> New Guest
           </Button>
           <Button className="shadow-lg shadow-primary/20">
             Place Manual Order
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Orders Column */}
        <div className="lg:col-span-2 space-y-6">
           <h3 className="font-heading font-bold text-xl flex items-center gap-2">
             <Utensils className="w-5 h-5 text-primary" /> Active Orders
           </h3>
           <div className="space-y-4">
            {MOCK_ORDERS.map((order) => (
              <Card key={order.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold font-heading">Table {order.table}</span>
                        <Badge variant={order.status === "PENDING" ? "destructive" : order.status === "PREPARING" ? "secondary" : "outline"} className="capitalize">
                          {order.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {order.time}
                      </p>
                    </div>

                    <div className="flex-1 md:px-8">
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item, i) => (
                          <span key={i} className="text-sm bg-muted px-2 py-1 rounded-md border border-border">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm">Update</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
           </div>
        </div>

        {/* Sidebar Queue Column */}
        <div className="lg:col-span-1 space-y-6">
           <h3 className="font-heading font-bold text-xl flex items-center gap-2">
             <UsersIcon className="w-5 h-5 text-primary" /> Guest Queue
           </h3>
           <div className="space-y-4">
             {MOCK_QUEUE.map((guest) => (
               <Card key={guest.id} className={cn("shadow-sm", guest.status === "CALLING" && "ring-2 ring-primary bg-primary/5")}>
                 <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold">{guest.name}</p>
                      <Badge variant={guest.status === "CALLING" ? "default" : "secondary"} className="text-[10px]">
                        {guest.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-4">
                      <span>{guest.partySize} Guests</span>
                      <span>{guest.waitTime} wait</span>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedGuest(guest)}>
                          Assign Table
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Assign Table for {guest.name}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Party Size: <span className="font-bold text-foreground">{guest.partySize}</span>. 
                            Showing best available tables:
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {MOCK_TABLES.filter(t => t.status === "AVAILABLE").map((table) => {
                              const isOptimal = table.capacity >= (typeof guest.partySize === 'string' ? parseInt(guest.partySize) : guest.partySize);
                              return (
                                <button
                                  key={table.id}
                                  type="button"
                                  onClick={() => setSelectedTable(table.number)}
                                  className={cn(
                                    "p-4 rounded-xl border-2 text-left transition-all",
                                    selectedTable === table.number 
                                      ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                                      : "border-border hover:border-primary/50"
                                  )}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-lg">Table {table.number}</span>
                                    {isOptimal && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Optimal</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground">Capacity: {table.capacity}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button className="w-full" disabled={!selectedTable} onClick={handleSeatGuest}>
                            Confirm Seating
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                 </CardContent>
               </Card>
             ))}
             {MOCK_QUEUE.length === 0 && (
               <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                 No one in queue
               </div>
             )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
