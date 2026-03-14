import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, Link } from "wouter";
import bgImage from "@assets/generated_images/restaurant_interior_background.png";
import { Loader2, ChefHat, UserCircle, ShieldCheck, ArrowLeft, KeyRound, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

// ─── Forgot Password Sub-flow ─────────────────────────────────────────────────
type ForgotStep = "email" | "otp" | "newpass";

function ForgotPasswordPanel({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await api.post("/api/auth/send-otp", { email, purpose: "PASSWORD_RESET" });
      setStep("otp");
      toast.success("OTP sent! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.post<{ resetToken: string }>("/api/auth/verify-otp", {
        email,
        otp,
        purpose: "PASSWORD_RESET",
      });
      setResetToken(res.resetToken);
      setStep("newpass");
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/api/auth/reset-password", { email, resetToken, newPassword });
      toast.success("Password reset successfully! Please sign in.");
      onBack();
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = {
    email: { title: "Forgot Password", subtitle: "Enter your registered email to receive a reset code." },
    otp: { title: "Enter OTP", subtitle: `We sent a 6-digit code to ${email}` },
    newpass: { title: "New Password", subtitle: "Choose a strong new password for your account." },
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>

      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-heading font-bold tracking-tight">{stepTitles[step].title}</h2>
        </div>
        <p className="text-muted-foreground text-sm">{stepTitles[step].subtitle}</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1.5">
        {(["email", "otp", "newpass"] as ForgotStep[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              step === s || (step === "otp" && i < 2) || step === "newpass"
                ? "bg-primary"
                : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step 1: Email */}
      {step === "email" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fp-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="fp-email"
                type="email"
                placeholder="owner@restaurant.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                required
                className="h-11 pl-10 bg-muted/30"
                autoFocus
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11 font-bold" disabled={!email || isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Code"}
          </Button>
        </form>
      )}

      {/* Step 2: OTP */}
      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fp-otp">6-Digit Code</Label>
            <Input
              id="fp-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
              required
              className="h-11 text-center font-mono text-2xl tracking-[0.5em] bg-muted/30"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11 font-bold" disabled={otp.length !== 6 || isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Code"}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("email"); setOtp(""); setError(null); }}
            className="w-full text-sm text-center text-muted-foreground hover:text-foreground transition-colors"
          >
            Didn't receive it? Go back and resend
          </button>
        </form>
      )}

      {/* Step 3: New Password */}
      {step === "newpass" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fp-newpw">New Password</Label>
            <Input
              id="fp-newpw"
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
              required
              className="h-11 bg-muted/30"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fp-confirmpw">Confirm Password</Label>
            <Input
              id="fp-confirmpw"
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              required
              className="h-11 bg-muted/30"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11 font-bold" disabled={!newPassword || !confirmPassword || isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
          </Button>
        </form>
      )}
    </div>
  );
}

// ─── Main Login Page ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState(""); // email for ADMIN
  const [password, setPassword] = useState("");
  const [forgotMode, setForgotMode] = useState(false);

  // Staff credentials
  const [staffCodeDigits, setStaffCodeDigits] = useState("");
  const [staffPasscode, setStaffPasscode] = useState("");
  const [role, setRole] = useState<"ADMIN" | "WAITER" | "KITCHEN">("ADMIN");

  // Reset inputs when switching roles
  useEffect(() => {
    setStaffCodeDigits("");
    setStaffPasscode("");
    setForgotMode(false);
  }, [role]);
  const { login, staffLogin, isLoading: authLoading, user, isReady, restaurantId } = useAuth();
  const isLoading = authLoading;

  // Prevent login page flash if user is already restored from cache.
  useEffect(() => {
    if (!isReady) return;
    if (user) setLocation("/app");
  }, [isReady, user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (role === "ADMIN") {
        await login(identifier, password);
      } else {
        const prefix = role === "WAITER" ? "W-" : role === "KITCHEN" ? "K-" : "";
        let finalCode = staffCodeDigits;
        if (/^\d+$/.test(staffCodeDigits)) {
          finalCode = `${prefix}${staffCodeDigits}`;
        }
        await staffLogin(finalCode, staffPasscode);
      }

      toast.success(<span>Welcome back to Order<span className="text-primary">zi</span>!</span>);
      setLocation("/app");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8 bg-background relative z-10">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left-8 duration-500">

          {forgotMode ? (
            <ForgotPasswordPanel onBack={() => setForgotMode(false)} />
          ) : (
            <>
              <div className="space-y-4 text-center lg:text-left">
                <Link href="/">
                  <div className="inline-flex items-center gap-3 mb-6 cursor-pointer hover:opacity-90 transition-opacity">
                    <img src="/logo.png" alt="Orderzi Logo" className="w-12 h-12 lg:w-10 lg:h-10 object-contain drop-shadow-md" />
                    <div className="hidden sm:block text-3xl font-heading font-black tracking-tighter">
                      <span className="text-foreground dark:text-white">Order</span><span className="text-primary">zi</span>
                    </div>
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
                {role === "ADMIN" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="identifier">Email</Label>
                      <Input
                        id="identifier"
                        type="email"
                        placeholder="owner@restaurant.com"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        className="h-11 bg-muted/30"
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                       
                      </div>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 bg-muted/30"
                        placeholder="••••"
                      />
                       <button
                          type="button"
                          onClick={() => setForgotMode(true)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot password?
                        </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="staffCode">Staff Code</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground font-medium">
                          {role === "WAITER" ? "W-" : "K-"}
                        </div>
                        <Input
                          id="staffCode"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g. 1001"
                          value={staffCodeDigits}
                          onChange={(e) => {
                            const numericVal = e.target.value.replace(/\D/g, "");
                            setStaffCodeDigits(numericVal);
                          }}
                          required
                          className="h-11 bg-muted/30 pl-9"
                          autoCapitalize="none"
                          autoCorrect="off"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="staffPasscode">Passcode</Label>
                      <Input
                        id="staffPasscode"
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="••••"
                        value={staffPasscode}
                        onChange={(e) => setStaffPasscode(e.target.value)}
                        required
                        maxLength={6}
                        className="h-11 bg-muted/30"
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
                  disabled={
                    isLoading ||
                    (role === "ADMIN" ? !identifier || !password : !staffCodeDigits || !staffPasscode)
                  }
                >
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
            </>
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
