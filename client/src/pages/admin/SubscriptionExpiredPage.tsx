import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Crown, Zap, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function SubscriptionExpiredPage() {
    const { user, logout, restaurantId } = useAuth();
    const { subscription, refetch } = useSubscription();
    const isRazorpayLoaded = useRazorpay();
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const [isLoading, setIsLoading] = React.useState(false);

    let isActive = false;
    let daysRemaining = 0;
    if (subscription?.subscriptionValidUntil) {
        const diff = new Date(subscription.subscriptionValidUntil).getTime() - new Date().getTime();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
        isActive = daysRemaining > 0;
    }

    const { data: serverPlans } = useQuery({
        queryKey: ["subscriptionPlans"],
        queryFn: async () => {
            const res = await api.get<any>("/api/subscriptions/plans");
            return res;
        }
    });

    const plans = [
        {
            id: "PRO",
            name: "Professional",
            price: serverPlans?.PRO?.amount || 700,
            isPopular: true,
            features: ["Unlimited Tables", "Advanced Analytics", "Priority Support", "Digital Menu & KDS", "Staff Management"],
            icon: <Zap className="h-5 w-5 text-blue-500" />,
        }
    ];

    if (subscription?.isEligibleForTrial) {
        plans.unshift({
            id: "STARTER",
            name: "Starter Trial (7 Days)",
            price: serverPlans?.STARTER?.amount || 0,
            features: ["Full System Access", "Explore All Features", "1-Time Usage Per Restaurant"],
            icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
            isPopular: false,
        });
    }

    const handleSubscribe = async (planId: string) => {
        try {
            setIsLoading(true);

            // 1. Create order
            const order = await api.post<any>(`/api/subscriptions/${restaurantId}/create-order`, { plan: planId });

            if (order.isFree) {
                toast({
                    title: "Trial Activated!",
                    description: order.message || "Your 7-day Starter trial is now active.",
                });
                await refetch();
                setLocation("/dashboard");
                return;
            }

            if (!isRazorpayLoaded) {
                toast({
                    variant: "destructive",
                    title: "Payment Gateway Error",
                    description: "Failed to load payment gateway. Please try again later.",
                });
                setIsLoading(false);
                return;
            }

            // 2. Open Razorpay Checkout
            const options = {
                key: order.keyId,
                amount: order.amount * 100,
                currency: order.currency,
                name: "Orderzi",
                description: `${planId} Subscription Renewal`,
                order_id: order.razorpayOrderId,
                handler: async (response: any) => {
                    try {
                        // 3. Verify Payment
                        await api.post(`/api/subscriptions/${restaurantId}/verify-payment`, {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });

                        toast({
                            title: "Payment Successful!",
                            description: "Your subscription has been renewed.",
                        });

                        // Refetch subscription status and redirect
                        await refetch();
                        setLocation("/dashboard");

                    } catch (err: any) {
                        toast({
                            variant: "destructive",
                            title: "Verification Failed",
                            description: err.message || "Could not verify payment.",
                        });
                    }
                },
                prefill: {
                    name: user?.fullName || "Restaurant Owner",
                    email: user?.email || "",
                },
                theme: {
                    color: "#0f172a", // slate-900
                },
                modal: {
                    ondismiss: () => {
                        setIsLoading(false);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                setIsLoading(false);
                toast({
                    variant: "destructive",
                    title: "Payment Failed",
                    description: response.error.description || "An error occurred during payment.",
                });
            });
            rzp.open();

        } catch (err: any) {
            setIsLoading(false);
            toast({
                variant: "destructive",
                title: "Failed to initiate payment",
                description: err.message || "An error occurred.",
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative">
            <Button
                variant="ghost"
                className="absolute top-4 left-4 md:top-8 md:left-8 text-gray-500 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground"
                onClick={() => setLocation("/dashboard")}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Button>

            <div className="w-full max-w-4xl space-y-8 mt-8 md:mt-4">
                <div className="text-center space-y-4">
                    <div className={cn("mx-auto h-16 w-16 rounded-full flex items-center justify-center", isActive ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30")}>
                        {isActive ? <Crown className="h-8 w-8 text-amber-600 dark:text-amber-500" /> : <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />}
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-foreground">
                        {isActive ? "Upgrade Plan" : "Subscription Expired"}
                    </h2>
                    <p className="max-w-xl mx-auto text-lg text-gray-500 dark:text-muted-foreground">
                        {isActive
                            ? `You currently have an active ${subscription?.plan} plan (${daysRemaining} days left). Choose a professional plan to permanently unlock all features or renew your access.`
                            : <span>Your Order<span className="text-primary">zi</span> subscription for this restaurant has expired or is invalid. Please select a plan to renew and regain access to the portal.</span>}
                    </p>
                </div>

                <div className={cn(
                    "grid grid-cols-1 gap-6 mx-auto pt-8",
                    plans.length === 1 ? "max-w-sm" : "md:grid-cols-2 max-w-3xl"
                )}>
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`bg-white dark:bg-card rounded-2xl shadow-sm border p-6 flex flex-col ${plan.isPopular ? "border-primary ring-1 ring-primary" : "border-gray-200 dark:border-border"
                                }`}
                        >
                            {plan.isPopular && (
                                <div className="flex justify-center -mt-10 mb-6">
                                    <span className="bg-primary text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                                        Most Popular
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center space-x-3 mb-4">
                                {plan.icon}
                                <h3 className="text-xl font-bold text-gray-900 dark:text-foreground">{plan.name}</h3>
                            </div>
                            <div className="mb-6">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-foreground">₹{plan.price}</span>
                                <span className="text-base font-medium text-gray-500 dark:text-muted-foreground">/mo</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" />
                                        <span className="text-sm text-gray-600 dark:text-card-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button
                                size="lg"
                                variant={plan.isPopular ? "default" : "outline"}
                                className="w-full"
                                disabled={isLoading}
                                onClick={() => handleSubscribe(plan.id)}
                            >
                                {isLoading ? "Processing..." : `Choose ${plan.name}`}
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="pt-8 text-center">
                    <Button variant="ghost" onClick={logout} className="text-gray-500 dark:text-muted-foreground">
                        Log out to switch accounts
                    </Button>
                </div>
            </div>
        </div>
    );
}
