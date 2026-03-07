import { motion } from "framer-motion";

const Footer = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="border-t border-border mt-20"
    >
      <div className="section-padding max-w-7xl mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tighter mb-4">
              Sneakers<span className="text-gradient">Hub</span>
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium sneakers for those who demand the best. Curated collections from top brands.
            </p>
          </div>
          {[
            { title: "Shop", links: ["New Arrivals", "Running", "Lifestyle", "Basketball"] },
            { title: "Support", links: ["FAQs", "Shipping", "Returns", "Size Guide"] },
            { title: "Company", links: ["About Us", "Careers", "Press", "Contact"] },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="font-display font-semibold text-sm uppercase tracking-wider mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-10 pt-6 text-center text-xs text-muted-foreground">
          © 2026 Sneakers Hub. All rights reserved.
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;