import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Clock, Wallet, Users, Mail, AlertCircle,
  CheckCircle, FileText, CreditCard, Truck, MessageCircle,
  Home, ArrowLeft, BadgeCheck
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 section-padding max-w-4xl mx-auto pb-20" style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}>

        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Terms of <span className="text-gradient">Service</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Last updated: {new Date().toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {/* Last Updated Notice */}
        <div className="rounded-2xl border border-border bg-muted/20 p-4 mb-8">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Effective Date: {new Date().toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-xs text-muted-foreground mt-1">
                By using SneakersHub, you agree to these terms. Please read them carefully.
              </p>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-8">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" /> Table of Contents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {[
              "1. Acceptance of Terms",
              "2. Definitions",
              "3. Account Registration",
              "4. Buying on SneakersHub",
              "5. Selling on SneakersHub",
              "6. Payments & Fees",
              "7. Shipping & Delivery",
              "8. Returns & Refunds",
              "9. User Conduct",
              "10. Prohibited Items",
              "11. Intellectual Property",
              "12. Disclaimers",
              "13. Limitation of Liability",
              "14. Termination",
              "15. Governing Law",
              "16. Contact Information",
            ].map((item) => (
              <a key={item} href={`#section-${item.split('.')[0]}`} className="text-muted-foreground hover:text-primary transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section id="section-1" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">1.</span> Acceptance of Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Welcome to SneakersHub ("we," "our," or "us"). By accessing or using our website, mobile application, or any of our services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our platform.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. Your continued use of the platform after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">2.</span> Definitions
            </h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>"Platform"</strong> refers to SneakersHub website and mobile application.</li>
              <li>• <strong>"Buyer"</strong> refers to any user purchasing items on the platform.</li>
              <li>• <strong>"Seller"</strong> refers to any user listing items for sale on the platform.</li>
              <li>• <strong>"Listing"</strong> refers to any item posted for sale by a Seller.</li>
              <li>• <strong>"Order"</strong> refers to a purchase transaction between a Buyer and Seller.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">3.</span> Account Registration
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To access certain features, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-3 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be at least 18 years old or have parental consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for all activities that occur under your account.
            </p>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">4.</span> Buying on SneakersHub
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>When you purchase an item on our platform:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>You agree to pay the listed price plus any applicable fees</li>
                <li>You are responsible for providing accurate delivery information</li>
                <li>You must confirm receipt of items before funds are released to the Seller</li>
                <li>You have 14 days to confirm receipt after delivery</li>
                <li>Failure to confirm will result in automatic confirmation and fund release</li>
              </ul>
              <p className="mt-3">
                For verified sellers, payments are processed securely via Paystack. For unverified sellers, payment is arranged directly with the seller.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">5.</span> Selling on SneakersHub
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>As a Seller, you agree to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>List only authentic, legal items you have the right to sell</li>
                <li>Provide accurate descriptions and photos of your items</li>
                <li>Respond to buyer inquiries within 24 hours</li>
                <li>Ship items promptly after receiving payment confirmation</li>
                <li>Mark orders as "dispatched" only when actually shipped</li>
                <li>Accept responsibility for item authenticity and condition</li>
              </ul>
              <div className="mt-4 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <BadgeCheck className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-semibold text-green-600">Verification Program</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verified sellers pay a one-time GH₵ 50 fee. Benefits include a verified badge, Paystack split payments (95% to seller, 5% to SneakersHub), and increased buyer trust.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">6.</span> Payments & Fees
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <Wallet className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Commission Structure</p>
                  <p>SneakersHub takes a 5% commission on all sales from verified sellers. Official sellers may have different arrangements.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <CreditCard className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Payment Processing</p>
                  <p>For verified sellers, payments are split at checkout: 95% goes directly to the seller's MoMo/bank, settled next business day. SneakersHub keeps 5% automatically.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Listing Limits</p>
                  <p>Unverified sellers can create up to 20 listings total. Verified sellers have no listing limits.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">7.</span> Shipping & Delivery
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Sellers and buyers coordinate delivery directly. Delivery methods and costs are agreed upon between parties. Available options include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Pickup:</strong> Buyer collects item from seller's location</li>
              <li><strong>Delivery:</strong> Seller arranges delivery to buyer's address</li>
              <li><strong>Third-party logistics:</strong> Both parties can arrange external courier services</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Tracking numbers can be added by sellers for buyer visibility.
            </p>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">8.</span> Returns & Refunds
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Returns and refunds are handled between buyer and seller. We recommend:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Inspecting items before confirming receipt</li>
              <li>Communicating directly with the seller for any issues</li>
              <li>Only confirming receipt when satisfied with the item</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Once a buyer confirms receipt, funds are released to the seller and cannot be reversed. For disputed transactions, contact our support team.
            </p>
          </section>

          {/* Section 9 */}
          <section id="section-9" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">9.</span> User Conduct
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Post false, inaccurate, or misleading information</li>
              <li>Harass, abuse, or threaten other users</li>
              <li>Manipulate prices or interfere with other listings</li>
              <li>Use the platform for any illegal activity</li>
              <li>Circumvent our payment or fee structures</li>
              <li>Create multiple accounts for deceptive purposes</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section id="section-10" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">10.</span> Prohibited Items
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">The following items are prohibited:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Counterfeit or replica items</li>
              <li>Stolen goods</li>
              <li>Illegal substances or paraphernalia</li>
              <li>Weapons or ammunition</li>
              <li>Hazardous materials</li>
              <li>Items that violate third-party intellectual property rights</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section id="section-11" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">11.</span> Intellectual Property
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on SneakersHub, including logos, designs, text, graphics, and code, is our intellectual property and may not be used without permission. Sellers retain ownership of their listing content but grant us a license to display it on our platform.
            </p>
          </section>

          {/* Section 12 */}
          <section id="section-12" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">12.</span> Disclaimers
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              SneakersHub is a marketplace connecting buyers and sellers. We do not guarantee the quality, safety, or legality of items listed. We are not responsible for transactions between users. Our role is limited to facilitating the platform and, for verified sellers, payment processing.
            </p>
          </section>

          {/* Section 13 */}
          <section id="section-13" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">13.</span> Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, SneakersHub shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your use of our platform.
            </p>
          </section>

          {/* Section 14 */}
          <section id="section-14" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">14.</span> Termination
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account for violations of these Terms, fraudulent activity, or any conduct that harms our platform or users. You may delete your account at any time from account settings.
            </p>
          </section>

          {/* Section 15 */}
          <section id="section-15" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">15.</span> Governing Law
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.
            </p>
          </section>

          {/* Section 16 */}
          <section id="section-16" className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-primary">16.</span> Contact Information
            </h2>
            <div className="rounded-2xl border border-border p-6 bg-card">
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-primary" />
                  <a href="mailto:support@sneakershub.com" className="hover:text-primary transition-colors">
                    support@sneakershub.com
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <a href="https://wa.me/233256221777" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                    WhatsApp: +233 25 622 1777
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Acceptance Footer */}
        <div className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center">
          <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">By using SneakersHub, you acknowledge that you have read, understood, and agree to these Terms of Service.</p>
          <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfService;