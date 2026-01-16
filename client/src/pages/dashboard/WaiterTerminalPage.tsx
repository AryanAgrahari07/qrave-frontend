
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_TABLES, MOCK_QUEUE } from "@/lib/mockData";
import { UserPlus, LayoutGrid, Users, Languages, MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function WaiterTerminalPage() {
  const [language, setLanguage] = useState<"en" | "es" | "hi">("en");

  const t = {
    en: { title: "Waiter Terminal", floor: "Floor Map", queue: "Guest Queue", seat: "Seat Party", tables: "Tables", available: "Available", occupied: "Occupied" },
    es: { title: "Terminal del Camarero", floor: "Mapa del Piso", queue: "Cola de Invitados", seat: "Sentar Grupo", tables: "Mesas", available: "Disponible", occupied: "Ocupado" },
    hi: { title: "वेटर टर्मिनल", floor: "फ्लोर मैप", queue: "मेहमानों की सूची", seat: "बैठाएं", tables: "मेज़", available: "उपलब्ध", occupied: "भरा हुआ" }
  }[language];

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
              {MOCK_TABLES.map((table) => (
                <button
                  key={table.id}
                  className={cn(
                    "aspect-square rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95",
                    table.status === "AVAILABLE" 
                      ? "bg-white border-green-200 shadow-sm hover:border-green-500" 
                      : "bg-slate-100 border-transparent text-slate-400 cursor-not-allowed"
                  )}
                >
                  <span className="text-3xl font-bold">{table.number}</span>
                  <span className="text-xs uppercase tracking-widest font-bold">Cap: {table.capacity}</span>
                  {table.status === "AVAILABLE" && <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Ready</Badge>}
                </button>
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
    </div>
  );
}
