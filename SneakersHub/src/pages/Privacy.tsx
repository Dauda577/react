import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-32 pb-20">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">Legal</p>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm text-muted-foreground leading-relaxed">

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">1. Who We Are</h2>
            <p>
              SneakersHub is an online marketplace for buying and selling sneakers in Ghana, accessible at{" "}
              <a href="https://sneakershub.site" className="text-primary underline underline-offset-2">sneakershub.site</a>.
              We connect buyers and sellers across Ghana in a safe, trusted environment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">2. Information We Collect</h2>
            <p>We collect the following information when you use SneakersHub:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><span className="text-foreground font-medium">Account information</span> — name, email address, and password when you register</li>
              <li><span className="text-foreground font-medium">Profile information</span> — phone number, city, and region you provide</li>
              <li><span className="text-foreground font-medium">Listing data</span> — photos, descriptions, and prices of sneakers you list for sale</li>
              <li><span className="text-foreground font-medium">Order information</span> — delivery address, order history, and transaction records</li>
              <li><span className="text-foreground font-medium">Payment details</span> — MoMo number and account name for seller payouts (processed securely via Paystack)</li>
              <li><span className="text-foreground font-medium">Messages</span> — communications between buyers and sellers on the platform</li>
              <li><span className="text-foreground font-medium">Device & usage data</span> — browser type, IP address, and how you interact with our site</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Operate and improve the SneakersHub marketplace</li>
              <li>Process orders and facilitate payments between buyers and sellers</li>
              <li>Send you order confirmations, SMS notifications, and account alerts</li>
              <li>Verify seller identities and prevent fraud</li>
              <li>Respond to your support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">4. Sharing Your Information</h2>
            <p>We do not sell your personal data. We share information only in the following cases:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><span className="text-foreground font-medium">With buyers/sellers</span> — delivery address and contact details are shared between parties to complete an order</li>
              <li><span className="text-foreground font-medium">Paystack</span> — payment processing and seller subaccount creation. Governed by <a href="https://paystack.com/privacy" className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">Paystack's Privacy Policy</a></li>
              <li><span className="text-foreground font-medium">Supabase</span> — our database and authentication provider. Data is stored securely on Supabase infrastructure</li>
              <li><span className="text-foreground font-medium">Legal requirements</span> — if required by law or to protect the rights and safety of our users</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">5. Google Sign-In</h2>
            <p>
              We offer sign-in via Google. When you use Google Sign-In, we receive your name, email address, and profile photo from Google.
              We do not receive your Google password. Your use of Google Sign-In is also governed by{" "}
              <a href="https://policies.google.com/privacy" className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">6. Data Storage & Security</h2>
            <p>
              Your data is stored on Supabase's secure cloud infrastructure. We use industry-standard encryption for data in transit (HTTPS)
              and at rest. Passwords are hashed and never stored in plain text. Payment information is handled entirely by Paystack and
              never stored on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate information in your profile</li>
              <li>Delete your account and associated data at any time via Account → Settings → Delete Account</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">8. Cookies</h2>
            <p>
              We use essential cookies and local storage to keep you logged in and remember your preferences (such as dark/light mode).
              We do not use third-party advertising cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">9. Children's Privacy</h2>
            <p>
              SneakersHub is not intended for users under the age of 13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the site
              or sending you an email. Continued use of SneakersHub after changes constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-base text-foreground">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or how we handle your data, contact us at:{" "}
              <a href="mailto:daudakassim577@gmail.com" className="text-primary underline underline-offset-2">daudakassim577@gmail.com</a>
            </p>
          </section>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;