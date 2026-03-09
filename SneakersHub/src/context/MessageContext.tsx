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

// ── NEW: Typing indicator interface ──────────────────────
interface TypingUser {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

interface MessageContextType {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  totalUnread: number;
  sendMessage: (receiverId: string, content: string, listingId?: string, listingName?: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  markConversationSeen: (conversationId: string) => Promise<void>;
  getOrCreateConversationId: (userA: string, userB: string, listingId?: string) => string;
  // ── NEW: Typing indicators ─────────────────────────────
  typingUsers: TypingUser[];
  startTyping: (receiverId: string, conversationId: string) => void;
  stopTyping: (receiverId: string, conversationId: string) => void;
  // ── NEW: Online status ─────────────────────────────────
  onlineUsers: Set<string>;
  // ── NEW: Message reactions (optional) ──────────────────
  addReaction: (messageId: string, reaction: string) => Promise<void>;
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
  // ── NEW: Typing state ──────────────────────────────────
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  // ── NEW: Online users state ────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const profileCacheRef = useRef<Record<string, string>>({});
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const typingChannelRef = useRef<any>(null);
  const messagesRef = useRef<Record<string, Message[]>>({});
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Keep ref in sync for use in realtime handlers
  useEffect(() => { messagesRef.current = messages; }, [messages]);

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
    await buildConversations(grouped);
  }, [user?.id, buildConversations]);

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
      buildConversations(updated);
      return updated;
    });
  }, [user?.id, buildConversations]);

  // ── ENHANCED: Realtime with presence and typing ─────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    fetchConversations();

    // ── Messages channel (your existing code) ─────────────────
    channelRef.current = supabase
      .channel(`messages:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const msg = payload.new as Message;
          if (msg.sender_id !== user.id && msg.receiver_id !== user.id) return;

          setMessages((prev) => {
            const existing = prev[msg.conversation_id] ?? [];
            if (existing.some((m) => m.id === msg.id)) return prev;
            const withoutOptimistic = existing.filter(
              (m) => !(m.id.startsWith("optimistic-") && m.content === msg.content && m.sender_id === msg.sender_id)
            );
            const updated = { ...prev, [msg.conversation_id]: [...withoutOptimistic, msg] };
            buildConversations(updated);
            
            // ── NEW: Show browser notification ─────────────────
            if (msg.receiver_id === user.id && document.hidden) {
              showNotification(msg);
            }
            
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
      .subscribe((status: string) => console.log("[Messages] realtime:", status));

    // ── NEW: Presence channel (online status) ─────────────────
    presenceChannelRef.current = supabase.channel('online_users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannelRef.current
      .on('presence', { event: 'sync' }, () => {
        const presence = presenceChannelRef.current?.presenceState() || {};
        const online = new Set(Object.keys(presence));
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannelRef.current?.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // ── NEW: Typing indicators channel ────────────────────────
    typingChannelRef.current = supabase.channel('typing_indicators');

    typingChannelRef.current
      .on('broadcast', { event: 'typing:start' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers(prev => {
            const existing = prev.findIndex(
              t => t.userId === payload.userId && t.conversationId === payload.conversationId
            );
            if (existing === -1) {
              return [...prev, payload];
            }
            return prev;
          });
        }
      })
      .on('broadcast', { event: 'typing:stop' }, ({ payload }) => {
        setTypingUsers(prev => 
          prev.filter(t => !(t.userId === payload.userId && t.conversationId === payload.conversationId))
        );
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
      
      // Clear all typing timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [user?.id]);

  // ── NEW: Typing indicator functions ─────────────────────────
  const startTyping = useCallback((receiverId: string, conversationId: string) => {
    if (!user?.id) return;

    // Clear existing timeout for this conversation
    const existingTimeout = typingTimeoutRef.current.get(conversationId);
    if (existingTimeout) clearTimeout(existingTimeout);

    // Send typing start event
    typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing:start',
      payload: {
        userId: user.id,
        conversationId,
        isTyping: true,
      },
    });

    // Set timeout to auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      stopTyping(receiverId, conversationId);
    }, 3000);

    typingTimeoutRef.current.set(conversationId, timeout);
  }, [user?.id]);

  const stopTyping = useCallback((receiverId: string, conversationId: string) => {
    if (!user?.id) return;

    // Clear timeout
    const timeout = typingTimeoutRef.current.get(conversationId);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutRef.current.delete(conversationId);
    }

    // Send typing stop event
    typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing:stop',
      payload: {
        userId: user.id,
        conversationId,
        isTyping: false,
      },
    });
  }, [user?.id]);

  // ── NEW: Message reactions ─────────────────────────────────
  const addReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        reaction: reaction,
      }, {
        onConflict: 'message_id,user_id'
      });

    if (error) console.error('Failed to add reaction:', error);
  }, [user?.id]);

  // ── NEW: Browser notifications ─────────────────────────────
  const showNotification = useCallback((message: Message) => {
    // Request permission if not granted
    if (Notification.permission === 'granted') {
      new Notification('New Message', {
        body: message.content,
        icon: '/icons/icon-192.png',
        tag: message.conversation_id,
        silent: false,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // ── EXISTING: sendMessage with typing cleanup ──────────────
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

    // Stop typing when sending message
    stopTyping(receiverId, conversationId);

    // Show instantly on sender's side
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
      // Revert optimistic on failure
      setMessages((prev) => {
        const conv = (prev[conversationId] ?? []).filter((m) => m.id !== tempId);
        const updated = { ...prev, [conversationId]: conv };
        buildConversations(updated);
        return updated;
      });
      return;
    }

    // Replace optimistic with real message
    setMessages((prev) => {
      const conv = (prev[conversationId] ?? []).map((m) => m.id === tempId ? (data as Message) : m);
      const updated = { ...prev, [conversationId]: conv };
      buildConversations(updated);
      return updated;
    });

    if (data.receiver_id !== user.id) {
      await triggerSMS({ type: "message.created", record: data });
    }
  }, [user?.id, buildConversations, stopTyping]);

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
      // ── NEW exports ───────────────────────────────────────
      typingUsers,
      startTyping,
      stopTyping,
      onlineUsers,
      addReaction,
    }}>
      {children}
    </MessageContext.Provider>
  );
};