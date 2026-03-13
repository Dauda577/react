import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { X, ChevronDown } from "lucide-react";

const WHATSAPP = "https://wa.me/233256221777";
const PHONE = "tel:+233256221777";

const faqs = [
  { q: "How do I buy a sneaker?", a: "Browse the shop, select a listing, choose your size and tap 'Buy Now'. Complete checkout with your delivery details." },
  { q: "How do I sell on SneakersHub?", a: "Create a seller account, then go to Account → Listings → New Listing. Fill in your sneaker details, upload a photo and publish." },
  { q: "How does delivery work?", a: "Sellers and buyers coordinate delivery directly. You can choose from available delivery methods at checkout." },
  { q: "Is my payment secure?", a: "Yes. Payments are processed securely via Paystack, a trusted payment provider across Africa." },
  { q: "Can I return a sneaker?", a: "Returns are handled between buyer and seller. We recommend confirming receipt only after you're satisfied with your order." },
  { q: "How do I contact support?", a: "Reach us on WhatsApp or call us directly using the links in the footer. We're available Mon–Sat, 8am–8pm." },
];

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.528 5.845L.057 23.428a.75.75 0 00.916.937l5.688-1.492A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.5-5.2-1.373l-.372-.22-3.853 1.011 1.029-3.764-.242-.389A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

const FAQModal = ({ onClose }: { onClose: () => void }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-background border border-border rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg font-bold tracking-tight">Frequently Asked Questions</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[70vh] divide-y divide-border">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-secondary/50 transition-colors gap-4"
              >
                <span className="text-sm font-medium">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const ContactModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-full max-w-sm bg-background border border-border rounded-2xl overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-display text-lg font-bold tracking-tight">Contact Us</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground mb-4">We're available Mon–Sat, 8am–8pm. Reach us via:</p>
        <a href={WHATSAPP} target="_blank" rel="noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-green-500/40 hover:bg-green-500/5 transition-all group">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <WhatsAppIcon />
          </div>
          <div>
            <p className="text-sm font-semibold group-hover:text-green-600 transition-colors">WhatsApp</p>
            <p className="text-xs text-muted-foreground">+233 25 622 1777</p>
          </div>
        </a>
        <a href={PHONE}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold group-hover:text-primary transition-colors">Phone Call</p>
            <p className="text-xs text-muted-foreground">+233 25 622 1777</p>
          </div>
        </a>
      </div>
    </motion.div>
  </motion.div>
);

const Footer = () => {
  const [showFAQ, setShowFAQ] = useState(false);
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      <AnimatePresence>
        {showFAQ && <FAQModal onClose={() => setShowFAQ(false)} />}
        {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      </AnimatePresence>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-t border-border mt-20"
      >
        <div className="section-padding max-w-7xl mx-auto py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tighter mb-4">
                Sneakers<span className="text-gradient">Hub</span>
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Premium sneakers for those who demand the best. Curated collections from top brands.
              </p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/5
                  text-sm font-medium text-green-600 hover:bg-green-500/10 hover:border-green-500/50 transition-all">
                <WhatsAppIcon />
                Chat on WhatsApp
              </a>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li><Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Shop</Link></li>
                  <li><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
                  <li>
                    <button onClick={() => setShowFAQ(true)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      FAQs
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setShowContact(true)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Contact
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4">Get in Touch</h4>
                <ul className="space-y-2">
                  <li>
                    <a href={WHATSAPP} target="_blank" rel="noreferrer"
                      className="text-sm text-muted-foreground hover:text-green-600 transition-colors flex items-center gap-1.5">
                      <WhatsAppIcon /> WhatsApp
                    </a>
                  </li>
                  <li>
                    <a href={PHONE} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      +233 25 622 1777
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© 2026 SneakersHub · Made in Ghana 🇬🇭</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </motion.footer>
    </>
  );
};

export default Footer;