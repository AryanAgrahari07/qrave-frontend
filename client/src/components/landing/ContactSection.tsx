import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildUrl } from "@/lib/api";

export default function ContactSection() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ fullName: "", phoneNumber: "", restaurantName: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(buildUrl("/api/inquiries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      toast({ title: "Inquiry Sent!", description: "We'll get back to you within 24 hours.", variant: "default" });
      setFormData({ fullName: "", phoneNumber: "", restaurantName: "", message: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 sm:py-20 md:py-28 lg:py-36 bg-[#fafafc] border-t border-black/[0.04] relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsla(352, 70%, 45%, 0.06) 0%, transparent 70%)" }}
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-20 items-start">
          {/* Left — Info */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6 sm:space-y-8"
          >
            <div>
              <span className="inline-block px-4 py-1.5 bg-primary/[0.06] text-primary text-sm font-semibold rounded-full mb-4">
                Get In Touch
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-tight text-foreground leading-tight">
                Let's Build Your{" "}
                <span className="text-primary">Digital Restaurant</span>
              </h2>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
              Whether you need a custom enterprise solution or just want to learn how Orderzi can transform your venue, our team is ready to help.
            </p>

            <div className="space-y-4 pt-2">
              {[
                { icon: Mail, label: "support@orderzi.com", subtitle: "For technical queries" },
                { icon: Mail, label: "contact@orderzi.com", subtitle: "For business inquiries" },
                { icon: MapPin, label: "Mumbai, India", subtitle: "Serving restaurants nationwide" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ x: -10, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white border border-black/[0.05] hover:border-primary/15 hover:shadow-md transition-all"
                  >
                    <div className="w-11 h-11 rounded-lg bg-primary/[0.07] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm sm:text-base">{item.label}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right — Form */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-2xl border border-black/[0.06] shadow-xl shadow-black/[0.03]">
              <h3 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-6 sm:mb-8">
                Send an Inquiry
              </h3>
              <form className="space-y-4 sm:space-y-5" onSubmit={handleFormSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-xs sm:text-sm font-semibold text-foreground/70">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleFormChange}
                      className="w-full bg-[#fafafc] border border-black/[0.08] rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all text-sm sm:text-base"
                      placeholder="Rohit Singh"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phoneNumber" className="text-xs sm:text-sm font-semibold text-foreground/70">
                      Phone Number
                    </label>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleFormChange}
                      className="w-full bg-[#fafafc] border border-black/[0.08] rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all text-sm sm:text-base"
                      placeholder="+91 00000 00000"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="restaurantName" className="text-xs sm:text-sm font-semibold text-foreground/70">
                    Restaurant Name
                  </label>
                  <input
                    id="restaurantName"
                    name="restaurantName"
                    type="text"
                    value={formData.restaurantName}
                    onChange={handleFormChange}
                    className="w-full bg-[#fafafc] border border-black/[0.08] rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all text-sm sm:text-base"
                    placeholder="The Spice Garden"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-xs sm:text-sm font-semibold text-foreground/70">
                    Message <span className="text-muted-foreground">(Optional)</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    value={formData.message}
                    onChange={handleFormChange}
                    className="w-full bg-[#fafafc] border border-black/[0.08] rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none text-sm sm:text-base"
                    placeholder="Tell us about your requirements..."
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold bg-primary text-white hover:bg-primary/90 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit Inquiry
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
