import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_QUEUE, MOCK_TABLES } from "@/lib/mockData";
import { Users as UsersIcon, Clock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

export default function QueuePage() {
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [selectedTableNum, setSelectedTableNum] = useState<string | null>(null);
  const [tables, setTables] = useState(MOCK_TABLES);
  const [queue, setQueue] = useState(MOCK_QUEUE);

  const handleSeatGuest = () => {
    if (!selectedTableNum || !selectedGuest) return;
    setTables(prev => prev.map(t => t.number === selectedTableNum ? { ...t, status: "OCCUPIED" } : t));
    setQueue(prev => prev.filter(g => g.id !== selectedGuest.id));
    toast.success(`Seating ${selectedGuest.name} at Table ${selectedTableNum}`);
    setSelectedGuest(null);
    setSelectedTableNum(null);
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Guest Queue</h2>
          <p className="text-muted-foreground">Manage waitlists and seat guests efficiently.</p>
        </div>
        <Button className="shadow-lg shadow-primary/20">
          <UserPlus className="w-4 h-4 mr-2" /> Add to Queue
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queue.map((guest) => (
          <Card key={guest.id} className={cn("shadow-sm border-l-4", guest.status === "CALLING" ? "border-l-primary ring-1 ring-primary/20 bg-primary/5" : "border-l-muted")}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-lg">{guest.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Waiting for {guest.waitTime}
                  </p>
                </div>
                <Badge variant={guest.status === "CALLING" ? "default" : "secondary"}>
                  {guest.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mb-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <UsersIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{guest.partySize} Guests</span>
                </div>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant={guest.status === "CALLING" ? "default" : "outline"} className="w-full" onClick={() => setSelectedGuest(guest)}>
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
                        const isOptimal = table.capacity >= guest.partySize;
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
        {queue.length === 0 && (
          <div className="col-span-full text-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl">
            <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No one in queue</p>
            <p className="text-sm">All guests have been seated.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
