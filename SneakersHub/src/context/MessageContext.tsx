import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  listing_id?: string;
  content: string;
  created_at: string;
  seen: boolean;
}

export interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  listing_id?: string;
  listing_name?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface MessageContextType {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  totalUnread: number;
  sendMessage: (receiverId: string, content: string, listingId?: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  markConversationSeen: (conversationId: string) => Promise<void>;
  getOrCreateConversationId: (userA: string, userB: string, listingId?: string) => string;
  typingUsers: [];
  startTyping: () => void;
  stopTyping: () => void;
  onlineUsers: Set<string>;
  addReaction: () => Promise<void>;
}

const MessageContext = createContext<MessageContextType | null>(null);

export const useMessages = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useMessages must be used within MessageProvider");
  return ctx;
};

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const profileCacheRef = useRef<Record<string, string>>({});
  const channelRef = useRef<any>(null);

  const getOrCreateConversationId = (userA: string, userB: string, listingId?: string) => {
    const sorted = [userA, userB].sort().join("_");
    return listingId ? `${sorted}_${listingId}` : sorted;
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const getProfileName = useCallback(async (id: string): Promise<string> => {
    if (profileCacheRef.current[id]) return profileCacheRef.current[id];
    const { data } = await supabase.from("profiles").select("name").eq("id", id).single();
    const name = data?.name ?? "Unknown";
    profileCacheRef.current[id] = name;
    return name;
  }, []);

  const buildConversations = useCallback(async (allMessages: Record<string, Message[]>) => {
    if (!user?.id) return;
    const convList: Conversation[] = await Promise.all(
      Object.entries(allMessages).map(async ([conv_id, msgs]) => {
        const sorted = [...msgs].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latest = sorted[0];
        const otherId = latest.sender_id === user.id ? latest.receiver_id : latest.sender_id;
        const otherName = await getProfileName(otherId);
        const unread = msgs.filter((m) => m.receiver_id === user.id && !m.seen).length;
        return {
          conversation_id: conv_id,
          other_user_id: otherId,
          other_user_name: otherName,
          listing_id: latest.listing_id,
          listing_name: undefined,
          last_message: latest.content,
          last_message_at: latest.created_at,
          unread_count: unread,
        };
      })
    );
    convList.sort((a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );
    setConversations(convList);
  }, [user?.id, getProfileName]);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, receiver_id, listing_id, content, created_at, seen")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true });

    if (error || !data) return;

    const grouped: Record<string, Message[]> = {};
    data.forEach((msg: Message) => {
      if (!grouped[msg.conversation_id]) grouped[msg.conversation_id] = [];
      grouped[msg.conversation_id].push(msg);
    });
    setMessages(grouped);
    await buildConversations(grouped);
  }, [user?.id, buildConversations]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, receiver_id, listing_id, content, created_at, seen")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !data) return;
    setMessages((prev) => {
      const updated = { ...prev, [conversationId]: data };
      buildConversations(updated);
      return updated;
    });
  }, [user?.id, buildConversations]);

  // ── FIX 1: fetchConversations runs immediately (no delay)
  // ── FIX 2: fetchConversations is in the dependency array so the
  //           channel closure always has a fresh reference
  useEffect(() => {
    if (!user?.id) return;

    // Fetch immediately — no setTimeout delay that caused a race condition
    fetchConversations();

    // Clean up any previous channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`messages:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const msg = payload.new as Message;
          if (msg.sender_id !== user.id && msg.receiver_id !== user.id) return;

          setMessages((prev) => {
            const existing = prev[msg.conversation_id] ?? [];
            if (existing.some((m) => m.id === msg.id)) return prev;
            // Replace optimistic message if content matches
            const withoutOptimistic = existing.filter(
              (m) => !(m.id.startsWith("optimistic-") && m.content === msg.content && m.sender_id === msg.sender_id)
            );
            const updated = { ...prev, [msg.conversation_id]: [...withoutOptimistic, msg] };
            buildConversations(updated);
            return updated;
          });
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" },
        (payload: any) => {
          const msg = payload.new as Message;
          if (msg.sender_id !== user.id && msg.receiver_id !== user.id) return;
          setMessages((prev) => {
            const conv = prev[msg.conversation_id];
            if (!conv) return prev;
            const updated = { ...prev, [msg.conversation_id]: conv.map((m) => m.id === msg.id ? msg : m) };
            buildConversations(updated);
            return updated;
          });
        }
      )
      .subscribe((status) => {
        // FIX 3: Log subscription status so you can debug in prod if needed
        if (status === "CHANNEL_ERROR") {
          console.error("[MessageContext] Realtime channel error — will retry on next mount");
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, fetchConversations]); // ✅ fetchConversations in deps fixes stale closure

  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    listingId?: string,
  ) => {
    if (!user?.id || !content.trim()) return;

    const conversationId = getOrCreateConversationId(user.id, receiverId, listingId);
    const tempId = `optimistic-${Date.now()}`;

    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      listing_id: listingId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      seen: false,
    };

    setMessages((prev) => {
      const updated = { ...prev, [conversationId]: [...(prev[conversationId] ?? []), optimisticMsg] };
      buildConversations(updated);
      return updated;
    });

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        listing_id: listingId ?? null,
        content: content.trim(),
        seen: false,
      })
      .select()
      .single();

    if (error || !data) {
      setMessages((prev) => {
        const conv = (prev[conversationId] ?? []).filter((m) => m.id !== tempId);
        const updated = { ...prev, [conversationId]: conv };
        buildConversations(updated);
        return updated;
      });
      return;
    }

    setMessages((prev) => {
      const conv = (prev[conversationId] ?? []).map((m) => m.id === tempId ? (data as Message) : m);
      const updated = { ...prev, [conversationId]: conv };
      buildConversations(updated);
      return updated;
    });

  }, [user?.id, buildConversations]);

  const markConversationSeen = useCallback(async (conversationId: string) => {
    if (!user?.id) return;
    setMessages((prev) => {
      const conv = (prev[conversationId] ?? []).map((m) =>
        m.receiver_id === user.id ? { ...m, seen: true } : m
      );
      const updated = { ...prev, [conversationId]: conv };
      buildConversations(updated);
      return updated;
    });
    await supabase.from("messages")
      .update({ seen: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", user.id)
      .eq("seen", false);
  }, [user?.id, buildConversations]);

  return (
    <MessageContext.Provider value={{
      conversations, messages, totalUnread,
      sendMessage, fetchMessages, markConversationSeen, getOrCreateConversationId,
      typingUsers: [],
      startTyping: () => {},
      stopTyping: () => {},
      onlineUsers: new Set(),
      addReaction: async () => {},
    }}>
      {children}
    </MessageContext.Provider>
  );
};