import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, ShieldCheck, Zap, Star, ArrowRight, CreditCard, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K+`;
  return `${n}+`;
};

const About = () => {
  const [userCount, setUserCount] = useState<string>("—");
  const [listingCount, setListingCount] = useState<string>("—");

  const fetchCounts = async () => {
    // Total users (profiles table = one row per user)
    const { count: userCountData } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    
    if (userCountData !== null) setUserCount(formatCount(userCountData));

    // Total active listings
    const { count: listingCountData } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    
    if (listingCountData !== null) setListingCount(formatCount(listingCountData));
  };

  useEffect(() => {
    fetchCounts();

    // Set up realtime subscriptions for live updates
    const profilesChannel = supabase
      .channel('profiles-count')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'profiles' }, 
        () => fetchCounts()
      )
      .subscribe();

    const listingsChannel = supabase
      .channel('listings-count')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'listings' }, 
        () => fetchCounts()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listings' },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(listingsChannel);
    };
  }, []);

  const stats = [
    { value: userCount, label: "Happy Customers" },
    { value: listingCount, label: "Products Listed" },
    { value: "100%", label: "Authentic" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 section-padding max-w-4xl mx-auto pb-20" style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}>
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

        {/* Stats - Now with real-time updates */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-6 mt-16 "
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
              Submit a quick application and pay a one-time GHS 50 fee once approved. Unlock Paystack split payments — buyers pay you directly at checkout, no waiting for transfers.
            </p>
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              {
                icon: ShieldCheck,
                title: "Direct Paystack Split",
                desc: "95% of every sale goes straight to your MoMo or bank via Paystack. No waiting, no manual transfers.",
                color: "text-green-500 bg-green-500/10",
              },
              {
                icon: Star,
                title: "Verified Badge",
                desc: "A verified badge appears on all your listings and your seller profile, building instant trust with buyers.",
                color: "text-amber-500 bg-amber-500/10",
              },
              {
                icon: Zap,
                title: "More Sales",
                desc: "Verified sellers consistently get more orders because buyers feel safe paying via Paystack.",
                color: "text-primary bg-primary/10",
              },
              {
                icon: CreditCard,
                title: "One-Time GHS 50 Fee",
                desc: "Pay once via card or Mobile Money after approval. Your Paystack subaccount is created automatically.",
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
                {
                  step: "1",
                  icon: CheckCircle,
                  text: "Go to Account → Settings and tap 'Apply to Sell'. Fill in your store name, MoMo number, and location.",
                },
                {
                  step: "2",
                  icon: Clock,
                  text: "Our team reviews your application — usually within 1–2 business days. You'll be notified once approved.",
                },
                {
                  step: "3",
                  icon: CreditCard,
                  text: "Once approved, pay the GHS 50 one-time fee via card or Mobile Money to activate your verified seller account.",
                },
                {
                  step: "4",
                  icon: ShieldCheck,
                  text: "Your Paystack subaccount goes live instantly — start listing and receive payments directly at checkout.",
                },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{step}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              to="/account?tab=settings"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-green-500 hover:bg-green-600
                text-white font-display font-semibold text-sm transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
            >
              <ShieldCheck className="w-4 h-4" />
              Apply to Sell
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-muted-foreground mt-3">Free to apply · GHS 50 one-time fee on approval · No monthly charges</p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default About;