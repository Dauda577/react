import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
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
            SNKRS was born from an obsession with footwear culture. We believe every pair of sneakers tells a story — of innovation, self-expression, and the relentless pursuit of excellence.
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
          {[
            { value: "50K+", label: "Happy Customers" },
            { value: "200+", label: "Brands" },
            { value: "100%", label: "Authentic" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="text-center p-6 rounded-2xl bg-card border border-border"
            >
              <p className="font-display text-3xl md:text-4xl font-bold text-gradient">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default About;