import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { X, ChevronDown, Mail, MapPin, Clock, Instagram, Twitter, Heart } from "lucide-react";

const WHATSAPP = "https://wa.me/233256221777";
const PHONE = "tel:+233256221777";
const EMAIL = "mailto:support@sneakershub.com";

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

const TikTokIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <h2 className="font-display text-lg font-bold tracking-tight">Frequently Asked Questions</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[70vh] divide-y divide-border">
          {faqs.map((faq, i) => (
            <div key={i} className="group">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors gap-4"
              >
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180 text-primary" : ""}`} />
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
                    <p className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
                      {faq.a}
                    </p>
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <h2 className="font-display text-lg font-bold tracking-tight">Contact Us</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground text-center">We're available Mon–Sat, 8am–8pm</p>
        
        <a href={WHATSAPP} target="_blank" rel="noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-green-500/40 hover:bg-green-500/5 transition-all group">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
            <WhatsAppIcon />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold group-hover:text-green-600 transition-colors">WhatsApp</p>
            <p className="text-xs text-muted-foreground">Fastest response · Usually within minutes</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:translate-x-1 transition-transform" />
        </a>

        <a href={PHONE}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold group-hover:text-primary transition-colors">Phone Call</p>
            <p className="text-xs text-muted-foreground">+233 25 622 1777</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:translate-x-1 transition-transform" />
        </a>

        <a href={EMAIL}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
            <Mail className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold group-hover:text-blue-600 transition-colors">Email</p>
            <p className="text-xs text-muted-foreground">support@sneakershub.com</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>
    </motion.div>
  </motion.div>
);

const Footer = () => {
  const [showFAQ, setShowFAQ] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/sneakershub567?igsh=eXd2eng4anN3ZDIz&utm_source=qr", label: "Instagram" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: TikTokIcon, href: "https://www.tiktok.com/@.boy_spyce?is_from_webapp=1&sender_device=pc", label: "TikTok" },
  ];

  return (
    <>
      <AnimatePresence>
        {showFAQ && <FAQModal onClose={() => setShowFAQ(false)} />}
        {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      </AnimatePresence>

      <footer className="border-t border-border mt-20 bg-gradient-to-b from-background to-muted/20">
        <div className="section-padding max-w-7xl mx-auto py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <Link to="/" className="inline-block mb-4">
                <h3 className="font-display text-2xl font-bold tracking-tighter bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  SneakersHub
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Premium sneakers for those who demand the best. Curated collections from top brands across Africa.
              </p>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all hover:scale-110"
                    aria-label={social.label}
                  >
                    {typeof social.icon === 'function' ? <social.icon /> : <social.icon className="w-4 h-4" />}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-foreground">
                Quick Links
              </h4>
              <ul className="space-y-2">
                {[
                  { to: "/shop", label: "Shop" },
                  { to: "/featured", label: "Featured" },
                  { to: "/about", label: "About Us" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group">
                      <span className="w-0 group-hover:w-1.5 h-0.5 bg-primary rounded-full transition-all duration-200" />
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button onClick={() => setShowFAQ(true)} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group">
                    <span className="w-0 group-hover:w-1.5 h-0.5 bg-primary rounded-full transition-all duration-200" />
                    FAQs
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowContact(true)} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group">
                    <span className="w-0 group-hover:w-1.5 h-0.5 bg-primary rounded-full transition-all duration-200" />
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-foreground">
                Contact Info
              </h4>
              <ul className="space-y-3">
                <li>
                  <a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-green-600 transition-colors group">
                    <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                      <WhatsAppIcon />
                    </div>
                    <span>Chat on WhatsApp</span>
                  </a>
                </li>
                <li>
                  <a href={PHONE} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors group">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z"/>
                      </svg>
                    </div>
                    <span>+233 25 622 1777</span>
                  </a>
                </li>
                <li>
                  <a href={EMAIL} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-blue-600 transition-colors group">
                    <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span>support@sneakershub.com</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Hours & Location */}
            <div>
              <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-foreground">
                Info
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Mon–Sat: 8am–8pm<br />Sun: Closed</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Accra, Ghana</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              © {currentYear} SneakersHub · Made with
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              in Ghana 🇬🇭
            </span>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <button onClick={() => setShowFAQ(true)} className="hover:text-foreground transition-colors">FAQ</button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;