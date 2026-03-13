import { Star, Quote, ChefHat, TrendingUp, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import testimonial1 from "@/assets/images/testimonial-1.jpg";
import testimonial2 from "@/assets/images/testimonial-2.jpg";
import testimonial3 from "@/assets/images/testimonial-3.jpg";

const testimonials = [
  {
    img: testimonial1,
    name: "Vikram Sethi",
    role: "Owner, Spice Garden Mumbai",
    quote: "Switching to Orderzi was the best decision for our restaurant. Our table turnover improved 30% in the first month, and the KDS eliminated missed orders entirely.",
    rating: 5,
  },
  {
    img: testimonial2,
    name: "Priya Sharma",
    role: "Manager, Coastal Bites",
    quote: "The QR menu is a game-changer. Guests love browsing in their language, and our staff saves 20 minutes per shift not managing paper menus.",
    rating: 5,
  },
  {
    img: testimonial3,
    name: "Rahul Desai",
    role: "Chef-Owner, The Urban Wok",
    quote: "As a chef who also manages ops, the kitchen display system is a lifeline. Orders appear instantly — zero confusion, zero delays.",
    rating: 5,
  },
  {
    img: testimonial1,
    name: "Anita Roy",
    role: "Founder, Cafe Mocha",
    quote: "Our customers love scanning the QR and paying digitally. Billing errors dropped to nearly zero, and reconciliation takes minutes now.",
    rating: 5,
  },
];

const stats = [
  { icon: TrendingUp, value: "30%", label: "Faster Table Turns" },
  { icon: Clock, value: "< 2min", label: "Average Setup Time" },
  { icon: ChefHat, value: "0", label: "Missed Orders" },
  { icon: Users, value: "4.9★", label: "Customer Rating" },
];

export default function TestimonialsSection() {
  return (
    <>
      {/* ============ STATS BANNER ============ */}
      <section className="py-12 sm:py-16 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ y: 15, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="text-center text-white"
                >
                  <Icon className="w-6 h-6 mx-auto mb-2 text-white/60" />
                  <p className="text-2xl sm:text-3xl md:text-4xl font-heading font-black tracking-tight">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-white/60 font-medium mt-1">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-36 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <span className="inline-block px-4 py-1.5 bg-primary/[0.06] text-primary text-sm font-semibold rounded-full mb-4">
              Customer Love
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-black tracking-tight text-foreground leading-tight">
              Trusted by the{" "}
              <span className="text-primary">Best</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              Hear from restaurant owners who transformed their operations with Orderzi.
            </p>
          </motion.div>

          {/* Testimonial cards — horizontal scroll on mobile, grid on desktop */}
          <div className="w-full overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:overflow-visible">
            <div className="flex lg:grid lg:grid-cols-2 gap-4 sm:gap-6 w-max lg:w-auto px-0">
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="w-[85vw] sm:w-[420px] lg:w-auto snap-center flex-shrink-0 lg:flex-shrink p-6 sm:p-8 rounded-2xl bg-[#fafafc] border border-black/[0.05] hover:border-primary/15 hover:shadow-lg hover:shadow-primary/[0.03] transition-all duration-300 flex flex-col"
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-current" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-base sm:text-lg text-foreground/80 leading-relaxed mb-6 flex-1">
                    "{t.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 mt-auto">
                    <img
                      src={t.img}
                      alt={t.name}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground">{t.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
