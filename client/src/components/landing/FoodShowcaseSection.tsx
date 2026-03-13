import { QrCode, MousePointer, Utensils, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import food1 from "@/assets/images/food-indian-1.jpg";
import food2 from "@/assets/images/food-indian-2.jpg";
import food3 from "@/assets/images/food-indian-3.jpg";
import food4 from "@/assets/images/rooftop-indian.jpg";
import liveMenuImg from "@/assets/images/livemenu.png";

const steps = [
  {
    number: "01",
    icon: QrCode,
    title: "Scan the QR Code",
    description: "Place unique QR codes on each table. Guests scan with their phone camera — no app needed.",
    color: "bg-primary/[0.08] text-primary",
  },
  {
    number: "02",
    icon: MousePointer,
    title: "Browse & Customize",
    description: "A beautiful digital menu in their language. Filter by diet, view photos, customizations, and prices.",
    color: "bg-veg/[0.1] text-veg",
  },
  {
    number: "03",
    icon: Utensils,
    title: "Order & Enjoy",
    description: "Once decided, guests simply give their order to the waiter. Orders sync instantly to your KDS.",
    color: "bg-blue-500/[0.08] text-blue-600",
  },
];

export default function FoodShowcaseSection() {
  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-36 bg-[#080a10] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-center">
          {/* Left — Steps */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-2 lg:order-1"
          >
            <span className="inline-block px-4 py-1.5 bg-white/[0.06] text-white/60 text-sm font-semibold rounded-full mb-6 border border-white/[0.08]">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight leading-tight mb-4">
              From QR Scan to{" "}
              <span className="bg-gradient-to-r from-primary via-red-400 to-primary bg-clip-text text-transparent">
                Served Dish
              </span>
            </h2>
            <p className="text-base sm:text-lg text-white/40 mb-10 max-w-lg leading-relaxed">
              Three simple steps transform how your guests experience your restaurant.
            </p>

            <div className="space-y-6">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.5 }}
                    className="flex items-start gap-4 sm:gap-5 group"
                  >
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div className="pt-0.5">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-bold text-white/20 font-mono">{step.number}</span>
                        <h3 className="text-lg sm:text-xl font-heading font-bold text-white">{step.title}</h3>
                      </div>
                      <p className="text-sm sm:text-base text-white/40 leading-relaxed">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right — Live Menu Phone Mockup + Food Images */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2 relative"
          >
            <div className="relative flex justify-center">
              {/* Glow */}
              <div className="absolute -inset-8 bg-gradient-to-br from-primary/15 via-transparent to-veg/10 rounded-3xl blur-3xl opacity-40" />

              {/* Phone mockup */}
              <div className="relative w-[260px] sm:w-[300px] md:w-[320px] rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-2xl shadow-black/40 bg-black">
                {/* Phone top notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-xl z-10" />
                <img
                  src={liveMenuImg}
                  alt="Orderzi Live Menu — Guest-facing QR menu"
                  className="w-full"
                  loading="lazy"
                />
              </div>

              {/* Floating food images */}
              <motion.div
                initial={{ rotate: -6, x: -30, opacity: 0 }}
                whileInView={{ rotate: -6, x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-8 w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-white/10 shadow-xl hidden sm:block"
              >
                <img src={food1} className="w-full h-full object-cover" alt="" />
              </motion.div>

              <motion.div
                initial={{ rotate: 8, x: 30, opacity: 0 }}
                whileInView={{ rotate: 8, x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -top-4 -right-4 sm:-top-6 sm:-right-8 w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-white/10 shadow-xl hidden sm:block"
              >
                <img src={food3} className="w-full h-full object-cover" alt="" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
