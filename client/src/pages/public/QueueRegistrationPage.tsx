import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, UserPlus, Clock, ChefHat, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "wouter";
import { useRestaurantBySlug, usePublicRegisterQueue, usePublicQueueStatus } from "@/hooks/api";
import type { QueueEntry } from "@/types";

export default function QueueRegistrationPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurantBySlug(slug ?? null);
  const registerQueue = usePublicRegisterQueue(restaurant?.id ?? null);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [joinedEntry, setJoinedEntry] = useState<QueueEntry | null>(null);

  // Track status with phone after joining
  const { data: statusEntry } = usePublicQueueStatus(
    restaurant?.id ?? null, 
    joinedEntry?.phoneNumber ?? null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    try {
      const entry = await registerQueue.mutateAsync({
        guestName: name.trim(),
        partySize,
        phoneNumber: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      
      setJoinedEntry(entry);
    } catch {
      // Error handled by mutation
    }
  };

  const currentEntry = statusEntry || joinedEntry;

  if (restaurantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center p-8">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-xl mb-2">Restaurant Not Found</CardTitle>
          <CardDescription>
            The queue you're looking for doesn't exist or is no longer available.
          </CardDescription>
        </Card>
      </div>
    );
  }

  if (currentEntry) {
    const isCalled = currentEntry.status === "CALLED";
    
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className={`w-full max-w-md text-center p-8 border-2 ${isCalled ? "border-primary ring-4 ring-primary/20" : "border-primary/20"}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCalled ? "bg-primary" : "bg-primary/10"}`}>
            {isCalled ? (
              <CheckCircle2 className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <Clock className="w-10 h-10 text-primary animate-pulse" />
            )}
          </div>
          
          {isCalled ? (
            <>
              <CardTitle className="text-2xl mb-2 font-heading text-primary">Your Table is Ready!</CardTitle>
              <CardDescription className="text-base mb-6">
                Please proceed to the host stand. We're waiting for you!
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-2xl mb-2 font-heading">You're in line!</CardTitle>
              <CardDescription className="text-base mb-6">
                {currentEntry.phoneNumber && (
                  <>We'll notify you at <span className="font-bold text-foreground">{currentEntry.phoneNumber}</span> when your table is ready.</>
                )}
              </CardDescription>
            </>
          )}
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {currentEntry.position && (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">Position</p>
                <p className="text-3xl font-bold text-primary font-heading">#{currentEntry.position}</p>
              </div>
            )}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">Est. Wait</p>
              <p className="text-3xl font-bold text-primary font-heading">
                {currentEntry.estimatedWaitMinutes ?? "—"} min
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Name</span>
              <span className="font-bold">{currentEntry.guestName}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Party Size</span>
              <span className="font-bold">{currentEntry.partySize} guests</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={isCalled ? "default" : "secondary"}>
                {currentEntry.status}
              </Badge>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => setJoinedEntry(null)} className="w-full">
            Register Another Party
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
            <ChefHat className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-heading font-bold mb-2">Join the Queue</h1>
        <p className="text-muted-foreground">
          {restaurant.name} • Register below to save your spot
        </p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader>
          <CardTitle>Guest Details</CardTitle>
          <CardDescription>We'll notify you when your table is ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input 
                id="name" 
                placeholder="Enter your name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                className="h-12 text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="+91 98765 43210" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <p className="text-xs text-muted-foreground">Optional - for SMS notifications</p>
            </div>

            <div className="space-y-2">
              <Label>Party Size *</Label>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={partySize === size ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setPartySize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
              {partySize >= 6 && (
                <div className="flex items-center gap-2 mt-2">
                  <Label htmlFor="custom-size" className="text-sm">More than 6?</Label>
                  <Input 
                    id="custom-size"
                    type="number" 
                    min="7"
                    max="20"
                    className="w-20 h-8"
                    onChange={(e) => setPartySize(parseInt(e.target.value) || 6)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Special Requests</Label>
              <Input 
                id="notes" 
                placeholder="e.g., Birthday celebration, high chair needed" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-12"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20" 
              disabled={registerQueue.isPending || !name.trim()}
            >
              {registerQueue.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Join Waiting List
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-sm text-muted-foreground flex items-center gap-2">
        <Users className="w-4 h-4" /> Powered by Qrave
      </p>
    </div>
  );
}
