import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";
import ChatModal from "@/components/ChatModal";

const MessagesInbox = () => {
  const { conversations, totalUnread } = useMessages();
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<{
    receiverId: string;
    receiverName: string;
    listingId?: string;
    listingName?: string;
  } | null>(null);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
  };

  if (conversations.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-display text-lg font-bold tracking-tight mb-2">No messages yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Messages from buyers and sellers will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
        {totalUnread > 0 && <span className="ml-2 text-primary font-semibold">· {totalUnread} unread</span>}
      </p>

      <div className="space-y-2">
        <AnimatePresence>
          {conversations.map((conv, i) => (
            <motion.button
              key={conv.conversation_id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActiveChat({
                receiverId: conv.other_user_id,
                receiverName: conv.other_user_name,
                listingId: conv.listing_id,
                listingName: conv.listing_name,
              })}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border
                hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-display text-sm font-bold text-primary">
                    {conv.other_user_name[0]?.toUpperCase()}
                  </span>
                </div>
                {conv.unread_count > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground
                    text-[9px] font-bold flex items-center justify-center">
                    {conv.unread_count > 9 ? "9+" : conv.unread_count}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={`text-sm truncate ${conv.unread_count > 0 ? "font-semibold text-foreground" : "font-medium"}`}>
                    {conv.other_user_name}
                  </p>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                {conv.listing_name && (
                  <p className="text-[10px] text-primary font-medium mb-0.5 truncate">re: {conv.listing_name}</p>
                )}
                <p className={`text-xs truncate ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {conv.last_message}
                </p>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Chat modal */}
      <AnimatePresence>
        {activeChat && (
          <ChatModal
            receiverId={activeChat.receiverId}
            receiverName={activeChat.receiverName}
            listingId={activeChat.listingId}
            listingName={activeChat.listingName}
            onClose={() => setActiveChat(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagesInbox;