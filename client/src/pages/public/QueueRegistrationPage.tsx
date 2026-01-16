
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, UserPlus, Clock, ChefHat } from "lucide-react";
import { toast } from "sonner";

export default function QueueRegistrationPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setJoined(true);
      toast.success("You've been added to the queue!");
    }, 1500);
  };

  if (joined) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 border-2 border-primary/20">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl mb-2 font-heading">You're in line!</CardTitle>
          <CardDescription className="text-base mb-6">
            We'll text you at <span className="font-bold text-foreground">{phone}</span> when your table for {partySize} is ready.
          </CardDescription>
          <div className="bg-muted rounded-lg p-4 mb-8">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">Estimated Wait</p>
            <p className="text-3xl font-bold text-primary font-heading">15 - 25 mins</p>
          </div>
          <Button variant="outline" onClick={() => setJoined(false)} className="w-full">
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
        <p className="text-muted-foreground">Tables are currently full. Register below to save your spot.</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader>
          <CardTitle>Guest Details</CardTitle>
          <CardDescription>We'll notify you when your table is ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
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
                  placeholder="(555) 000-0000" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Party Size</Label>
              <div className="grid grid-cols-4 gap-2">
                {["1-2", "3-4", "5-6", "7+"].map((size) => (
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
            </div>

            <Button type="submit" className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20" disabled={isSubmitting}>
              {isSubmitting ? "Joining..." : "Join Waiting List"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-sm text-muted-foreground flex items-center gap-2">
        <Users className="w-4 h-4" /> 5 parties currently waiting
      </p>
    </div>
  );
}
