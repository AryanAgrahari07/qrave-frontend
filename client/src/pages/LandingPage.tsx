"use client"

import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Sparkles, QrCode, ChefHat, BarChart3,
  Smartphone, Users, Clock, Shield, Zap, Star
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import dashboardImg from "@assets/../orderzi-video/public/screenshots/dashboard.png";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import React, { useState, useEffect, Suspense, lazy, useRef } from "react";

// Lazy-loaded sections for performance
const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const FoodShowcaseSection = lazy(() => import("@/components/landing/FoodShowcaseSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const ContactSection = lazy(() => import("@/components/landing/ContactSection"));

// Fallback skeleton for lazy sections
function SectionFallback() {
  return (
    <div className="w-full py-32 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
    </div>
  );
}



export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user, isReady } = useAuth();

  // Web instant launch: if already authenticated, jump straight into the app.
  useEffect(() => {
    if (!isReady) return;
    if (user) setLocation("/app");
  }, [isReady, user, setLocation]);

  return (
    <MarketingLayout>
      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-28 pb-20 sm:pt-32 sm:pb-24 md:pt-36 md:pb-28 lg:pt-44 lg:pb-36 overflow-hidden bg-[#080a10]">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(352, 70%, 45%, 0.15) 0%, transparent 70%)",
            }}
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(142, 71%, 45%, 0.1) 0%, transparent 70%)",
            }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left Content */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="w-full lg:w-1/2 space-y-6 sm:space-y-8 text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/70 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>AI-Powered Restaurant OS</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </span>
              </motion.div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-7xl font-heading font-black leading-[1.05] tracking-tight text-white">
                Your Restaurant,{" "}
                <br className="hidden sm:block" />
                <span className="relative">
                  <span className="bg-gradient-to-r from-primary via-red-400 to-primary bg-clip-text text-transparent">
                    Reimagined.
                  </span>
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/80 to-primary/20 rounded-full"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                  />
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg md:text-xl text-white/50 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                From QR menus to live kitchen displays, billing, queue management, and analytics — Orderzi is the all-in-one operating system built for modern Indian restaurants.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-2">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-base sm:text-lg h-13 sm:h-14 px-8 sm:px-10 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] group"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base sm:text-lg h-13 sm:h-14 px-8 sm:px-10 rounded-xl border-white/15 text-white bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 transition-all font-semibold backdrop-blur-sm"
                >
                  <QrCode className="mr-2 w-5 h-5 text-primary" />
                  Watch Demo
                </Button>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-[#080a10] bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-white/60 text-xs font-bold"
                    >
                      {["VS", "PR", "RD", "AK"][i - 1]}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-white/40">
                  <div className="flex items-center gap-1 text-amber-400/90">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-white/50 font-medium">Trusted by restaurants</span>
                </div>
              </div>
            </motion.div>

            {/* Right — Dashboard Screenshot */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="hidden lg:block w-full lg:w-1/2 relative"
            >
              <div className="relative">
                {/* Glow behind image */}
                <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-br from-primary/20 via-transparent to-green-500/10 rounded-3xl blur-2xl opacity-60" />

                {/* Dashboard mockup */}
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-[#0f1117]">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-white/[0.06] rounded-md h-6 flex items-center px-3 text-xs text-white/30 font-mono max-w-xs mx-auto">
                        orderzi.com/dashboard
                      </div>
                    </div>
                  </div>
                  <img
                    src={dashboardImg}
                    alt="Orderzi Dashboard — Real-time restaurant management"
                    className="w-full"
                    loading="eager"
                  />
                </div>

                {/* Floating notification card */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 shadow-xl hidden sm:flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-veg/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-veg" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">New Order #1847</p>
                    <p className="text-white/40 text-xs">Table T3 · Just now</p>
                  </div>
                </motion.div>

                {/* Floating stat card */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.6 }}
                  className="absolute -top-3 -right-3 sm:-top-5 sm:-right-5 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 shadow-xl hidden sm:block"
                >
                  <p className="text-white/40 text-xs font-medium mb-1">Today's Revenue</p>
                  <p className="text-white text-lg sm:text-xl font-bold font-heading">₹24,850</p>
                  <p className="text-veg text-xs font-semibold">↑ 18% vs yesterday</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>



      {/* ============ LAZY-LOADED SECTIONS ============ */}
      <Suspense fallback={<SectionFallback />}>
        <FeaturesSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <FoodShowcaseSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <TestimonialsSection />
      </Suspense>

      {/* ============ FINAL CTA SECTION ============ */}
      <section className="py-20 sm:py-28 md:py-36 bg-[#080a10] text-white relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(352, 70%, 45%, 0.12) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-black tracking-tight leading-tight mb-6">
              Ready to Transform{" "}
              <span className="bg-gradient-to-r from-primary via-red-400 to-primary bg-clip-text text-transparent">
                Your Restaurant?
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/40 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of restaurant owners who ditched paper chaos for digital calm. Set up in under 10 minutes. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base sm:text-lg h-14 sm:h-16 px-10 sm:px-14 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] group"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-base sm:text-lg h-14 sm:h-16 px-10 sm:px-14 rounded-xl border-white/15 text-white bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 transition-all font-semibold"
              >
                Book a Demo
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/25">No credit card · 14-day free trial · Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      <Suspense fallback={<SectionFallback />}>
        <ContactSection />
      </Suspense>
    </MarketingLayout>
  );
}