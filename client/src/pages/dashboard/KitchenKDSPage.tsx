
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_ORDERS } from "@/lib/mockData";
import { Clock, CheckCircle2, Languages, Utensils, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function KitchenKDSPage() {
  const [language, setLanguage] = useState<"en" | "es" | "fr">("en");
  const [orders, setOrders] = useState(MOCK_ORDERS);

  const t = {
    en: { title: "Kitchen Display (KDS)", active: "Active Orders", prepare: "Mark Preparing", ready: "Mark Ready", table: "Table", mins: "mins" },
    es: { title: "Pantalla de Cocina", active: "Pedidos Activos", prepare: "En Preparación", ready: "Listo", table: "Mesa", mins: "min" },
    fr: { title: "Écran de Cuisine", active: "Commandes Actives", prepare: "En Préparation", ready: "Prêt", table: "Table", mins: "min" }
  }[language];

  const updateStatus = (id: string, status: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    toast.success(`Order ${id} updated to ${status}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Utensils className="w-8 h-8 text-primary" /> {t.title}
          </h1>
          <p className="text-slate-400">{orders.length} {t.active}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <Languages className="w-5 h-5 text-slate-400" />
          <div className="flex gap-1">
            {(["en", "es", "fr"] as const).map((l) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orders.map((order) => (
          <Card key={order.id} className={cn(
            "bg-slate-800 border-slate-700 text-slate-50 overflow-hidden transition-all",
            order.status === "PENDING" ? "ring-2 ring-red-500/50" : "ring-1 ring-slate-700"
          )}>
            <CardHeader className={cn(
              "pb-3 flex flex-row items-center justify-between",
              order.status === "PENDING" ? "bg-red-500/10" : "bg-blue-500/10"
            )}>
              <div>
                <CardTitle className="text-2xl">{t.table} {order.table}</CardTitle>
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                  <Timer className="w-4 h-4" /> {order.time}
                </div>
              </div>
              <Badge variant={order.status === "PENDING" ? "destructive" : "default"} className="animate-pulse">
                {order.status}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2 min-h-[120px]">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-lg font-medium border-b border-slate-700/50 pb-2">
                    <span className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-sm">1</span>
                    {item}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 gap-2 pt-2">
                {order.status === "PENDING" ? (
                  <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(order.id, "PREPARING")}>
                    {t.prepare}
                  </Button>
                ) : (
                  <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" onClick={() => updateStatus(order.id, "SERVED")}>
                    <CheckCircle2 className="w-5 h-5 mr-2" /> {t.ready}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
