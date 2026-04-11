import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ADMIN_ID = "9df1431d-f478-448a-b2b2-cc89678d9e35";

const AdminLink = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (user?.id !== ADMIN_ID) return null;

    return (
        <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/20
        bg-primary/5 hover:bg-primary/10 transition-colors text-left mb-6"
        >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-4 h-4 text-primary" />
            </div>
            <div>
                <p className="text-sm font-bold text-primary">Admin Dashboard</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Orders · Sellers · Messaging · Payouts</p>
            </div>
            <span className="ml-auto text-xs font-bold text-primary/60">→</span>
        </button>
    );
};

export default AdminLink;