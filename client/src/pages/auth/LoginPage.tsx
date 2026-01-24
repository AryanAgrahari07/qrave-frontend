import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import bgImage from "@assets/generated_images/restaurant_interior_background.png";
import { Loader2, ChefHat, UserCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "WAITER" | "KITCHEN">("ADMIN");
  const { login, staffLogin, isLoading: authLoading } = useAuth();
  const isLoading = authLoading;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { user } =
        role === "ADMIN"
          ? await login(email, password)
          : await staffLogin(email, password); // `password` field used as passcode for staff terminals
      toast.success("Welcome back to Qrave!");
      const r = user?.role ?? role;
      if (r === "KITCHEN") setLocation("/kitchen");
      else if (r === "WAITER") setLocation("/waiter");
      else setLocation("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8 bg-background relative z-10">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left-8 duration-500">
          <div className="space-y-2 text-center lg:text-left">
            <Link href="/">
              <div className="inline-block text-2xl font-heading font-bold tracking-tighter text-primary mb-6 cursor-pointer">
                Qrave.
              </div>
            </Link>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Select your role and sign in to your terminal.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "ADMIN", label: "Admin", icon: ShieldCheck },
              { id: "WAITER", label: "Waiter", icon: UserCircle },
              { id: "KITCHEN", label: "Kitchen", icon: ChefHat },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    role === r.id 
                      ? "border-primary bg-primary/5 text-primary shadow-md" 
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-tighter">{r.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="owner@restaurant.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-muted/30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{role === "ADMIN" ? "Password" : "Passcode"}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-muted/30"
                placeholder={role === "ADMIN" ? "••••" : "4-digit PIN"}
                maxLength={role === "ADMIN" ? undefined : 50}
              />
            </div>
            
            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Sign in as ${role}`}
            </Button>
          </form>

          {role === "ADMIN" && (
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup">
                <span className="font-semibold text-primary hover:underline cursor-pointer">Start free trial</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:block relative overflow-hidden bg-zinc-900">
        <img 
          src={bgImage} 
          alt="Restaurant Interior" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-12 text-white max-w-lg z-20">
          <p className="text-primary font-bold uppercase tracking-widest text-sm mb-4">Role-Based Access</p>
          <h2 className="text-3xl font-heading font-bold mb-4">Efficiency at every touchpoint.</h2>
          <p className="text-white/70 leading-relaxed">
            Separate terminals for Waiters and Kitchen staff ensure that everyone sees only what they need to, keeping the operation fast and error-free.
          </p>
        </div>
      </div>
    </div>
  );
}
