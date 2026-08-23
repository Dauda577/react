"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Store, Truck } from "lucide-react";

const AUTH_VIDEO_SRC = "/videos/auth-intro.mp4";

const FALLBACK_POINTS = [
  { icon: ShieldCheck, text: "Verified sellers & authentic kicks" },
  { icon: Truck, text: "Secure checkout & nationwide delivery" },
  { icon: Store, text: "Buy, sell or trade in minutes" },
];

const AuthVisualPanel = () => {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <aside className="hidden lg:flex relative overflow-hidden">
      <div className="absolute inset-0">
        {videoFailed ? (
          <div className="w-full h-full bg-gradient-to-br from-[hsl(217_91%_50%)] via-[hsl(225_85%_45%)] to-[hsl(230_80%_40%)]" />
        ) : (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/categoryicons/sneakers.svg"
            onError={() => setVideoFailed(true)}
            className="w-full h-full object-cover"
          >
            <source src={AUTH_VIDEO_SRC} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

      {/* Ambient animated blobs behind fallback */}
      {videoFailed && (
        <>
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-16 w-72 h-72 rounded-full bg-[hsl(217_91%_60%)]/40 blur-[100px]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-1/4 -right-10 w-80 h-80 rounded-full bg-[hsl(230_80%_55%)]/40 blur-[110px]"
          />
          <motion.div
            animate={{ y: [0, -18, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img
              src="/categoryicons/sneakers.svg"
              alt=""
              aria-hidden
              className="w-56 h-56 opacity-90 invert drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            />
          </motion.div>
        </>
      )}

      {/* Brand + copy overlays */}
      <div className="relative z-10 flex flex-col justify-between w-full p-10">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="font-display text-2xl font-bold tracking-tight text-white">
            Sneakers            <span className="text-[hsl(210_100%_70%)]">Hub</span>
          </p>
        </motion.div>

        <div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            className="font-display text-4xl font-bold tracking-tighter text-white leading-tight max-w-md"
          >
            Step into the sneaker community.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-3 text-white/70 text-sm max-w-sm leading-relaxed"
          >
            Discover rare drops, list your kicks, and trade with people who get it.
          </motion.p>

          <div className="mt-8 space-y-3">
            {FALLBACK_POINTS.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                className="flex items-center gap-3"
              >
                <span className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[hsl(210_100%_70%)]" />
                </span>
                <span className="text-sm text-white/80">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AuthVisualPanel;