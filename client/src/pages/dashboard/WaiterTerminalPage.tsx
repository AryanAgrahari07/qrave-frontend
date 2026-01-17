
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_TABLES, MOCK_QUEUE, MOCK_MENU_CATEGORIES } from "@/lib/mockData";
import { UserPlus, LayoutGrid, Users, Languages, MapPin, Check, ShoppingCart, Plus, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function WaiterTerminalPage() {
  const [language, setLanguage] = useState<"en" | "es" | "hi">("en");
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [tables, setTables] = useState(MOCK_TABLES);

  const t = {
    en: { title: "Waiter Terminal", floor: "Floor Map", queue: "Guest Queue", seat: "Seat Party", tables: "Tables", available: "Available", occupied: "Occupied", order: "Place Order", add: "Add to Order", confirm: "Confirm Order", items: "Items", markOccupied: "Mark Occupied", markAvailable: "Mark Available" },
    es: { title: "Terminal del Camarero", floor: "Mapa del Piso", queue: "Cola de Invitados", seat: "Sentar Grupo", tables: "Mesas", available: "Disponible", occupied: "Ocupado", order: "Realizar Pedido", add: "Agregar", confirm: "Confirmar", items: "Artículos", markOccupied: "Marcar Ocupado", markAvailable: "Marcar Disponible" },
    hi: { title: "वेटर टर्मिनल", floor: "फ्लोर मैप", queue: "मेहमानों की सूची", seat: "बैठाएं", tables: "मेज़", available: "उपलब्ध", occupied: "भरा हुआ", order: "ऑर्डर लें", add: "जोड़ें", confirm: "ऑर्डर भेजें", items: "सामान", markOccupied: "भरा हुआ मार्क करें", markAvailable: "उपलब्ध मार्क करें" }
  }[language];

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

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const submitOrder = () => {
    toast.success(`Order placed for Table ${selectedTableForOrder.number}!`);
    setSelectedTableForOrder(null);
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-900">{t.title}</h1>
            <p className="text-slate-500">Gourmet Haven • Station A</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <Languages className="w-5 h-5 text-slate-400" />
            <div className="flex gap-1">
              {(["en", "es", "hi"] as const).map((l) => (
                <Button 
                  key={l}
                  variant={language === l ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage(l)}
                  className="uppercase text-xs font-bold"
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Floor Map Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" /> {t.floor}
              </h2>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> {t.available}</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300" /> {t.occupied}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tables.map((table) => (
                <div key={table.id} className="relative group">
                  <div className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="h-8 w-8 rounded-full shadow-lg border border-slate-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTableStatus(table.id);
                      }}
                    >
                      <Check className={cn("w-4 h-4", table.status === "AVAILABLE" ? "text-slate-400" : "text-green-600")} />
                    </Button>
                  </div>
                  <button
                    onClick={() => table.status === "OCCUPIED" && setSelectedTableForOrder(table)}
                    className={cn(
                      "w-full aspect-square rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95",
                      table.status === "AVAILABLE" 
                        ? "bg-white border-green-200 shadow-sm cursor-default" 
                        : "bg-slate-100 border-primary shadow-inner text-slate-900 cursor-pointer hover:bg-slate-200"
                    )}
                  >
                    <span className="text-3xl font-bold">{table.number}</span>
                    <span className="text-xs uppercase tracking-widest font-bold">Cap: {table.capacity}</span>
                    {table.status === "AVAILABLE" ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Ready</Badge>
                    ) : (
                      <Badge variant="outline" className="border-primary text-primary bg-primary/5">
                        <ShoppingCart className="w-3 h-3 mr-1" /> {t.order}
                      </Badge>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Queue Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> {t.queue}
            </h2>
            <div className="space-y-4">
              {MOCK_QUEUE.map((guest) => (
                <Card key={guest.id} className="border-none shadow-md overflow-hidden group">
                  <div className="bg-primary h-1 w-full" />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-lg">{guest.name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {guest.partySize} People • {guest.waitTime}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary">{guest.status}</Badge>
                    </div>
                    <Button className="w-full shadow-lg shadow-primary/20 group-hover:bg-primary/90 transition-colors">
                      <MapPin className="w-4 h-4 mr-2" /> {t.seat}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Order Placement Dialog */}
      <Dialog open={!!selectedTableForOrder} onOpenChange={() => setSelectedTableForOrder(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              {t.order} - Table {selectedTableForOrder?.number}
            </DialogTitle>
            <DialogDescription>Select items to add to this table's order.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Menu Section */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
              {MOCK_MENU_CATEGORIES.map(category => (
                <div key={category.id} className="space-y-4">
                  <h3 className="font-heading font-bold text-xl sticky top-0 bg-slate-50/90 py-2 z-10">{category.name}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.items.filter(item => item.available).map(item => (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:border-primary hover:shadow-md transition-all text-left group"
                      >
                        <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-sm">{item.name}</p>
                          <p className="text-primary font-bold font-mono text-sm">${item.price}</p>
                        </div>
                        <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Section */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l flex flex-col bg-white">
              <div className="p-4 border-b bg-slate-50 font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> {t.items} ({cart.length})
              </div>
              <ScrollArea className="flex-1 p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                    <ShoppingCart className="w-8 h-8 opacity-20" />
                    <p className="text-sm font-medium">No items added yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="space-y-2 animate-in fade-in slide-in-from-right-2">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-sm leading-tight flex-1">{item.name}</p>
                          <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center border rounded-lg bg-slate-50">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:bg-slate-200 rounded-l-lg">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:bg-slate-200 rounded-r-lg">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="font-bold font-mono text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t bg-slate-50 space-y-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">${cartTotal.toFixed(2)}</span>
                </div>
                <Button className="w-full h-12 text-lg font-bold" disabled={cart.length === 0} onClick={submitOrder}>
                  {t.confirm}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
