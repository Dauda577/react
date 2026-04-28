import { useEffect, useState } from "react";

const sections = [
    {
        number: "01",
        title: "Platform Overview",
        content:
            "SneakersHub is an independent peer-to-peer resale marketplace. We provide a platform for individuals to buy and sell sneakers they personally own. SneakersHub does not source, manufacture, stock, or directly sell any products listed on this platform. We are not affiliated with, endorsed by, or partnered with Nike, Adidas, Timberland, New Balance, Puma, or any other brand whose products may appear on the platform.",
    },
    {
        number: "02",
        title: "Seller Eligibility",
        content:
            "To list on SneakersHub, you must be the rightful owner of the item you are listing. By creating a listing, you confirm that you acquired the item through legitimate means — such as purchase from an authorized retailer, another individual, or a licensed reseller — and that you have the full legal right to sell it.",
    },
    {
        number: "03",
        title: "Authenticity Requirement",
        content:
            "All items listed on SneakersHub must be 100% authentic. Listing counterfeit, replica, or unauthorized reproductions of branded products is strictly prohibited and will result in immediate account suspension and removal of all listings. SneakersHub reserves the right to require proof of authenticity at any time.",
    },
    {
        number: "04",
        title: "Accurate Representation",
        content:
            "Sellers are required to accurately describe their items, including condition (new, used, worn), size, colorway, and any defects or signs of wear. Photos must be of the actual item being sold. Misleading descriptions or photos are a violation of this policy and may result in account termination and liability for any resulting disputes.",
    },
    {
        number: "05",
        title: "Prohibited Listings",
        content:
            "The following are prohibited on SneakersHub: counterfeit or fake items, stolen goods, items with removed or altered brand labels, items that violate any applicable laws or regulations, and any item the seller does not personally own. SneakersHub will remove any listing that violates this policy without prior notice.",
    },
    {
        number: "06",
        title: "Seller Responsibility",
        content:
            "Sellers are solely responsible for the accuracy, legality, and authenticity of their listings. SneakersHub acts only as an intermediary platform and bears no liability for disputes arising from seller misrepresentation. By listing on this platform, sellers agree to indemnify SneakersHub against any claims, losses, or damages resulting from their listings or conduct.",
    },
    {
        number: "07",
        title: "Brand Disclaimer",
        content:
            "Brand names, logos, and trademarks such as Nike®, Adidas®, Timberland®, and others are the property of their respective owners. Their appearance on this platform reflects secondary market resale by individual sellers and does not imply any affiliation, sponsorship, or endorsement of SneakersHub by those brands.",
    },
    {
        number: "08",
        title: "Policy Enforcement",
        content:
            "SneakersHub reserves the right to remove any listing, suspend any account, or take any other action deemed necessary to ensure compliance with this policy. Repeated or serious violations may be reported to relevant authorities. This policy may be updated at any time and continued use of the platform constitutes acceptance of the current policy.",
    },
];

