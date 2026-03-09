import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, ShieldCheck, Zap, Star, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

const VERIFY_WHATSAPP = "https://wa.me/233256221777?text=Hi%2C%20I%27d%20like%20to%20get%20verified%20as%20a%20seller%20on%20SneakersHub.%20My%20account%20email%20is%3A%20";

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K+`;
  return `${n}+`;
};

const About = () => {
  const [userCount, setUserCount] = useState<string>("—");
  const [listingCount, setListingCount] = useState<string>("—");

  useEffect(() => {
    // Total users (profiles table = one row per user)
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (count !== null) setUserCount(formatCount(count));
      });

    // Total active listings
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .then(({ count }) => {
        if (count !== null) setListingCount(formatCount(count));
      });
  }, []);

  const stats = [
    { value: userCount, label: "Happy Customers" },
    { value: listingCount, label: "Products Listed" },
    { value: "100%", label: "Authentic" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 section-padding max-w-4xl mx-auto pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-4">Our Story</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Passion for <span className="text-gradient">Sneakers</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 text-muted-foreground leading-relaxed text-lg"
        >
          <p>
            Sneakers Hub was born from an obsession with footwear culture. We believe every pair of sneakers tells a story — of innovation, self-expression, and the relentless pursuit of excellence.
          </p>
          <p>
            Our team hand-picks every product in our collection, ensuring authenticity and quality that meets the highest standards. From performance runners to timeless classics, we curate for those who appreciate craft.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-6 mt-16"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="text-center p-6 rounded-2xl bg-card border border-border"
            >
              <p className="font-display text-3xl md:text-4xl font-bold text-gradient">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Get Verified Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">For Sellers</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Become a <span className="text-gradient">Verified Seller</span>
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Get the verified badge and unlock escrow-protected payments. Buyers trust verified sellers more — and are more willing to buy.
            </p>
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              {
                icon: ShieldCheck,
                title: "Escrow Protection",
                desc: "Buyers pay SneakersHub directly. Funds are released to you after delivery is confirmed.",
                color: "text-green-500 bg-green-500/10",
              },
              {
                icon: Star,
                title: "Verified Badge",
                desc: "A ✅ badge appears on all your listings and your seller profile, building instant trust.",
                color: "text-amber-500 bg-amber-500/10",
              },
              {
                icon: Zap,
                title: "More Sales",
                desc: "Verified sellers consistently get more orders because buyers feel safe purchasing from them.",
                color: "text-primary bg-primary/10",
              },
              {
                icon: CheckCircle,
                title: "Free to Apply",
                desc: "Verification is completely free. Just message us on WhatsApp and we'll review your account.",
                color: "text-blue-500 bg-blue-500/10",
              },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-display font-semibold text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* How it works */}
          <div className="rounded-2xl border border-border bg-card p-6 mb-8">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5">How it works</p>
            <div className="space-y-4">
              {[
                { step: "1", text: "Message us on WhatsApp with your account email" },
                { step: "2", text: "We review your account and listings (usually within 24hrs)" },
                { step: "3", text: "We flip your verified status — your badge appears immediately" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{step}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <a
              href={VERIFY_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-green-500 hover:bg-green-600
                text-white font-display font-semibold text-sm transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.528 5.845L.057 23.428a.75.75 0 00.916.937l5.688-1.492A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.5-5.2-1.373l-.372-.22-3.853 1.011 1.029-3.764-.242-.389A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Apply for Verification on WhatsApp
              <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-xs text-muted-foreground mt-3">Free · Usually approved within 24 hours</p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default About;