import { useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { secureStorage } from "@/lib/secureStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ChevronRight, Store, CreditCard, Palette, Loader2, AlertCircle, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRazorpay } from "@/hooks/useRazorpay";

const STEPS = [
  { id: 1, title: "Account & Restaurant", icon: Store },
  { id: 2, title: "Choose Plan", icon: CreditCard },
  { id: 3, title: "Tables Setup", icon: Palette },
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
  const [createdData, setCreatedData] = useState<any>(null);

  // Email OTP verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const lastVerifiedEmail = useRef("");

  const queryClient = useQueryClient();

  const isRazorpayLoaded = useRazorpay();

  const { data: serverPlans } = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: async () => {
      const res = await api.get<any>("/api/subscriptions/plans");
      return res;
    }
  });

  const PLANS = [
    {
      name: "STARTER",
      displayName: "Starter Trial (7 Days)",
      price: serverPlans?.STARTER?.amount ? `₹${serverPlans.STARTER.amount}/mo` : "Free",
      features: [
        "Full System Access & Explore All Features",
        "Up to 5 Tables & 20 Menu Items",
        "Max 50 Transactions & 10 Active Queue Entries",
        "Kitchen & Waiter Access Included",
        "1-Time Usage Per Restaurant"
      ],
      popular: false
    },
    {
      name: "PRO",
      displayName: "Professional",
      price: serverPlans?.PRO?.amount ? `₹${serverPlans.PRO.amount}/mo` : "₹399/mo",
      features: [
        "Unlimited Tables, Menu Items & Transactions",
        "Basic Billing & Live Orders Dashboard",
        "Floor Map, Guest Queue & Analytics",
        "Menu Builder & QR Code Management",
        "Max 4 Admins Allowed"
      ],
      popular: false
    },
    {
      name: "MAX",
      displayName: "Maximum",
      price: serverPlans?.MAX?.amount ? `₹${serverPlans.MAX.amount}/mo` : "₹799/mo",
      features: [
        "Everything in Professional Plan",
        "Waiter App & Terminal Access",
        "Kitchen Display System (KDS)",
        "Full Inventory Management",
        "Unlimited Admins"
      ],
      popular: true
    }
  ];

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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (field: keyof OnboardingData, value: any) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      switch (field) {
        case 'fullName':
          if (!value.trim()) newErrors.fullName = "Full name is required";
          else delete newErrors.fullName;
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!value.trim()) newErrors.email = "Email is required";
          else if (!emailRegex.test(value)) newErrors.email = "Please enter a valid email address";
          else delete newErrors.email;
          break;
        case 'password':
          if (value.length < 6) newErrors.password = "Password must be at least 6 characters";
          else delete newErrors.password;
          break;
        case 'restaurantName':
          if (value.trim().length < 2) newErrors.restaurantName = "Restaurant name must be at least 2 characters";
          else delete newErrors.restaurantName;
          break;
        case 'slug':
          if (value.trim().length < 2) newErrors.slug = "URL handle must be at least 2 characters";
          else if (!/^[a-z0-9-]+$/.test(value)) newErrors.slug = "Slug must contain only lowercase letters, numbers, and hyphens";
          else delete newErrors.slug;
          break;
      }
      return newErrors;
    });
  };

  const handleChange = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
    // If email changes after verify, reset verified state
    if (field === 'email' && value !== lastVerifiedEmail.current) {
      setEmailVerified(false);
      setOtpSent(false);
      setOtpValue("");
      setOtpError(null);
    }
  };

  // Generate slug from restaurant name
  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  const handleRestaurantNameChange = (name: string) => {
    const slug = generateSlug(name);
    setFormData(prev => ({
      ...prev,
      restaurantName: name,
      slug,
    }));
    validateField('restaurantName', name);
    validateField('slug', slug);
  };

  // Validate current step
  const canProceed = () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.fullName || !formData.restaurantName || !formData.slug) return false;
      if (Object.keys(fieldErrors).length > 0) return false;
      if (!emailVerified) return false;
      return true;
    }
    if (step === 2) {
      return !!formData.plan;
    }
    return true;
  };

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      await api.post("/api/auth/send-otp", { email: formData.email, purpose: "EMAIL_VERIFY" });
      setOtpSent(true);
      toast.success("OTP sent! Check your inbox.");
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      await api.post("/api/auth/verify-otp", { email: formData.email, otp: otpValue, purpose: "EMAIL_VERIFY" });
      setEmailVerified(true);
      lastVerifiedEmail.current = formData.email;
      setOtpSent(false);
      setOtpValue("");
      toast.success("Email verified!");
    } catch (err: any) {
      setOtpError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let currentData = createdData;

      if (!currentData) {
        // Call the quick-start onboarding API
        const isNative = Capacitor.isNativePlatform();
        const response = await api.post<{
          success: boolean;
          user: { id: string; email: string; fullName: string; role: string };
          restaurant: { id: string; name: string; slug: string };
          token: string;
          refreshToken?: string;
          tables: unknown[];
          categories: unknown[];
        }>(isNative ? "/api/onboarding/quick-start?includeRefresh=true" : "/api/onboarding/quick-start", {
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
          language: navigator.language.split("-")[0] || "en",
        });

        if (isNative && response.refreshToken) {
          await secureStorage.set("orderzi_refresh_token", response.refreshToken);
        }

        // Update auth context with new user
        onboardingComplete({
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
          restaurant: response.restaurant,
        });

        currentData = response;
        setCreatedData(response);
      }

      if (formData.plan !== "STARTER") {
        if (!isRazorpayLoaded) {
          toast.error("Failed to load payment gateway. Continuing to dashboard...");
          setLocation("/dashboard");
          return;
        }

        try {
          setIsSubmitting(true);
          // Create order
          const order = await api.post<any>(`/api/subscriptions/${currentData.restaurant.id}/create-order`, { plan: formData.plan });



          // Open Razorpay Checkout
          const options = {
            key: order.keyId,
            amount: order.amount * 100,
            currency: order.currency,
            name: "Orderzi",
            description: `${formData.plan} Subscription`,
            order_id: order.razorpayOrderId,
            handler: async (paymentResponse: any) => {
              try {
                await api.post(`/api/subscriptions/${currentData.restaurant.id}/verify-payment`, {
                  razorpayOrderId: paymentResponse.razorpay_order_id,
                  razorpayPaymentId: paymentResponse.razorpay_payment_id,
                  razorpaySignature: paymentResponse.razorpay_signature,
                });
                toast.success(<span>Welcome to Order<span className="text-primary">zi</span>! Payment successful.</span>);
                setIsSubmitting(false);
                queryClient.invalidateQueries({ queryKey: ["subscription"] });
                setLocation("/dashboard");
              } catch (err: any) {
                toast.error(err.message || "Payment verification failed.");
                setIsSubmitting(false);
              }
            },
            prefill: {
              name: formData.fullName,
              email: formData.email,
            },
            theme: {
              color: "#0f172a",
            },
            modal: {
              ondismiss: () => {
                toast.error("Payment cancelled. You can complete it from the setup page or settings.");
                setIsSubmitting(false);
              },
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            toast.error(`Payment failed: ${response.error.description}`);
            setIsSubmitting(false);
          });
          rzp.open();
        } catch (err: any) {
          toast.error("Failed to initiate payment.");
          setIsSubmitting(false);
        }
      } else {
        toast.success(<span>Welcome to Order<span className="text-primary">zi</span>! Your restaurant is ready.</span>);
        setIsSubmitting(false);
        setLocation("/dashboard");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (!canProceed()) return;

    if (step < 3) {
      if (step === 2 && formData.plan === 'STARTER') {
        setFormData(prev => ({ ...prev, tableCount: 5 }));
      }
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
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        onBlur={() => validateField('fullName', formData.fullName)}
                        className={cn("h-11", fieldErrors.fullName && "border-destructive focus-visible:ring-destructive")}
                      />
                      {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium">Email Address *</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="email"
                            placeholder="john@restaurant.com"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            onBlur={() => validateField('email', formData.email)}
                            className={cn("h-11 pr-8", fieldErrors.email && "border-destructive focus-visible:ring-destructive", emailVerified && "border-green-500 focus-visible:ring-green-500")}
                            disabled={emailVerified}
                          />
                          {emailVerified && (
                            <ShieldCheck className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                          )}
                        </div>
                        {!emailVerified && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-11 px-3 whitespace-nowrap text-xs font-semibold"
                            disabled={!!fieldErrors.email || !formData.email || isSendingOtp}
                            onClick={handleSendOtp}
                          >
                            {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-3.5 h-3.5 mr-1" />Verify</>}
                          </Button>
                        )}
                      </div>
                      {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                      {emailVerified && (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Email verified
                        </p>
                      )}
                      {/* OTP input panel */}
                      {otpSent && !emailVerified && (
                        <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                          <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to <strong>{formData.email}</strong></p>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="000000"
                              value={otpValue}
                              onChange={(e) => { setOtpValue(e.target.value.replace(/\D/g, "")); setOtpError(null); }}
                              className="h-10 text-center font-mono text-lg tracking-widest"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-10 px-4"
                              disabled={otpValue.length !== 6 || isVerifyingOtp}
                              onClick={handleVerifyOtp}
                            >
                              {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                            </Button>
                          </div>
                          {otpError && <p className="text-xs text-destructive">{otpError}</p>}
                          <button type="button" onClick={handleSendOtp} className="text-xs text-primary hover:underline" disabled={isSendingOtp}>
                            Resend code
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium">Password *</Label>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => validateField('password', formData.password)}
                      className={cn("h-11 max-w-md", fieldErrors.password && "border-destructive focus-visible:ring-destructive")}
                    />
                    {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
                  </div>

                  <div className="border-t pt-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div className="space-y-2.5">
                        <Label className="text-sm font-medium">Restaurant Name *</Label>
                        <Input
                          placeholder="e.g. The Golden Spoon"
                          value={formData.restaurantName}
                          onChange={(e) => handleRestaurantNameChange(e.target.value)}
                          onBlur={() => validateField('restaurantName', formData.restaurantName)}
                          className={cn("h-11", fieldErrors.restaurantName && "border-destructive focus-visible:ring-destructive")}
                        />
                        {fieldErrors.restaurantName && <p className="text-xs text-destructive">{fieldErrors.restaurantName}</p>}
                      </div>
                      <div className="space-y-2.5">
                        <Label className="text-sm font-medium">URL Handle *</Label>
                        <div className={cn(
                          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 items-center transition-all",
                          fieldErrors.slug && "border-destructive focus-within:ring-destructive"
                        )}>
                          <span className="text-muted-foreground mr-1.5 font-medium select-none hidden sm:inline">order<span className="text-primary">zi</span>.app/r/</span>
                          <span className="text-muted-foreground mr-1.5 font-medium select-none sm:hidden">/r/</span>
                          <input
                            className="flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 text-sm font-medium w-full"
                            placeholder="golden-spoon"
                            value={formData.slug}
                            onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            onBlur={() => validateField('slug', formData.slug)}
                          />
                        </div>
                        {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
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
                <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto w-full">
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

                      <h3 className="font-bold text-lg mb-1 text-foreground">{plan.displayName}</h3>
                      <div className="text-2xl sm:text-3xl font-heading font-bold mb-4 text-foreground">{plan.price}</div>

                      <div className="h-px w-full bg-border mb-4" />

                      <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
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
                  <p className="text-muted-foreground">Set up your tables to generate your QR codes.</p>
                </div>
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-foreground">How many tables do you have?</Label>
                      {formData.plan === 'STARTER' && (
                         <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                           The Starter Trial plan includes a maximum of 5 tables. You can upgrade your plan later to add more.
                         </p>
                      )}
                      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
                        {formData.plan === 'STARTER' ? (
                            <button
                                type="button"
                                disabled
                                className="p-3 sm:p-4 rounded-xl border-2 font-bold text-base sm:text-lg bg-primary text-primary-foreground border-primary shadow-md opacity-100"
                            >
                              5
                            </button>
                        ) : [4, 6, 8, 10, 12, 16, 20, 24].map((count) => (
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
              ) : step === 1 && !emailVerified ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  Verify your email to continue <ShieldCheck className="w-4 h-4" />
                </div>
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
