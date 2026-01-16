
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MOCK_STAFF, MOCK_QUEUE } from "@/lib/mockData";
import { UserPlus, Users, UserCircle, ChefHat, Clock, Trash2, PhoneCall } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function StaffManagementPage() {
  const [staff, setStaff] = useState(MOCK_STAFF);
  const [queue, setQueue] = useState(MOCK_QUEUE);

  const addStaff = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("New staff ID created successfully!");
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
    toast.success("Guest seated and removed from queue.");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Staff & Queue</h2>
          <p className="text-muted-foreground">Manage your team and track guest waiting list.</p>
        </div>

        <Tabs defaultValue="staff" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="staff">Staff Management</TabsTrigger>
            <TabsTrigger value="queue">Queue Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Add Staff Form */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    Create Staff ID
                  </CardTitle>
                  <CardDescription>Generate new credentials for workers.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addStaff} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="WAITER">Waiter</option>
                        <option value="KITCHEN">Kitchen Staff</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Login PIN</Label>
                      <Input type="password" placeholder="4-digit PIN" maxLength={4} required />
                    </div>
                    <Button type="submit" className="w-full">Generate Staff ID</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Staff List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Active Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {staff.map((s) => (
                      <div key={s.id} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary">
                            {s.role === "WAITER" ? <UserCircle className="w-6 h-6" /> : <ChefHat className="w-6 h-6" />}
                          </div>
                          <div>
                            <p className="font-bold">{s.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{s.id} • {s.role}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {queue.map((guest) => (
                <Card key={guest.id} className={cn("relative overflow-hidden border-2", guest.status === "CALLING" ? "border-primary animate-pulse" : "border-border")}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{guest.name}</CardTitle>
                      <Badge variant={guest.status === "CALLING" ? "default" : "secondary"}>
                        {guest.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" /> {guest.partySize} People
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" /> {guest.waitTime} wait
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => removeFromQueue(guest.id)}>
                        Seat Now
                      </Button>
                      <Button variant="outline" size="icon">
                        <PhoneCall className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <button className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors">
                <UserPlus className="w-8 h-8 mb-2" />
                <p className="font-bold">Add to Queue</p>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

import { cn } from "@/lib/utils";
