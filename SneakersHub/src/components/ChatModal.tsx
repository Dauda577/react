import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ArrowLeft, MessageCircle } from "lucide-react";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";

interface ChatModalProps {
  receiverId: string;
  receiverName: string;
  listingId?: string;
  listingName?: string;
  onClose: () => void;
}

const ChatModal = ({ receiverId, receiverName, listingId, listingName, onClose }: ChatModalProps) => {
  const { user } = useAuth();
  const { messages, sendMessage, fetchMessages, markConversationSeen, getOrCreateConversationId } = useMessages();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversationId = user?.id
    ? getOrCreateConversationId(user.id, receiverId, listingId)
    : "";

  const convoMessages = messages[conversationId] ?? [];

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages(conversationId);
    markConversationSeen(conversationId);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convoMessages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    await sendMessage(receiverId, text, listingId, listingName);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
  };

  // Group messages by date
  const grouped: { date: string; msgs: typeof convoMessages }[] = [];
  convoMessages.forEach(msg => {
    const date = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date, msgs: [msg] });
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="fixed bottom-4 right-4 z-50 w-[340px] sm:w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary">{receiverName[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm truncate">{receiverName}</p>
          {listingName && (
            <p className="text-[10px] text-muted-foreground truncate">re: {listingName}</p>
          )}
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {convoMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Start a conversation</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Ask {receiverName} about {listingName ?? "their listing"}
            </p>
          </div>
        ) : (
          grouped.map(({ date, msgs }) => (
            <div key={date}>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground px-2">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-1.5">
                {msgs.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  const showAvatar = !isMe && (i === 0 || msgs[i - 1]?.sender_id !== msg.sender_id);
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        <div className={`w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mb-0.5 ${showAvatar ? "visible" : "invisible"}`}>
                          <span className="text-[10px] font-bold text-primary">{receiverName[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed
                          ${isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                          }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                          {formatTime(msg.created_at)}
                          {isMe && <span className="ml-1">{msg.seen ? "· Seen" : ""}</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border flex items-center gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 px-3.5 py-2 rounded-full border border-border bg-background text-sm
            focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
        />
        <button
          onPointerDown={(e) => { e.preventDefault(); handleSend(); }}
          onClick={handleSend}
          className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all touch-manipulation
            ${input.trim() && !sending
              ? "bg-primary text-primary-foreground active:opacity-70"
              : "bg-muted text-muted-foreground opacity-50"
            }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default ChatModal;