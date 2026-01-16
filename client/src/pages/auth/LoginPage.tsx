
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import bgImage from "@assets/generated_images/restaurant_interior_background.png";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login delay
    setTimeout(() => {
      setIsLoading(false);
      setLocation("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8 bg-background relative z-10">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left-8 duration-500">
          <div className="space-y-2 text-center lg:text-left">
            <Link href="/">
              <a className="inline-block text-2xl font-heading font-bold tracking-tighter text-primary mb-6">
                Qrave.
              </a>
            </Link>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Enter your details to access your dashboard.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="owner@restaurant.com" required className="h-11 bg-muted/30" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-sm text-primary hover:underline">Forgot?</a>
              </div>
              <Input id="password" type="password" required className="h-11 bg-muted/30" />
            </div>
            
            <Button type="submit" className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/auth?signup=true">
              <a className="font-semibold text-primary hover:underline">Start free trial</a>
            </Link>
          </div>
        </div>
      </div>

      {/* Right: Image */}
      <div className="hidden lg:block relative overflow-hidden bg-zinc-900">
        <img 
          src={bgImage} 
          alt="Restaurant Interior" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-12 text-white max-w-lg z-20">
          <blockquote className="text-2xl font-heading font-medium leading-relaxed mb-6">
            "Qrave transformed how we handle our dinner rush. The QR menus are so fast, our table turnover increased by 20%."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold font-heading">
              JD
            </div>
            <div>
              <p className="font-bold">John Doe</p>
              <p className="text-white/60 text-sm">Owner, The Golden Spoon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
