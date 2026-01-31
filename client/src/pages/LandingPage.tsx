"use client"

import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Check, QrCode, Smartphone, Zap, BarChart3, Users, 
  Clock, ShieldCheck, Quote, Star, Sparkles, Play, 
  ChevronRight, MousePointer2, Layers, Globe, TrendingUp,
  ChefHat, Timer, Flame
} from "lucide-react";
import { Link } from "wouter";
import heroImage from "@/assets/images/hero-dashboard.png";
import testimonial1 from "@/assets/images/testimonial-1.jpg";
import testimonial2 from "@/assets/images/testimonial-2.jpg";
import testimonial3 from "@/assets/images/testimonial-3.jpg";
import food1 from "@/assets/images/food-indian-1.jpg";
import food2 from "@/assets/images/food-indian-2.jpg";
import food3 from "@/assets/images/food-indian-3.jpg";
import food4 from "@/assets/images/rooftop-indian.jpg";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const foodImages = [food1, food2, food3, food4];

export default function LandingPage() {
  const [currentFood, setCurrentFood] = useState(0);
  const targetRef = useRef(null);
  // const { scrollYProgress } = useScroll({
  //   target: targetRef,
  //   offset: ["start end", "end start"]
  // });

  // const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  // const scale = useTransform(scrollYProgress, [0, 0.2], [0.8, 1]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFood((prev) => (prev + 1) % foodImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 sm:pt-24 sm:pb-20 md:pt-28 md:pb-22 lg:pt-48 lg:pb-32 overflow-hidden bg-black text-white">
        {/* Urgent Background Elements */}
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,0,34,0.15),transparent_50%)]" />
        <motion.div 
          animate={{ x: [-10, 10, -10], y: [-10, 10, -10] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -left-40 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" 
        />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 sm:gap-16 md:gap-20">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="w-full lg:w-1/2 space-y-6 sm:space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 rounded-full bg-primary text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-[0_0_20px_rgba(255,0,34,0.5)]">
                <Flame className="w-3 h-3 fill-current" />
                <span>Food Business Management Software</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-heading font-black leading-[0.85] tracking-tighter uppercase">
                Digital <br />
                <span className="text-primary animate-pulse">Dining Era.</span>              </h1>
              
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 leading-relaxed max-w-xl font-medium border-l-4 sm:border-l-6 md:border-l-8 border-white pl-4 sm:pl-6 md:pl-8 italic">
               From instant billing to orders, inventory, queue management, QR-based Live Menu and mobile POS - everything your restaurant needs is one powerful system. </p>

              <div className="pt-2 sm:pt-4">
                <p className="text-lg sm:text-xl md:text-2xl text-white font-heading font-bold text-secondary">
                  Your Business, <span className="text-veg">Got Upgraded</span>
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto text-lg sm:text-xl md:text-2xl h-16 sm:h-20 md:h-24 px-8 sm:px-10 md:px-12 rounded-none bg-primary text-white font-black hover:bg-primary/90 transition-all active:scale-95 group uppercase tracking-tighter urgency-shadow">
                    Get Started NOW <ArrowRight className="ml-2 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg sm:text-xl md:text-2xl h-16 sm:h-20 md:h-24 px-8 sm:px-10 md:px-12 rounded-none border-2 sm:border-3 md:border-4 border-white text-white bg-transparent hover:bg-white hover:text-secondary transition-all font-black uppercase tracking-tighter group">
                    Live Demo <Play className="ml-2 w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                  </Button>
                </Link>
              </div>
              
              {/* <div className="pt-6 sm:pt-8 flex flex-wrap items-center gap-6 sm:gap-8">
                <div className="flex -space-x-2 sm:-space-x-3">
                  {[testimonial1, testimonial2, testimonial3].map((img, i) => (
                    <div key={i} className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-none border-2 sm:border-3 md:border-4 border-secondary overflow-hidden shadow-xl">
                      <img src={img} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300" />
                    </div>
                  ))}
                </div>
                <div className="space-y-0.5">
                  <div className="flex text-primary">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />)}
                  </div>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/60 italic">99.9% Speed Rating</p>
                </div>
              </div> */}
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: 50 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block w-full lg:w-1/2 relative"
            >
              <div className="relative rounded-none p-1 sm:p-2 bg-white shadow-[10px_10px_0px_0px_rgba(255,255,255,0.1)] sm:shadow-[15px_15px_0px_0px_rgba(255,255,255,0.1)] md:shadow-[20px_20px_0px_0px_rgba(255,255,255,0.1)]">
                <div className="relative overflow-hidden bg-background aspect-[4/3]">
                   <AnimatePresence mode="wait">
                    <motion.img 
                      key={currentFood}
                      src={foodImages[currentFood]}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </AnimatePresence>
                  
                  {/* High Intensity Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 md:p-8">
                     <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-veg p-4 sm:p-5 md:p-6 rounded-none text-white shadow-2xl relative overflow-hidden"
                     >
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                           <div className="flex items-center gap-2 sm:gap-3">
                              <Timer className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 animate-spin-slow" />
                              <p className="font-black uppercase tracking-tighter text-sm sm:text-base md:text-lg">Instant Order Sync</p>
                           </div>
                           <Badge className="bg-white text-primary border-0 font-black animate-pulse text-xs sm:text-sm">HOT</Badge>
                        </div>
                        <div className="h-1 w-full bg-white/20 mb-3 sm:mb-4">
                           <motion.div 
                             animate={{ width: ["0%", "100%"] }}
                             transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                             className="h-full bg-white" 
                           />
                        </div>
                        <p className="text-white/80 font-bold uppercase tracking-widest text-[8px] sm:text-[9px] md:text-[10px]">Processing Transaction #QX-092...</p>
                     </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Bar - High Contrast Static */}
      <section className="py-4 sm:py-6 md:py-8 bg-veg text-white overflow-hidden whitespace-nowrap">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-around gap-6 sm:gap-8 md:gap-10 lg:gap-12 font-black italic uppercase text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl tracking-tighter opacity-80">
            <span>Mumbai Rooftops</span>
            <span>Delhi Fine Dining</span>
            <span>Bangalore Cafes</span>
            <span>Goa Beach Clubs</span>
            <span>Cloud Kitchen Tech</span>
          </div>
        </div>
      </section>

      {/* Features Grid - Brutalist Urgency */}
      <section id="features" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-10 sm:gap-12 md:gap-16 lg:gap-20 items-start lg:items-end mb-12 sm:mb-16 md:mb-20 lg:mb-24">
            <div className="w-full lg:w-1/2">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-black leading-[0.9] tracking-tighter uppercase mb-4 sm:mb-6">
                Turbocharge <br /><span className="text-veg italic">Every Table.</span>
              </h2>
            </div>
            <div className="w-full lg:w-1/2">
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground font-bold leading-relaxed max-w-xl">
                Legacy systems are slowing you down. Qrave is built for the high-velocity world of modern dining.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-2 sm:border-3 md:border-4 border-secondary">
            <UrgencyFeatureCard 
              icon={<ChefHat className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10" />}
              title="Pan-India Ready"
              description="Built for every kitchen from Mumbai to Bangalore."
              delay={0}
            />
            <UrgencyFeatureCard 
              icon={<Smartphone className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10" />}
              title="GST Integrated"
              description="Compliant billing for Indian tax regulations."
              delay={0.1}
            />
            <UrgencyFeatureCard 
              icon={<BarChart3 className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10" />}
              title="Table Turnover"
              description="Maximize revenue during peak Indian dining hours."
              delay={0.2}
            />
            <UrgencyFeatureCard 
              icon={<ShieldCheck className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10" />}
              title="UPI Payments"
              description="Seamless scan-to-pay for every Indian customer."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Food Showcase - High Contrast Masonry */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-black text-white relative">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 md:gap-20 lg:gap-24 items-center">
             <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <img src={food1} className="w-full h-40 sm:h-52 md:h-64 lg:h-80 object-cover border border-white sm:border-2 urgency-shadow" />
                <img src={food2} className="w-full h-40 sm:h-52 md:h-64 lg:h-80 object-cover border border-white sm:border-2 mt-4 sm:mt-6 md:mt-8" />
                <img src={food3} className="w-full h-40 sm:h-52 md:h-64 lg:h-80 object-cover border border-white sm:border-2 -mt-4 sm:-mt-6 md:-mt-8" />
                <img src={food4} className="w-full h-40 sm:h-52 md:h-64 lg:h-80 object-cover border border-white sm:border-2" />
             </div>
             <div className="space-y-6 sm:space-y-8 md:space-y-10">
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-black leading-[0.9] tracking-tighter uppercase">
                  Feed the <br /><span className="text-primary italic">Hunger.</span>
                </h2>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/60 font-medium leading-relaxed">
                  Your menu should be as fast as your kitchen. Qrave provides a high-intensity visual experience that converts browsers into diners in seconds.
                </p>
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                   <div className="flex items-center gap-4 sm:gap-5 md:gap-6 p-4 sm:p-5 md:p-6 bg-white/5 border-l-4 sm:border-l-6 md:border-l-8 border-veg transition-all hover:bg-white/10">
                      <ChefHat className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-primary flex-shrink-0" />
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl font-black uppercase italic tracking-tighter">Optimized for Peak Performance</p>
                   </div>
                   <div className="flex items-center gap-4 sm:gap-5 md:gap-6 p-4 sm:p-5 md:p-6 bg-white/5 border-l-4 sm:border-l-6 md:border-l-8 border-veg transition-all hover:bg-white/10">
                      <Zap className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-primary flex-shrink-0" />
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl font-black uppercase italic tracking-tighter">Lightning Fast Load Speeds</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Testimonial - Brutalist Block */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-32 bg-veg text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
           <Quote className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-6 sm:mb-8 md:mb-10 fill-current opacity-20" />
           <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-heading font-black italic tracking-tighter mb-8 sm:mb-10 md:mb-12 uppercase leading-tight px-4">
             "Switching to Qrave was the fastest decision we ever made. The ROI was immediate. Don't think twice—just do it."
           </h3>
           <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-none border-2 sm:border-3 md:border-4 border-white shadow-2xl overflow-hidden grayscale">
                 <img src={testimonial1} className="w-full h-full object-cover" />
              </div>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-black uppercase tracking-widest">Vikram Sethi • Owner, Spice Garden Mumbai</p>
           </div>
        </div>
      </section>

      {/* CTA Section - The Final Urgency */}
      <section className="py-24 sm:py-32 md:py-40 lg:py-48 xl:py-60 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 animate-pulse" />
        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
           <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[12rem] font-heading font-black tracking-[0.05em] uppercase leading-[0.8] mb-8 sm:mb-10 md:mb-12">
             ACT <span className="text-primary italic">NOW.</span>
           </h2>
           <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/50 font-black uppercase tracking-widest mb-10 sm:mb-12 md:mb-16">The 1% are already here. Are you?</p>
           <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto h-20 sm:h-24 md:h-28 lg:h-32 px-10 sm:px-12 md:px-16 lg:px-20 text-xl sm:text-2xl md:text-3xl lg:text-4xl rounded-none bg-primary text-white font-black hover:scale-105 transition-all urgency-shadow shadow-primary/50 uppercase tracking-tighter">
                Deploy System <ArrowRight className="ml-2 sm:ml-3 md:ml-4 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
              </Button>
           </Link>
           <p className="mt-8 sm:mt-10 md:mt-12 text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] md:tracking-[0.5em] text-white/30">Limited Deployment Slots Available</p>
        </div>
      </section>
    </MarketingLayout>
  );
}

function UrgencyFeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-6 sm:p-8 md:p-10 lg:p-12 bg-white dark:bg-black border border-secondary sm:border-2 hover:bg-primary hover:text-white transition-all duration-300 group cursor-pointer"
    >
      <div className="mb-4 sm:mb-6 md:mb-8 text-primary group-hover:text-white transition-colors">{icon}</div>
      <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter mb-3 sm:mb-4">{title}</h3>
      <p className="text-sm sm:text-base md:text-lg font-bold opacity-60 group-hover:opacity-100 leading-tight">{description}</p>
    </motion.div>
  );
}

function StatCard({ icon, number, label, color }: { icon: React.ReactNode, number: string, label: string, color: string }) {
  return (
    <div className="p-8 sm:p-10 md:p-12 lg:p-16 border-2 sm:border-3 md:border-4 border-secondary text-center group hover:bg-primary transition-all duration-500">
      <div className={`mx-auto mb-6 sm:mb-8 md:mb-10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center border-2 sm:border-3 md:border-4 border-secondary ${color} group-hover:text-white group-hover:border-white transition-all`}>
        {icon}
      </div>
      <p className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-3 sm:mb-4 tracking-tighter uppercase ${color} group-hover:text-white transition-colors`}>{number}</p>
      <p className="text-muted-foreground font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] text-[9px] sm:text-[10px] group-hover:text-white/60 transition-colors">{label}</p>
    </div>
  );
}