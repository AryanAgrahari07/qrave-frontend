
import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, QrCode, Smartphone, Zap, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@assets/generated_images/saas_dashboard_hero_image.png";

export default function LandingPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Live Analytics & QR Generation
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-heading font-bold leading-tight text-foreground tracking-tight">
                The Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">Modern Dining.</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                Qrave helps restaurants streamline operations with beautiful QR menus, real-time analytics, and instant table management. No hardware required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth?signup=true">
                  <Button size="lg" className="text-lg px-8 py-6 rounded-xl shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1">
                    Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/r/gourmet-haven">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl border-2 hover:bg-muted/50">
                    View Demo Menu
                  </Button>
                </Link>
              </div>
              
              <div className="pt-8 flex items-center gap-8 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" /> No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" /> Set up in 5 minutes
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2 relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-background/50 backdrop-blur-xl group perspective-1000">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
                <img 
                  src={heroImage} 
                  alt="Dashboard Preview" 
                  className="w-full h-auto transform transition-transform duration-700 hover:scale-105"
                />
              </div>
              {/* Floating Elements */}
              <div className="absolute -bottom-8 -left-8 p-6 bg-background rounded-xl shadow-2xl border border-border animate-bounce duration-[3000ms]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Live Orders</p>
                    <p className="text-2xl font-bold font-heading">+24%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-4">Everything you need to run smarter.</h2>
            <p className="text-lg text-muted-foreground">Replace your clunky hardware with a sleek, software-first approach.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<QrCode className="w-8 h-8 text-primary" />}
              title="Smart QR Codes"
              description="Generate unique QR codes for each table. Track usage, update menus instantly, and never reprint paper again."
            />
            <FeatureCard 
              icon={<Smartphone className="w-8 h-8 text-purple-600" />}
              title="Mobile-First Menu"
              description="A beautiful, app-like experience for your customers without any downloads. Fast, responsive, and appetizing."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8 text-indigo-600" />}
              title="Real-time Analytics"
              description="Know your peak hours, most popular dishes, and table turnover rates. Make data-driven decisions."
            />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors shadow-sm hover:shadow-md group">
      <div className="mb-6 p-4 rounded-xl bg-muted group-hover:bg-primary/5 transition-colors inline-block">
        {icon}
      </div>
      <h3 className="text-xl font-bold font-heading mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
