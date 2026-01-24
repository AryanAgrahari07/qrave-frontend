import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronRight, Store, CreditCard, Palette, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Account & Restaurant", icon: Store },
  { id: 2, title: "Choose Plan", icon: CreditCard },
  { id: 3, title: "Tables Setup", icon: Palette },
];

const PLANS = [
  { name: "STARTER", displayName: "Starter", price: "Free", features: ["10 Menu Items", "Basic QR Codes", "Email Support"] },
  { name: "PRO", displayName: "Pro", price: "₹2,999/mo", features: ["Unlimited Items", "Custom Branding", "Analytics Dashboard", "Priority Support"], popular: true },
  { name: "ENTERPRISE", displayName: "Enterprise", price: "₹9,999/mo", features: ["Multi-location", "API Access", "Dedicated Manager", "Custom Integrations"] },
];

const RESTAURANT_TYPES = ["Restaurant", "Cafe", "Bar", "Fine Dining", "Fast Food", "Food Truck"];

interface OnboardingData {
  // User
  email: string;
  password: string;
  fullName: string;
  // Restaurant
  restaurantName: string;
  slug: string;
  type: string;
  currency: string;
  // Plan
  plan: string;
  // Tables
  tableCount: number;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [_, setLocation] = useLocation();
  const { onboardingComplete } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<OnboardingData>({
    email: "",
    password: "",
    fullName: "",
    restaurantName: "",
    slug: "",
    type: "Restaurant",
    currency: "₹",
    plan: "STARTER",
    tableCount: 6,
  });

  // Validate current step
  const canProceed = () => {
    if (step === 1) {
      return formData.email && formData.password && formData.fullName && formData.restaurantName && formData.slug;
    }
    if (step === 2) {
      return !!formData.plan;
    }
    return true;
  };

  // Generate slug from restaurant name
  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  const handleRestaurantNameChange = (name: string) => {
    setFormData({
      ...formData,
      restaurantName: name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Call the quick-start onboarding API
      const response = await api.post<{
        success: boolean;
        user: { id: string; email: string; fullName: string; role: string };
        restaurant: { id: string; name: string; slug: string };
        token: string;
        tables: unknown[];
        categories: unknown[];
      }>("/api/onboarding/quick-start", {
        user: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        },
        restaurant: {
          name: formData.restaurantName,
          slug: formData.slug,
          type: formData.type,
          currency: formData.currency,
          plan: formData.plan,
        },
        tableCount: formData.tableCount,
        useDefaultCategories: true,
      });

      // Update auth context with new user
      onboardingComplete({
        user: response.user,
        token: response.token,
        restaurant: response.restaurant,
      });

      toast.success("Welcome to Qrave! Your restaurant is ready.");
      setLocation("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (!canProceed()) return;
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10" />
            {STEPS.map((s) => (
              <div key={s.id} className={cn("flex flex-col items-center gap-2 bg-background p-2 rounded-xl transition-all", step >= s.id ? "text-primary" : "text-muted-foreground")}>
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all shadow-sm",
                  step >= s.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted text-muted-foreground"
                )}>
                  {step > s.id ? <Check className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className="text-sm font-medium hidden sm:block">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-background border border-border rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-8 flex-1">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="text-center">
                  <h2 className="text-2xl font-heading font-bold">Create your account</h2>
                  <p className="text-muted-foreground">Set up your account and restaurant details.</p>
                </div>
                <div className="max-w-md mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input 
                      placeholder="John Doe" 
                      value={formData.fullName} 
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input 
                      type="email"
                      placeholder="john@restaurant.com" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input 
                      type="password"
                      placeholder="Min 6 characters" 
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                    />
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-2">
                      <Label>Restaurant Name *</Label>
                      <Input 
                        placeholder="e.g. The Golden Spoon" 
                        value={formData.restaurantName} 
                        onChange={(e) => handleRestaurantNameChange(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>URL Handle *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm whitespace-nowrap">qrave.app/r/</span>
                      <Input 
                        placeholder="golden-spoon" 
                        value={formData.slug} 
                        onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Restaurant Type</Label>
                    <div className="flex flex-wrap gap-2">
                      {RESTAURANT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({...formData, type})}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                            formData.type === type 
                              ? "bg-primary text-white border-primary" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="text-center">
                  <h2 className="text-2xl font-heading font-bold">Select a plan</h2>
                  <p className="text-muted-foreground">Scale as you grow. Change anytime.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {PLANS.map((plan) => (
                    <div 
                      key={plan.name} 
                      onClick={() => setFormData({...formData, plan: plan.name})}
                      className={cn(
                        "p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105",
                        formData.plan === plan.name ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border hover:border-primary/50",
                        plan.popular && "relative"
                      )}
                    >
                      {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-md">
                          Most Popular
                        </span>
                      )}
                      <h3 className="font-bold text-xl mb-2">{plan.displayName}</h3>
                      <div className="text-3xl font-heading font-bold mb-4">{plan.price}</div>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="text-center">
                  <h2 className="text-2xl font-heading font-bold">Set up your tables</h2>
                  <p className="text-muted-foreground">We'll auto-generate QR codes for each table.</p>
                </div>
                <div className="max-w-md mx-auto space-y-6">
                  <div className="space-y-2">
                    <Label>How many tables do you have?</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {[4, 6, 8, 10, 12, 15, 20, 25].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setFormData({...formData, tableCount: count})}
                          className={cn(
                            "p-4 rounded-xl border-2 font-bold text-lg transition-all",
                            formData.tableCount === count 
                              ? "bg-primary text-white border-primary" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      You can add or remove tables later from the Floor Map.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <div className="flex gap-2">
                      {["₹", "$", "€", "£"].map((curr) => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => setFormData({...formData, currency: curr})}
                          className={cn(
                            "w-12 h-12 rounded-xl border-2 font-bold text-lg transition-all",
                            formData.currency === curr 
                              ? "bg-primary text-white border-primary" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-xl p-6 space-y-3">
                    <h3 className="font-bold text-lg">Setup Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Restaurant</span>
                        <span className="font-medium">{formData.restaurantName || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Menu URL</span>
                        <span className="font-mono text-xs">/r/{formData.slug || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium">{PLANS.find(p => p.name === formData.plan)?.displayName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tables</span>
                        <span className="font-medium">{formData.tableCount}</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-muted/20 flex justify-between items-center">
            <Button variant="ghost" disabled={step === 1 || isSubmitting} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button 
              onClick={nextStep} 
              size="lg" 
              className="px-8"
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : step === 3 ? (
                "Complete Setup"
              ) : (
                <>Continue <ChevronRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
