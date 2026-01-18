import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_TABLES } from "@/lib/mockData";
import { Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function FloorMapPage() {
  const [tables, setTables] = useState(MOCK_TABLES);

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

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Floor Map</h2>
          <p className="text-muted-foreground">Monitor and manage table occupancy in real-time.</p>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xl flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary" /> Table Status
            </h3>
            <div className="flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> AVAILABLE</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> OCCUPIED</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => toggleTableStatus(table.id)}
                className={cn(
                  "p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-sm",
                  table.status === "AVAILABLE" 
                    ? "bg-white border-green-100 hover:border-green-500" 
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                )}
              >
                <span className="text-2xl font-bold">{table.number}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Cap: {table.capacity}</span>
                <Badge variant={table.status === "AVAILABLE" ? "default" : "outline"} className={cn(
                  "text-[9px] px-2 py-0 h-5",
                  table.status === "AVAILABLE" ? "bg-green-500 hover:bg-green-600" : "bg-transparent"
                )}>
                  {table.status}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
