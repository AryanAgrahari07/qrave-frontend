
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronRight, Store, CreditCard, Palette } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Restaurant Details", icon: Store },
  { id: 2, title: "Choose Plan", icon: CreditCard },
  { id: 3, title: "Customize Theme", icon: Palette },
];

const PLANS = [
  { name: "Starter", price: "Free", features: ["10 Menu Items", "Basic QR", "Community Support"] },
  { name: "Pro", price: "$29/mo", features: ["Unlimited Items", "Custom Branding", "Analytics", "Priority Support"], popular: true },
  { name: "Enterprise", price: "$99/mo", features: ["Multi-location", "API Access", "Dedicated Account Manager"] },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [_, setLocation] = useLocation();
  const [formData, setFormData] = useState({ name: "", slug: "", plan: "", theme: "light" });

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
    else setLocation("/dashboard");
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
                  <h2 className="text-2xl font-heading font-bold">Tell us about your restaurant</h2>
                  <p className="text-muted-foreground">This information will be displayed on your public menu.</p>
                </div>
                <div className="max-w-md mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label>Restaurant Name</Label>
                    <Input placeholder="e.g. The Golden Spoon" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Handle</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">qrave.app/r/</span>
                      <Input placeholder="golden-spoon" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} />
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
                      <h3 className="font-bold text-xl mb-2">{plan.name}</h3>
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
                  <h2 className="text-2xl font-heading font-bold">Customize your look</h2>
                  <p className="text-muted-foreground">Match your brand identity.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                   <div className="space-y-4">
                      <Label>Primary Color</Label>
                      <div className="flex gap-4">
                        {['#4F46E5', '#E11D48', '#059669', '#D97706'].map(color => (
                          <button key={color} className="w-12 h-12 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <Label>Font Style</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg cursor-pointer hover:border-primary font-sans">Modern Sans</div>
                        <div className="p-4 border rounded-lg cursor-pointer hover:border-primary font-serif">Classic Serif</div>
                      </div>
                   </div>
                   {/* Preview */}
                   <div className="border rounded-2xl overflow-hidden shadow-2xl bg-white h-[300px] relative">
                      <div className="absolute top-0 w-full h-32 bg-slate-900" />
                      <div className="relative z-10 p-6 pt-20">
                         <div className="bg-white rounded-xl p-4 shadow-lg space-y-4">
                            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                            <div className="h-20 bg-slate-100 rounded animate-pulse" />
                            <div className="h-20 bg-slate-100 rounded animate-pulse" />
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-muted/20 flex justify-between items-center">
             <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>
               Back
             </Button>
             <Button onClick={nextStep} size="lg" className="px-8">
               {step === 3 ? "Complete Setup" : "Continue"} <ChevronRight className="ml-2 w-4 h-4" />
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
