import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
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
  const subscriptionRef = useRef<any>(null);

  const getOrCreateConversationId = (userA: string, userB: string, listingId?: string) => {
    const sorted = [userA, userB].sort().join("_");
    return listingId ? `${sorted}_${listingId}` : sorted;
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const fetchConversations = async () => {
    if (!user?.id) return;
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error || !data) return;

    // Group by conversation_id
    const convMap: Record<string, Message[]> = {};
    data.forEach((msg: Message) => {
      if (!convMap[msg.conversation_id]) convMap[msg.conversation_id] = [];
      convMap[msg.conversation_id].push(msg);
    });

    // Fetch profile names
    const otherUserIds = [...new Set(data.map((m: Message) =>
      m.sender_id === user.id ? m.receiver_id : m.sender_id
    ))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", otherUserIds);

    const profileMap: Record<string, string> = {};
    profiles?.forEach((p: { id: string; name: string }) => {
      profileMap[p.id] = p.name ?? "Unknown";
    });

    const convList: Conversation[] = Object.entries(convMap).map(([conv_id, msgs]) => {
      const latest = msgs[0];
      const otherId = latest.sender_id === user.id ? latest.receiver_id : latest.sender_id;
      const unread = msgs.filter(m => m.receiver_id === user.id && !m.seen).length;
      return {
        conversation_id: conv_id,
        other_user_id: otherId,
        other_user_name: profileMap[otherId] ?? "Unknown",
        listing_id: latest.listing_id,
        listing_name: undefined,
        last_message: latest.content,
        last_message_at: latest.created_at,
        unread_count: unread,
      };
    });

    convList.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    setConversations(convList);
  };

  const fetchMessages = async (conversationId: string) => {
    if (!user?.id) return;
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !data) return;

    setMessages(prev => ({ ...prev, [conversationId]: data }));
  };

  const sendMessage = async (
    receiverId: string,
    content: string,
    listingId?: string,
    listingName?: string
  ) => {
    if (!user?.id || !content.trim()) return;
    const { supabase } = await import("@/lib/supabase");

    const conversationId = getOrCreateConversationId(user.id, receiverId, listingId);

    const newMsg = {
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      listing_id: listingId ?? null,
      content: content.trim(),
      seen: false,
    };

    const { data, error } = await supabase.from("messages").insert(newMsg).select().single();
    if (error || !data) return;

    // Trigger SMS notification to receiver
    if (data.receiver_id !== user.id) {
  await triggerSMS({ type: "message.created", record: data });
}

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), data],
    }));

    await fetchConversations();
  };

  const markConversationSeen = async (conversationId: string) => {
    if (!user?.id) return;
    const { supabase } = await import("@/lib/supabase");

    await supabase
      .from("messages")
      .update({ seen: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", user.id)
      .eq("seen", false);

    setConversations(prev =>
      prev.map(c => c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c)
    );
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user?.id) return;

    fetchConversations();

    let channel: any;
    import("@/lib/supabase").then(({ supabase }) => {
      channel = supabase
        .channel(`messages:${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        }, (payload: any) => {
          const msg = payload.new as Message;
          setMessages(prev => ({
            ...prev,
            [msg.conversation_id]: [...(prev[msg.conversation_id] ?? []), msg],
          }));
          fetchConversations();
        })
        .subscribe();

      subscriptionRef.current = channel;
    });

    return () => {
      if (subscriptionRef.current) {
        import("@/lib/supabase").then(({ supabase }) => {
          supabase.removeChannel(subscriptionRef.current);
        });
      }
    };
  }, [user?.id]);

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