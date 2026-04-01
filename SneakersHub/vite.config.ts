import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // we handle registration manually in main.tsx

      workbox: {
        // Clean up old caches automatically on SW activation
        cleanupOutdatedCaches: true,

        // Activate new SW immediately without waiting for all tabs to close
        skipWaiting: true,
        clientsClaim: true,

        // Cache strategies
        runtimeCaching: [
          {
            // Supabase API — network first, fall back to cache
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }, // 5 min
            },
          },
          {
            // Images — cache first (they don't change)
            urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Google Fonts CSS
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-css",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
            },
          },
          {
            // Google Fonts WOFF2 files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-woff2",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
            },
          },
          {
            // Static assets (JS/CSS) — cache first with versioning
            urlPattern: /^https:\/\/sneakershub\.site\/assets\/.*\.(js|css)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
            },
          },
        ],
      },

      manifest: {
        name: "SneakersHub",
        short_name: "SneakersHub",
        description: "Ghana's sneaker marketplace",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icons/icon-48x48.png",   sizes: "48x48",   type: "image/png" },
          { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png" },
          { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png" },
          { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
          { src: "/icons/icon-167x167.png", sizes: "167x167", type: "image/png" },
          { src: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    // Enable source maps for debugging (optional, disable in prod if not needed)
    sourcemap: false,
    
    // Target modern browsers for smaller bundles
    target: "es2020",
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-motion":   ["framer-motion"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui":       ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"], // if you use Radix
        },
        // Optimize chunk naming for better caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true,
    
    // Drop console logs in production
    minify: "terser",
    terserOptions: {
      compress: { 
        drop_console: true, 
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug", "console.trace"], // Remove specific console methods
      },
    },
    
    // Improve build performance
    reportCompressedSize: false,
  },
  
  // Development server optimizations
  server: {
    open: false, // Don't auto-open browser
    hmr: {
      overlay: true, // Show errors in browser
    },
  },
  
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "framer-motion", "@supabase/supabase-js"],
    exclude: [], // Add any problematic dependencies here
  },
});