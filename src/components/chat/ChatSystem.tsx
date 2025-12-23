import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Chat {
  id: string;
  last_message: string | null;
  last_updated: string;
}

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: any;
  created_at: string;
}

export function ChatSystem() {
  const { user } = useSupabaseAuth();
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Carrega conversas visíveis para o usuário (RLS garante apenas chats onde é participante)
  useEffect(() => {
    if (!user) return;

    const loadChats = async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, last_message, last_updated")
        .order("last_updated", { ascending: false });

      if (!error && data) {
        setChats(data as Chat[]);
      }
    };

    loadChats();
  }, [user]);

  // Carrega mensagens da conversa selecionada
  useEffect(() => {
    if (!user || !selectedChat) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, chat_id, sender_id, content, created_at")
        .eq("chat_id", selectedChat)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
      setLoadingMessages(false);
    };

    loadMessages();

    const channel = supabase
      .channel(`chat-${selectedChat}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_id=eq.${selectedChat}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, msg]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedChat]);

  const handleSendMessage = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;

    const { error } = await supabase.from("chat_messages").insert({
      chat_id: selectedChat,
      sender_id: user.id,
      type: "text",
      content: { text: newMessage.trim() },
    });

    if (!error) {
      setNewMessage("");
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Botão flutuante */}
      <Button
        size="icon"
        className="fixed bottom-5 right-5 rounded-full w-12 h-12 shadow-lg z-40 bg-primary text-primary-foreground"
        onClick={() => setOpen((prev) => !prev)}
      >
        <MessageCircle className="w-5 h-5" />
      </Button>

      {/* Painel de chat */}
      {open && (
        <div className="fixed bottom-20 right-5 w-[320px] md:w-[380px] h-[420px] bg-background border border-border rounded-sm shadow-xl z-40 flex flex-col">
          <header className="h-10 border-b border-border flex items-center justify-between px-3">
            <span className="text-[10px] font-mono tracking-[0.22em] text-muted-foreground uppercase">
              Mensagens
            </span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </header>
          <div className="flex-1 flex text-[11px] font-mono">
            <div className="w-28 border-r border-border flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat.id)}
                      className={`w-full text-left px-2 py-1 rounded-sm text-[10px] tracking-[0.18em] uppercase ${
                        selectedChat === chat.id ? "bg-primary/20 text-primary" : "hover:bg-muted/40"
                      }`}
                    >
                      {chat.last_message ? chat.last_message.slice(0, 18) : "Conversa"}
                    </button>
                  ))}
                  {chats.length === 0 && (
                    <p className="text-[10px] text-muted-foreground px-1">
                      Nenhuma conversa ativa.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {loadingMessages && (
                    <p className="text-[10px] text-muted-foreground">Carregando...</p>
                  )}
                  {!loadingMessages && messages.length === 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Selecione uma conversa para visualizar as mensagens.
                    </p>
                  )}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[90%] px-2 py-1 rounded-sm text-[10px] leading-relaxed ${
                        m.sender_id === user.id
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "mr-auto bg-muted text-muted-foreground"
                      }`}
                    >
                      {typeof m.content === "object" && m.content?.text
                        ? String(m.content.text)
                        : "[mensagem]"}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t border-border p-2 flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digitar mensagem..."
                  className="h-8 text-[11px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-[10px] tracking-[0.18em]"
                  onClick={handleSendMessage}
                  disabled={!selectedChat || !newMessage.trim()}
                >
                  ENVIAR
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
