const Spinner = () => (
  <div style={{
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
  }}>

    {/* Bouncing sneaker */}
    <div style={{ position: "relative", height: "96px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <svg
        width="80" height="56" viewBox="0 0 72 52" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "sneakerBounce 0.65s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite alternate" }}
      >
        <ellipse cx="36" cy="47" rx="32" ry="4.5" fill="#f97316" opacity="0.85"/>
        <rect x="6" y="38" width="60" height="10" rx="5" fill="#f97316"/>
        <path d="M8 38 C8 38 10 18 24 16 C32 15 40 20 50 20 L64 24 C66 24 68 26 66 30 L64 38 Z" fill="#ffffff"/>
        <path d="M8 38 C8 38 6 30 10 26 C14 22 20 22 24 22 L24 38 Z" fill="#f0f0f0"/>
        <path d="M30 17 C30 17 26 28 28 38" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M38 18 C38 18 36 28 38 38" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M46 20 C46 20 46 28 48 38" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M24 16 C24 16 26 10 30 10 C34 10 34 16 34 16 Z" fill="#ffffff" stroke="#e5e5e5" strokeWidth="1"/>
        <line x1="25" y1="22" x2="33" y2="20" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="25" y1="26" x2="35" y2="24" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="25" y1="30" x2="36" y2="28" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="25" y1="34" x2="37" y2="32" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>

      {/* Shadow */}
      <span style={{
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        display: "block",
        width: "3rem",
        height: "0.35rem",
        borderRadius: "9999px",
        background: "rgba(249,115,22,0.25)",
        animation: "shadowPulse 0.65s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite alternate",
      }}/>
    </div>

    {/* "Loading" text + blinking dots */}
    <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
      <span style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: "0.85rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.55)",
      }}>
        Loading
      </span>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} style={{
          color: "#f97316",
          fontWeight: 700,
          fontSize: "1.2rem",
          lineHeight: 1,
          display: "inline-block",
          animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
        }}>.</span>
      ))}
    </div>

    <style>{`
      @keyframes sneakerBounce {
        0%   { transform: translateY(0px)   rotate(-8deg); }
        100% { transform: translateY(-40px) rotate(8deg);  }
      }
      @keyframes shadowPulse {
        0%   { transform: translateX(-50%) scaleX(1);    opacity: 0.35; }
        100% { transform: translateX(-50%) scaleX(0.3);  opacity: 0.08; }
      }
      @keyframes blink {
        0%, 100% { opacity: 0.15; transform: translateY(0px);  }
        50%       { opacity: 1;   transform: translateY(-4px); }
      }
    `}</style>
  </div>
);

export default Spinner;