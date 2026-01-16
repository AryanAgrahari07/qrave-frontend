
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_ORDERS } from "@/lib/mockData";
import { CookingPot, Timer, CheckCircle } from "lucide-react";

export default function KitchenPage() {
  const activeOrders = MOCK_ORDERS.filter(o => o.status !== "SERVED");

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Kitchen Display (KDS)</h2>
          <p className="text-muted-foreground">Live preparation queue for the kitchen team.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" /> Pending
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" /> Preparing
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeOrders.map((order) => (
          <Card key={order.id} className="h-fit border-2 border-primary/10">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold font-heading">Table {order.table}</span>
                <span className="text-xs font-mono text-muted-foreground">{order.id}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Timer className="w-3 h-3" /> {order.time}
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-4 space-y-4">
              <ul className="space-y-3">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs font-bold">1</div>
                    <span className="font-medium text-lg tracking-tight">{item}</span>
                  </li>
                ))}
              </ul>
              
              <div className="pt-4">
                {order.status === "PENDING" ? (
                  <Button className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                    START PREPARING
                  </Button>
                ) : (
                  <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                    <CheckCircle className="w-5 h-5 mr-2" /> MARK READY
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {activeOrders.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-3xl">
            <CookingPot className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-heading">Kitchen is clear!</p>
            <p className="text-sm">New orders will appear here automatically.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
