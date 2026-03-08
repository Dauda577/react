import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { triggerSMS } from "@/lib/sms";

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
  sendMessage: (receiverId: string, content: string, listingId?: string, listingName?: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  markConversationSeen: (conversationId: string) => Promise<void>;
  getOrCreateConversationId: (userA: string, userB: string, listingId?: string) => string;
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

  // ── Fetch profile name (cached) ───────────────────────────────────────────
  const getProfileName = useCallback(async (id: string): Promise<string> => {
    if (profileCacheRef.current[id]) return profileCacheRef.current[id];
    const { data } = await supabase.from("profiles").select("name").eq("id", id).single();
    const name = data?.name ?? "Unknown";
    profileCacheRef.current[id] = name;
    return name;
  }, []);

  // ── Rebuild conversations from flat messages state ────────────────────────
  const rebuildConversations = useCallback(
    async (allMessages: Record<string, Message[]>) => {
      if (!user?.id) return;

      const convList: Conversation[] = await Promise.all(
        Object.entries(allMessages).map(async ([conv_id, msgs]) => {
          const sorted = [...msgs].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

      convList.sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
      setConversations(convList);
    },
    [user?.id, getProfileName]
  );

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true });

    if (error || !data) return;

    const grouped: Record<string, Message[]> = {};
    data.forEach((msg: Message) => {
      if (!grouped[msg.conversation_id]) grouped[msg.conversation_id] = [];
      grouped[msg.conversation_id].push(msg);
    });

    setMessages(grouped);
    await rebuildConversations(grouped);
  }, [user?.id, rebuildConversations]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !data) return;

    setMessages((prev) => {
      const updated = { ...prev, [conversationId]: data };
      rebuildConversations(updated);
      return updated;
    });
  }, [user?.id, rebuildConversations]);

  // ── Handle an incoming realtime message (works for both sender & receiver) ─
  const handleIncomingMessage = useCallback(
    async (msg: Message) => {
      setMessages((prev) => {
        const existing = prev[msg.conversation_id] ?? [];
        // Avoid duplicates (optimistic messages already added)
        if (existing.some((m) => m.id === msg.id)) return prev;
        const updated = {
          ...prev,
          [msg.conversation_id]: [...existing, msg],
        };
        rebuildConversations(updated);
        return updated;
      });
    },
    [rebuildConversations]
  );

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    fetchConversations();

    // Subscribe to ALL messages where the user is involved (both sender and receiver)
    channelRef.current = supabase
      .channel(`messages:user:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      }, (payload: any) => {
        handleIncomingMessage(payload.new as Message);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${user.id}`,
      }, (payload: any) => {
        // Handle seen status updates
        const updated = payload.new as Message;
        setMessages((prev) => {
          const conv = prev[updated.conversation_id];
          if (!conv) return prev;
          const newConv = conv.map((m) => (m.id === updated.id ? { ...m, ...updated } : m));
          const newMessages = { ...prev, [updated.conversation_id]: newConv };
          rebuildConversations(newMessages);
          return newMessages;
        });
      })
      .subscribe((status: string) => console.log("[Messages] realtime:", status));

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    listingId?: string,
    _listingName?: string
  ) => {
    if (!user?.id || !content.trim()) return;

    const conversationId = getOrCreateConversationId(user.id, receiverId, listingId);

    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      listing_id: listingId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      seen: false,
    };

    // Optimistic: show message instantly on sender's side
    setMessages((prev) => {
      const updated = {
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), optimisticMsg],
      };
      rebuildConversations(updated);
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
      // Revert optimistic message
      setMessages((prev) => {
        const conv = (prev[conversationId] ?? []).filter((m) => m.id !== optimisticMsg.id);
        const updated = { ...prev, [conversationId]: conv };
        rebuildConversations(updated);
        return updated;
      });
      return;
    }

    // Replace optimistic message with real one
    setMessages((prev) => {
      const conv = (prev[conversationId] ?? []).map((m) =>
        m.id === optimisticMsg.id ? (data as Message) : m
      );
      const updated = { ...prev, [conversationId]: conv };
      rebuildConversations(updated);
      return updated;
    });

    if (data.receiver_id !== user.id) {
      await triggerSMS({ type: "message.created", record: data });
    }
  }, [user?.id, rebuildConversations]);

  // ── Mark conversation as seen ─────────────────────────────────────────────
  const markConversationSeen = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    // Optimistic
    setMessages((prev) => {
      const conv = (prev[conversationId] ?? []).map((m) =>
        m.receiver_id === user.id ? { ...m, seen: true } : m
      );
      const updated = { ...prev, [conversationId]: conv };
      rebuildConversations(updated);
      return updated;
    });

    await supabase
      .from("messages")
      .update({ seen: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", user.id)
      .eq("seen", false);
  }, [user?.id, rebuildConversations]);

  return (
    <MessageContext.Provider value={{
      conversations,
      messages,
      totalUnread,
      sendMessage,
      fetchMessages,
      markConversationSeen,
      getOrCreateConversationId,
    }}>
      {children}
    </MessageContext.Provider>
  );
};