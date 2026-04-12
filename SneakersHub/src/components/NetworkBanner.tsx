import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const NetworkBanner = () => {
    const { isOnline, wasOffline } = useNetworkStatus();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    key="offline"
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white text-sm font-semibold shadow-lg"
                    style={{ paddingTop: `calc(12px + env(safe-area-inset-top, 0px))` }}
                >
                    <WifiOff className="w-4 h-4 flex-shrink-0" />
                    No internet connection — some features may not work
                </motion.div>
            )}

            {isOnline && wasOffline && (
                <motion.div
                    key="back-online"
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white text-sm font-semibold shadow-lg"
                    style={{ paddingTop: `calc(12px + env(safe-area-inset-top, 0px))` }}
                >
                    <Wifi className="w-4 h-4 flex-shrink-0" />
                    Back online!
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NetworkBanner;