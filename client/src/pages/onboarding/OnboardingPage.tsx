import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronRight, Store, CreditCard, Palette, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative">
      {/* Mobile/Tablet Back Button */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 lg:hidden z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => step > 1 ? setStep(step - 1) : setLocation('/auth')}
          className="rounded-full bg-background border shadow-sm hover:bg-accent"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="w-full max-w-5xl mt-12 sm:mt-0">
        {/* Progress */}
        <div className="mb-8 md:mb-12 max-w-3xl mx-auto px-4 sm:px-0">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10 rounded-full" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
            {STEPS.map((s) => (
              <div key={s.id} className={cn("flex flex-col items-center gap-2 transition-all", step >= s.id ? "text-primary" : "text-muted-foreground")}>
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all shadow-sm bg-background",
                  step >= s.id ? "text-primary border-primary ring-4 ring-primary/10" : "border-muted text-muted-foreground"
                )}>
                  {step > s.id ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                </div>
                <span className="text-xs sm:text-sm font-semibold hidden sm:block bg-background px-2">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-background border border-border/50 rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-6 sm:p-8 md:p-10 flex-1">
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">Create your account</h2>
                  <p className="text-muted-foreground">Set up your account and restaurant details to get started.</p>
                </div>
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium">Full Name *</Label>
                      <Input
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium">Email Address *</Label>
                      <Input
                        type="email"
                        placeholder="john@restaurant.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium">Password *</Label>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-11 max-w-md"
                    />
                  </div>

                  <div className="border-t pt-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div className="space-y-2.5">
                        <Label className="text-sm font-medium">Restaurant Name *</Label>
                        <Input
                          placeholder="e.g. The Golden Spoon"
                          value={formData.restaurantName}
                          onChange={(e) => handleRestaurantNameChange(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <Label className="text-sm font-medium">URL Handle *</Label>
                        <div className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 items-center transition-all">
                          <span className="text-muted-foreground mr-1.5 font-medium select-none hidden sm:inline">qrave.app/r/</span>
                          <span className="text-muted-foreground mr-1.5 font-medium select-none sm:hidden">/r/</span>
                          <input
                            className="flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 text-sm font-medium w-full"
                            placeholder="golden-spoon"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Restaurant Type</Label>
                      <div className="flex flex-wrap gap-2.5">
                        {RESTAURANT_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, type })}
                            className={cn(
                              "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                              formData.type === type
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background border-border hover:border-primary/50 hover:bg-muted"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col justify-center">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">Select a plan</h2>
                  <p className="text-muted-foreground">Scale as you grow. Start for free and upgrade anytime.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.name}
                      onClick={() => setFormData({ ...formData, plan: plan.name })}
                      className={cn(
                        "p-6 sm:p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative bg-background",
                        formData.plan === plan.name
                          ? "border-primary shadow-xl shadow-primary/5 scale-[1.02] md:scale-105 z-10"
                          : "border-border hover:border-primary/30 hover:shadow-md",
                      )}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                          <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm">
                            MOST POPULAR
                          </span>
                        </div>
                      )}

                      {formData.plan === plan.name && (
                        <div className="absolute top-4 right-4 text-primary">
                          <Check className="w-6 h-6" />
                        </div>
                      )}

                      <h3 className="font-bold text-xl mb-2 text-foreground">{plan.displayName}</h3>
                      <div className="text-3xl sm:text-4xl font-heading font-bold mb-6 text-foreground">{plan.price}</div>

                      <div className="h-px w-full bg-border mb-6" />

                      <ul className="space-y-4 text-sm text-muted-foreground">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <span className="leading-tight">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">Configure space</h2>
                  <p className="text-muted-foreground">Set up your tables and currency to generate your QR codes.</p>
                </div>
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-foreground">How many tables do you have?</Label>
                      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
                        {[4, 6, 8, 10, 12, 16, 20, 24].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setFormData({ ...formData, tableCount: count })}
                            className={cn(
                              "p-3 sm:p-4 rounded-xl border-2 font-bold text-base sm:text-lg transition-all duration-200",
                              formData.tableCount === count
                                ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                                : "bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted"
                            )}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Don't worry, you can always adjust this later from the Floor Map settings.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-foreground">Currency Symbol</Label>
                      <div className="flex flex-wrap gap-2.5 sm:gap-3">
                        {["₹", "$", "€", "£"].map((curr) => (
                          <button
                            key={curr}
                            type="button"
                            onClick={() => setFormData({ ...formData, currency: curr })}
                            className={cn(
                              "w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 font-bold text-xl transition-all duration-200 flex items-center justify-center",
                              formData.currency === curr
                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                : "bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted"
                            )}
                          >
                            {curr}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-muted/30 border rounded-2xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg border-b pb-4 mb-5">Setup Summary</h3>
                      <div className="space-y-4 text-sm flex-1">
                        <div className="flex justify-between items-center bg-background p-3 rounded-lg border shadow-sm">
                          <span className="text-muted-foreground">Restaurant</span>
                          <span className="font-semibold">{formData.restaurantName || "Not set"}</span>
                        </div>
                        <div className="flex justify-between items-center bg-background p-3 rounded-lg border shadow-sm">
                          <span className="text-muted-foreground">Menu URL</span>
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded truncate max-w-[130px] sm:max-w-[200px]">
                            /r/{formData.slug || "not-set"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-background p-3 rounded-lg border shadow-sm">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-semibold tracking-wider text-xs">
                            {PLANS.find(p => p.name === formData.plan)?.displayName}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-background p-3 rounded-lg border shadow-sm">
                          <span className="text-muted-foreground">Tables</span>
                          <span className="font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                            {formData.tableCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 flex items-start gap-3 mt-4">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium leading-tight">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 bg-muted/30 border-t flex flex-col-reverse sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center mt-auto">
            <Button
              variant="outline"
              className={cn(
                "h-12 px-6 rounded-xl font-medium w-full sm:w-auto",
                step === 1 && "sm:opacity-0 sm:pointer-events-none"
              )}
              disabled={step === 1 || isSubmitting}
              onClick={() => setStep(step - 1)}
            >
              Go Back
            </Button>

            <Button
              onClick={nextStep}
              className="h-12 px-8 rounded-xl font-medium w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Creating workspace...
                </div>
              ) : step === 3 ? (
                "Complete Setup & Enter Dashboard"
              ) : (
                <div className="flex items-center">
                  Continue to next step <ChevronRight className="ml-2 w-5 h-5" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
