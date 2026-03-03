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

export default function SubscriptionExpiredPage() {
    const { user, logout, restaurantId } = useAuth();
    const { subscription, refetch } = useSubscription();
    const isRazorpayLoaded = useRazorpay();
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const [isLoading, setIsLoading] = React.useState(false);

    const { data: serverPlans } = useQuery({
        queryKey: ["subscriptionPlans"],
        queryFn: async () => {
            const res = await api.get<any>("/api/subscriptions/plans");
            return res;
        }
    });

    const plans = [
        {
            id: "STARTER",
            name: "Starter",
            price: serverPlans?.STARTER?.amount || 1499,
            features: ["Up to 50 Tables", "Basic Analytics", "Email Support", "Digital Menu"],
            icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        },
        {
            id: "PRO",
            name: "Professional",
            price: serverPlans?.PRO?.amount || 3999,
            isPopular: true,
            features: ["Unlimited Tables", "Advanced Analytics", "Priority Support", "Digital Menu & KDS", "Staff Management"],
            icon: <Zap className="h-5 w-5 text-blue-500" />,
        },
        {
            id: "ENTERPRISE",
            name: "Enterprise",
            price: serverPlans?.ENTERPRISE?.amount || 7999,
            features: ["Multiple Locations", "Custom Integrations", "24/7 Phone Support", "White-label Options", "Dedicated Account Manager"],
            icon: <Crown className="h-5 w-5 text-purple-500" />,
        }
    ];

    const handleSubscribe = async (planId: string) => {
        if (!isRazorpayLoaded) {
            toast({
                variant: "destructive",
                title: "Payment Gateway Error",
                description: "Failed to load payment gateway. Please try again later.",
            });
            return;
        }

        try {
            setIsLoading(true);

            // 1. Create order
            const order = await api.post<any>(`/api/subscriptions/${restaurantId}/create-order`, { plan: planId });



            // 2. Open Razorpay Checkout
            const options = {
                key: order.keyId,
                amount: order.amount * 100,
                currency: order.currency,
                name: "Qrave",
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
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative">
            <Button
                variant="ghost"
                className="absolute top-4 left-4 md:top-8 md:left-8 text-gray-500 hover:text-gray-900"
                onClick={() => setLocation("/dashboard")}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Button>

            <div className="w-full max-w-4xl space-y-8 mt-8 md:mt-4">
                <div className="text-center space-y-4">
                    <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Subscription Expired
                    </h2>
                    <p className="max-w-xl mx-auto text-lg text-gray-500">
                        Your Qrave subscription for this restaurant has expired or is invalid. Please select a plan to renew and regain access to the portal.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col ${plan.isPopular ? "border-primary ring-1 ring-primary" : "border-gray-200"
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
                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                            </div>
                            <div className="mb-6">
                                <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
                                <span className="text-base font-medium text-gray-500">/mo</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" />
                                        <span className="text-sm text-gray-600">{feature}</span>
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
                    <Button variant="ghost" onClick={logout} className="text-gray-500">
                        Log out to switch accounts
                    </Button>
                </div>
            </div>
        </div>
    );
}