export default function SellerPolicy() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    return (
        <div style={styles.root}>
            {/* Background texture */}
            <div style={styles.bgNoise} />

            {/* Nav bar */}
            <nav style={styles.nav}>
                <span style={styles.navLogo}>SNEAKERSHUB</span>
                <span style={styles.navTag}>GH</span>
            </nav>

            {/* Hero */}
            <header
                style={{
                    ...styles.hero,
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(20px)",
                    transition: "opacity 0.7s ease, transform 0.7s ease",
                }}
            >
                <p style={styles.heroEyebrow}>Legal · Marketplace Rules</p>
                <h1 style={styles.heroTitle}>Seller Policy</h1>
                <p style={styles.heroSub}>
                    Rules that keep SneakersHub authentic, fair, and trusted.
                </p>
                <div style={styles.heroDivider} />
                <p style={styles.heroDate}>Effective: April 2025 · Ghana</p>
            </header>

            {/* Sections */}
            <main style={styles.main}>
                {sections.map((s, i) => (
                    <article
                        key={s.number}
                        style={{
                            ...styles.section,
                            opacity: visible ? 1 : 0,
                            transform: visible ? "translateY(0)" : "translateY(30px)",
                            transition: `opacity 0.6s ease ${0.15 + i * 0.07}s, transform 0.6s ease ${0.15 + i * 0.07}s`,
                        }}
                    >
                        <div style={styles.sectionLeft}>
                            <span style={styles.sectionNumber}>{s.number}</span>
                        </div>
                        <div style={styles.sectionRight}>
                            <h2 style={styles.sectionTitle}>{s.title}</h2>
                            <p style={styles.sectionBody}>{s.content}</p>
                        </div>
                    </article>
                ))}
            </main>

            {/* Footer */}
            <footer style={styles.footer}>
                <div style={styles.footerInner}>
                    <span style={styles.footerLogo}>SNEAKERSHUB</span>
                    <p style={styles.footerText}>
                        SneakersHub is an independent resale marketplace and is not
                        affiliated with any sneaker brand. All trademarks belong to their
                        respective owners.
                    </p>
                    <p style={styles.footerContact}>
                        Questions? Contact us at{" "}
                        <a href="mailto:support@sneakershub.site" style={styles.footerLink}>
                            support@sneakershub.site
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    root: {
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#f0ece4",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        position: "relative",
        overflowX: "hidden",
    },
    bgNoise: {
        position: "fixed",
        inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.4,
        pointerEvents: "none",
        zIndex: 0,
    },
    nav: {
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 40px",
        borderBottom: "1px solid rgba(240,236,228,0.08)",
        backgroundColor: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(12px)",
    },
    navLogo: {
        fontSize: "13px",
        fontFamily: "'Arial Narrow', 'Arial', sans-serif",
        fontWeight: 700,
        letterSpacing: "0.25em",
        color: "#f0ece4",
    },
    navTag: {
        fontSize: "11px",
        fontFamily: "'Arial Narrow', 'Arial', sans-serif",
        letterSpacing: "0.15em",
        color: "#888",
    },
    hero: {
        position: "relative",
        zIndex: 1,
        padding: "100px 40px 80px",
        maxWidth: "760px",
        margin: "0 auto",
    },
    heroEyebrow: {
        fontSize: "11px",
        fontFamily: "'Arial Narrow', 'Arial', sans-serif",
        letterSpacing: "0.2em",
        color: "#888",
        textTransform: "uppercase",
        marginBottom: "20px",
    },
    heroTitle: {
        fontSize: "clamp(52px, 8vw, 96px)",
        fontWeight: 400,
        lineHeight: 1,
        margin: "0 0 24px",
        fontFamily: "'Georgia', serif",
        letterSpacing: "-0.02em",
    },
    heroSub: {
        fontSize: "18px",
        lineHeight: 1.6,
        color: "#aaa",
        maxWidth: "480px",
        margin: "0 0 40px",
        fontFamily: "'Georgia', serif",
        fontStyle: "italic",
    },
    heroDivider: {
        width: "48px",
        height: "1px",
        backgroundColor: "#f0ece4",
        marginBottom: "24px",
    },
    heroDate: {
        fontSize: "11px",
        fontFamily: "'Arial Narrow', 'Arial', sans-serif",
        letterSpacing: "0.15em",
        color: "#555",
        textTransform: "uppercase",
    },
    main: {
        position: "relative",
        zIndex: 1,
        maxWidth: "760px",
        margin: "0 auto",
        padding: "0 40px 100px",
    },
    section: {
        display: "flex",
        gap: "40px",
        padding: "48px 0",
        borderTop: "1px solid rgba(240,236,228,0.08)",
    },
    sectionLeft: {
        flexShrink: 0,
        width: "48px",
    },
    sectionNumber: {
        fontSize: "11px",
        fontFamily: "'Arial Narrow', 'Arial', sans-serif",
        letterSpacing: "0.1em",
        color: "#444",
        paddingTop: "6px",
        display: "block",
    },
    sectionRight: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: "20px",
        fontWeight: 400,
        margin: "0 0 16px",
        fontFamily: "'Georgia', serif",
        letterSpacing: "-0.01em",
        color: "#f0ece4",
    },
    sectionBody: {
        fontSize: "15px",
        lineHeight: 1.8,
        color: "#999",
        margin: 0,
        fontFamily: "'Georgia', serif",
    },
    footer: {
        position: "relative",
        zIndex: 1,
        borderTop: "1px solid rgba(240,236,228,0.08)",
        padding: "60px 40px",
    },
    footerInner: {
        maxWidth: "760px",
        margin: "0 auto",
    },
    footerLogo: {
        display: "block",
        fontSize: "11px",
        fontFamily: "'Arial Narrow', 'Arial', sans-serif",
        fontWeight: 700,
        letterSpacing: "0.25em",
        color: "#444",
        marginBottom: "20px",
    },
    footerText: {
        fontSize: "13px",
        lineHeight: 1.7,
        color: "#555",
        maxWidth: "520px",
        fontFamily: "'Georgia', serif",
        fontStyle: "italic",
        marginBottom: "12px",
    },
    footerContact: {
        fontSize: "13px",
        color: "#555",
        fontFamily: "'Arial Narrow', 'Arial', sans-serif",
    },
    footerLink: {
        color: "#888",
        textDecoration: "underline",
    },
};