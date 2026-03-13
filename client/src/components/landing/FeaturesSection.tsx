import {
  QrCode, Smartphone, ChefHat, BarChart3, Users, Layers,
  Globe, ArrowRight, Monitor, ClipboardList
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import dashboardImg from "@/assets/images/dashboard.png";
import menuBuilderImg from "@/assets/images/menu-builder.png";
import liveOrdersImg from "@/assets/images/live-orders.png";
import liveMenuImg from "@/assets/images/livemenu.png";
import floorMapImg from "@/assets/images/floor-map.png";

const features = [
  {
    icon: QrCode,
    title: "QR Menu",
    description: "Guests scan and browse your menu in their language — no app download. Update prices and items in real-time.",
  },
  {
    icon: Smartphone,
    title: "Mobile POS",
    description: "Take orders at the table with any phone or tablet. Full menu, variants, modifiers, and instant sync to kitchen.",
  },
  {
    icon: ChefHat,
    title: "Kitchen KDS",
    description: "Real-time kitchen display system. No more shouting orders — clear tickets, item statuses, and timers.",
  },
  {
    icon: Monitor,
    title: "Floor Map & Tables",
    description: "Visual table management with real-time occupancy. Assign waiters, track statuses, and optimize seating.",
  },
  {
    icon: Users,
    title: "Queue Management",
    description: "Guests join the queue via QR, see live position and estimated wait time. No more crowded lobbies.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    description: "Revenue trends, top dishes, peak hours, table turnover — all in real-time on your dashboard.",
  },
];

const tabs = [
  { label: "Dashboard", image: dashboardImg },
  { label: "Menu Builder", image: menuBuilderImg },
  { label: "Live Orders", image: liveOrdersImg },
  { label: "Floor Map", image: floorMapImg },
];

export default function FeaturesSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      {/* ============ FEATURE GRID ============ */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-36 bg-white relative overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsla(352, 70%, 45%, 0.05) 0%, transparent 70%)" }}
        />

        <div className="container mx-auto px-4 sm:px-6">
          {/* Section header */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 sm:mb-16 md:mb-20"
          >
            <span className="inline-block px-4 py-1.5 bg-primary/[0.06] text-primary text-sm font-semibold rounded-full mb-4">
              Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-black tracking-tight text-foreground leading-tight">
              Everything You Need.{" "}
              <br className="hidden sm:block" />
              <span className="text-primary">One Platform.</span>
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              From the kitchen to the customer's phone, Orderzi handles every aspect of your restaurant operations.
            </p>
          </motion.div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="group relative p-6 sm:p-8 rounded-2xl bg-white border border-black/[0.06] hover:border-primary/20 hover:shadow-xl hover:shadow-primary/[0.04] transition-all duration-300 cursor-default"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/[0.07] flex items-center justify-center mb-5 group-hover:bg-primary/[0.12] transition-colors">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>

                  <h3 className="text-lg sm:text-xl font-heading font-bold text-foreground mb-2 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ PRODUCT SHOWCASE — TABBED SCREENSHOTS ============ */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-36 bg-[#fafafc] relative overflow-hidden border-t border-black/[0.04]">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-14"
          >
            <span className="inline-block px-4 py-1.5 bg-primary/[0.06] text-primary text-sm font-semibold rounded-full mb-4">
              See It In Action
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight text-foreground leading-tight">
              Built for Real{" "}
              <span className="text-primary">Restaurants</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              A glimpse into the tools that power thousands of restaurants every day.
            </p>
          </motion.div>

          {/* Tab buttons */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 cursor-pointer ${activeTab === i
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-white border border-black/[0.08] text-foreground hover:border-primary/30 hover:text-primary"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Screenshot viewer */}
          <motion.div
            key={activeTab}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-5xl mx-auto"
          >
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-black/[0.08] shadow-2xl shadow-black/[0.06] bg-white">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#f8f8fa] border-b border-black/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-md h-7 flex items-center px-3 text-xs text-muted-foreground font-mono border border-black/[0.06] max-w-sm mx-auto">
                    orderzi.com/{tabs[activeTab].label.toLowerCase().replace(/\s/g, "-")}
                  </div>
                </div>
              </div>
              <img
                src={tabs[activeTab].image}
                alt={`Orderzi ${tabs[activeTab].label}`}
                className="w-full"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
