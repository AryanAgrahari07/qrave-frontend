
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_ORDERS, MOCK_QUEUE, MOCK_TABLES, MOCK_MENU_CATEGORIES } from "@/lib/mockData";
import { CheckCircle2, Clock, Utensils, ArrowRight, UserPlus, Users as UsersIcon, Check, Receipt, CreditCard, QrCode, Plus, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Utensils as DineInIcon, Truck } from "lucide-react";

export default function LiveOrdersPage() {
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [selectedTableNum, setSelectedTableNum] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [tables, setTables] = useState(MOCK_TABLES);
  const [pastBills, setPastBills] = useState<any[]>([]);
  const [orderMethod, setOrderMethod] = useState<string>("DINE_IN");
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [manualCart, setManualCart] = useState<{id: string, name: string, price: number, quantity: number}[]>([]);

  const addToManualCart = (item: any) => {
    setManualCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromManualCart = (itemId: string) => {
    setManualCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const manualCartTotal = useMemo(() => {
    return manualCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [manualCart]);

  const toggleTableStatus = (tableId: string) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        const newStatus = t.status === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE";
        toast.success(`Table ${t.number} is now ${newStatus.toLowerCase()}`);
        return { ...t, status: newStatus };
      }
      return t;
    }));
  };

  const handleSeatGuest = () => {
    if (!selectedTableNum) return;
    setTables(prev => prev.map(t => t.number === selectedTableNum ? { ...t, status: "OCCUPIED" } : t));
    toast.success(`Seating ${selectedGuest.name} at Table ${selectedTableNum}`);
    setSelectedGuest(null);
    setSelectedTableNum(null);
  };

  const calculateBill = (subtotal: number) => {
    const gst = subtotal * 0.05; // 5% GST
    const serviceTax = subtotal * 0.10; // 10% Service Tax
    const total = subtotal + gst + serviceTax;
    return { subtotal, gst, serviceTax, total };
  };

  const handlePayment = (order: any, method: string) => {
    const billDetails = calculateBill(order.total);
    const newBill = {
      ...order,
      ...billDetails,
      paymentMethod: method,
      orderMethod: orderMethod,
      paidAt: new Date().toISOString(),
      billNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`
    };
    
    setPastBills(prev => [newBill, ...prev]);
    toast.success(`Payment of $${billDetails.total.toFixed(2)} received via ${method}`);
    setSelectedOrder(null);
    setIsBillingOpen(false);
    
    // Auto-release the table
    setTables(prev => prev.map(t => t.number === order.table ? { ...t, status: "AVAILABLE" } : t));
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Live Terminal</h2>
          <p className="text-muted-foreground">Manage orders and guest queue in real-time.</p>
        </div>
        <div className="flex gap-2">
           <Dialog>
             <DialogTrigger asChild>
               <Button variant="secondary" className="shadow-lg border-primary/20 bg-primary/10 text-primary hover:bg-primary/20">
                 <Receipt className="w-4 h-4 mr-2" /> 3-Click Quick Bill
               </Button>
             </DialogTrigger>
             <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
               <DialogHeader>
                 <DialogTitle className="flex items-center gap-2 text-2xl">
                   <Receipt className="w-6 h-6 text-primary" /> 
                   Quick Billing Terminal
                 </DialogTitle>
                 <DialogDescription>Add items, select method, and settle payment.</DialogDescription>
               </DialogHeader>
               
               <div className="flex-1 overflow-hidden grid md:grid-cols-2 gap-6 py-4">
                 {/* Left: Menu Selection */}
                 <div className="flex flex-col gap-4 overflow-hidden border-r pr-6">
                   <Label className="text-xs uppercase font-bold text-muted-foreground">1. Select Food Items</Label>
                   <ScrollArea className="flex-1">
                     <div className="space-y-6">
                       {MOCK_MENU_CATEGORIES.map(category => (
                         <div key={category.id} className="space-y-2">
                           <h4 className="text-sm font-bold border-b pb-1">{category.name}</h4>
                           <div className="grid grid-cols-1 gap-2">
                             {category.items.map(item => (
                               <Button
                                 key={item.id}
                                 variant="outline"
                                 className="justify-between h-auto py-2 px-3 text-left hover:border-primary hover:bg-primary/5 group"
                                 onClick={() => addToManualCart(item)}
                               >
                                 <div className="flex flex-col">
                                   <span className="font-bold text-sm">{item.name}</span>
                                   <span className="text-xs text-muted-foreground">${item.price}</span>
                                 </div>
                                 <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                               </Button>
                             ))}
                           </div>
                         </div>
                       ))}
                     </div>
                   </ScrollArea>
                 </div>

                 {/* Right: Cart & Payment */}
                 <div className="flex flex-col gap-6 overflow-hidden">
                   <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                     <Label className="text-xs uppercase font-bold text-muted-foreground">2. Bill Details</Label>
                     
                     {/* Cart Items */}
                     <ScrollArea className="flex-1 border rounded-lg p-3 bg-muted/20">
                       <div className="space-y-3">
                         {manualCart.length === 0 ? (
                           <div className="text-center py-10 text-muted-foreground text-sm italic">
                             No items added to bill
                           </div>
                         ) : (
                           manualCart.map(item => (
                             <div key={item.id} className="flex items-center justify-between group">
                               <div className="flex flex-col">
                                 <span className="text-sm font-bold">{item.name}</span>
                                 <span className="text-xs text-muted-foreground">${item.price} x {item.quantity}</span>
                               </div>
                               <div className="flex items-center gap-2">
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-7 w-7 rounded-full border"
                                   onClick={() => removeFromManualCart(item.id)}
                                 >
                                   <Minus className="w-3 h-3" />
                                 </Button>
                                 <span className="text-sm font-bold min-w-[20px] text-center">{item.quantity}</span>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-7 w-7 rounded-full border"
                                   onClick={() => addToManualCart(item)}
                                 >
                                   <Plus className="w-3 h-3" />
                                 </Button>
                               </div>
                             </div>
                           ))
                         )}
                       </div>
                     </ScrollArea>

                     {/* Breakdown */}
                     <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Subtotal</span>
                         <span>${manualCartTotal.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Taxes (GST 5% + SC 10%)</span>
                         <span>${(manualCartTotal * 0.15).toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between font-bold border-t pt-2 mt-2">
                         <span>Total Payable</span>
                         <span className="text-primary text-lg">${(manualCartTotal * 1.15).toFixed(2)}</span>
                       </div>
                     </div>
                   </div>

                   {/* Step 3: Method & Payment */}
                   <div className="space-y-4">
                     <div className="space-y-2">
                       <Label className="text-xs uppercase font-bold text-muted-foreground">3. Select Type & Settle</Label>
                       <RadioGroup 
                         defaultValue="DINE_IN" 
                         onValueChange={setOrderMethod}
                         className="grid grid-cols-3 gap-2"
                       >
                         <RadioGroupItem value="DINE_IN" id="quick-dine-in" className="peer sr-only" />
                         <Label
                           htmlFor="quick-dine-in"
                           className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                         >
                           <DineInIcon className="h-4 w-4 mb-1" />
                           <span className="text-[10px] font-bold">Dine-in</span>
                         </Label>

                         <RadioGroupItem value="TAKEAWAY" id="quick-takeaway" className="peer sr-only" />
                         <Label
                           htmlFor="quick-takeaway"
                           className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                         >
                           <ShoppingBag className="h-4 w-4 mb-1" />
                           <span className="text-[10px] font-bold">Takeaway</span>
                         </Label>

                         <RadioGroupItem value="DELIVERY" id="quick-delivery" className="peer sr-only" />
                         <Label
                           htmlFor="quick-delivery"
                           className="flex flex-col items-center justify-between rounded-lg border bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary transition-all cursor-pointer"
                         >
                           <Truck className="h-4 w-4 mb-1" />
                           <span className="text-[10px] font-bold">Delivery</span>
                         </Label>
                       </RadioGroup>
                     </div>

                     <div className="grid grid-cols-3 gap-2">
                       <Button 
                         variant="outline" 
                         className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5 rounded-xl border-2" 
                         onClick={() => {
                           if(manualCartTotal <= 0) return toast.error("Please add items to bill");
                           handlePayment({ 
                             id: 'manual', 
                             table: 'N/A', 
                             total: manualCartTotal, 
                             items: manualCart.map(i => `${i.name} x${i.quantity}`) 
                           }, "CASH");
                           setManualCart([]);
                         }}
                       >
                         <CreditCard className="w-4 h-4 text-green-600" />
                         <div className="text-[10px] font-bold">CASH</div>
                       </Button>
                       <Button 
                         variant="outline" 
                         className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5 rounded-xl border-2"
                         onClick={() => {
                           if(manualCartTotal <= 0) return toast.error("Please add items to bill");
                           handlePayment({ 
                             id: 'manual', 
                             table: 'N/A', 
                             total: manualCartTotal, 
                             items: manualCart.map(i => `${i.name} x${i.quantity}`) 
                           }, "UPI");
                           setManualCart([]);
                         }}
                       >
                         <QrCode className="w-4 h-4 text-blue-600" />
                         <div className="text-[10px] font-bold">UPI</div>
                       </Button>
                       <Button 
                         variant="outline" 
                         className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5 rounded-xl border-2"
                         onClick={() => {
                           if(manualCartTotal <= 0) return toast.error("Please add items to bill");
                           handlePayment({ 
                             id: 'manual', 
                             table: 'N/A', 
                             total: manualCartTotal, 
                             items: manualCart.map(i => `${i.name} x${i.quantity}`) 
                           }, "CARD");
                           setManualCart([]);
                         }}
                       >
                         <CreditCard className="w-4 h-4 text-purple-600" />
                         <div className="text-[10px] font-bold">CARD</div>
                       </Button>
                     </div>
                   </div>
                 </div>
               </div>
             </DialogContent>
           </Dialog>
           <Button variant="outline" className="shadow-sm">
             <UserPlus className="w-4 h-4 mr-2" /> New Guest
           </Button>
           <Button className="shadow-lg shadow-primary/20">
             Place Manual Order
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Floor Map Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xl flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" /> Floor Map & Status
            </h3>
            <div className="flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> AVAILABLE</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> OCCUPIED</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => toggleTableStatus(table.id)}
                className={cn(
                  "p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                  table.status === "AVAILABLE" 
                    ? "bg-white border-green-200 shadow-sm hover:border-green-500" 
                    : "bg-slate-100 border-slate-300 text-slate-500 hover:border-slate-400"
                )}
              >
                <span className="text-xl font-bold">{table.number}</span>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Cap: {table.capacity}</span>
                <Badge variant={table.status === "AVAILABLE" ? "default" : "outline"} className={cn(
                  "text-[9px] px-1 py-0 h-4",
                  table.status === "AVAILABLE" ? "bg-green-500 hover:bg-green-600" : "bg-transparent"
                )}>
                  {table.status}
                </Badge>
              </button>
            ))}
          </div>

          <Separator className="my-8" />

          <h3 className="font-heading font-bold text-xl flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" /> Active Orders
          </h3>
          <div className="space-y-4">
            {MOCK_ORDERS.map((order) => {
              const bill = calculateBill(order.total);
              return (
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

                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Total</p>
                          <p className="text-lg font-bold font-heading text-primary">${bill.total.toFixed(2)}</p>
                        </div>
                        <Dialog open={isBillingOpen && selectedOrder?.id === order.id} onOpenChange={(open) => {
                          setIsBillingOpen(open);
                          if (!open) setSelectedOrder(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedOrder(order);
                              setIsBillingOpen(true);
                            }}>
                              <Receipt className="w-4 h-4 mr-2" /> Quick Bill
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-2xl">
                                <Receipt className="w-6 h-6 text-primary" /> 
                                Billing - Table {order.table}
                              </DialogTitle>
                              <DialogDescription>1. Select Method → 2. Review → 3. Pay</DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6 py-4">
                              {/* Step 1: Order Method */}
                              <div className="space-y-3">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">1. Order Method</Label>
                                <RadioGroup 
                                  defaultValue="DINE_IN" 
                                  onValueChange={setOrderMethod}
                                  className="grid grid-cols-3 gap-2"
                                >
                                  <div>
                                    <RadioGroupItem value="DINE_IN" id="dine-in" className="peer sr-only" />
                                    <Label
                                      htmlFor="dine-in"
                                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                      <DineInIcon className="mb-2 h-5 w-5" />
                                      <span className="text-[10px] font-bold">Dine-in</span>
                                    </Label>
                                  </div>
                                  <div>
                                    <RadioGroupItem value="TAKEAWAY" id="takeaway" className="peer sr-only" />
                                    <Label
                                      htmlFor="takeaway"
                                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                      <ShoppingBag className="mb-2 h-5 w-5" />
                                      <span className="text-[10px] font-bold">Takeaway</span>
                                    </Label>
                                  </div>
                                  <div>
                                    <RadioGroupItem value="DELIVERY" id="delivery" className="peer sr-only" />
                                    <Label
                                      htmlFor="delivery"
                                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                    >
                                      <Truck className="mb-2 h-5 w-5" />
                                      <span className="text-[10px] font-bold">Delivery</span>
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              <Separator />

                              {/* Step 2: Breakdown */}
                              <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">2. Summary</Label>
                                <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>${bill.subtotal.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Taxes (GST 5% + SC 10%)</span>
                                    <span>${(bill.gst + bill.serviceTax).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                                    <span>Total Payable</span>
                                    <span className="text-primary text-lg">${bill.total.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Step 3: Payment */}
                              <div className="space-y-3">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">3. Settle Payment</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  <Button 
                                    variant="outline" 
                                    className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5" 
                                    onClick={() => handlePayment(order, "CASH")}
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    <div className="text-[10px] font-bold">CASH</div>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5"
                                    onClick={() => handlePayment(order, "UPI")}
                                  >
                                    <QrCode className="w-4 h-4" />
                                    <div className="text-[10px] font-bold">UPI</div>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className="flex-col h-16 gap-1 hover:border-primary hover:bg-primary/5"
                                    onClick={() => handlePayment(order, "CARD")}
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    <div className="text-[10px] font-bold">CARD</div>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
           </div>
        </div>

        {/* Sidebar Queue Column */}
        <div className="lg:col-span-1 space-y-6">
           <div className="flex items-center justify-between">
             <h3 className="font-heading font-bold text-xl flex items-center gap-2">
               <Receipt className="w-5 h-5 text-primary" /> Recent Bills
             </h3>
             <Badge variant="secondary">{pastBills.length}</Badge>
           </div>
           
           <div className="space-y-3">
             {pastBills.slice(0, 5).map((bill) => (
               <div key={bill.billNumber} className="p-3 rounded-lg border border-border bg-white shadow-sm animate-in fade-in slide-in-from-right-2">
                 <div className="flex justify-between items-start mb-1">
                   <p className="font-bold text-sm">{bill.billNumber}</p>
                   <div className="flex gap-1">
                     <Badge className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">{bill.orderMethod}</Badge>
                     <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200">{bill.paymentMethod}</Badge>
                   </div>
                 </div>
                 <div className="flex justify-between items-end">
                   <div>
                     <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Table {bill.table}</p>
                     <p className="text-[10px] text-muted-foreground">{new Date(bill.paidAt).toLocaleTimeString()}</p>
                   </div>
                   <p className="font-bold text-primary font-mono text-sm">${bill.total.toFixed(2)}</p>
                 </div>
               </div>
             ))}
             {pastBills.length === 0 && (
               <div className="text-center py-6 text-muted-foreground text-sm italic border border-dashed rounded-lg">
                 No bills generated yet
               </div>
             )}
           </div>

           <Separator className="my-6" />

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
                            {tables.filter(t => t.status === "AVAILABLE").map((table) => {
                              const isOptimal = table.capacity >= (typeof guest.partySize === 'string' ? parseInt(guest.partySize) : guest.partySize);
                              return (
                                <button
                                  key={table.id}
                                  type="button"
                                  onClick={() => setSelectedTableNum(table.number)}
                                  className={cn(
                                    "p-4 rounded-xl border-2 text-left transition-all",
                                    selectedTableNum === table.number 
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
                          <Button className="w-full" disabled={!selectedTableNum} onClick={handleSeatGuest}>
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
