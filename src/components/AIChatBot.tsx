import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app-recommend-chat`;

export const AIChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const streamChat = async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!resp.ok || !resp.body) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to get response");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: language === 'km' 
            ? "សូមអភ័យទោស មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។" 
            : "Sorry, something went wrong. Please try again." 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const welcomeMessage = language === 'km' 
    ? "សួស្តី! 👋 ខ្ញុំជាជំនួយការ AI របស់អ្នក។ សូមប្រាប់ខ្ញុំអំពីអ្វីដែលអ្នកត្រូវការ ហើយខ្ញុំនឹងណែនាំកម្មវិធីដ៏ល្អបំផុតសម្រាប់អ្នក!"
    : "Hi there! 👋 I'm your AI assistant. Tell me what you need and I'll recommend the best apps for you!";

  return (
    <>
      {/* Chat Button with Pulsing Animation */}
      <div className={cn("fixed bottom-6 right-6 z-50", isOpen && "hidden")}>
        {/* Outer pulse ring */}
        <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" style={{ animationDuration: '2s' }} />
        {/* Inner pulse ring */}
        <div className="absolute -inset-2 rounded-full bg-primary/20 animate-pulse" />
        
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "relative h-14 w-14 rounded-full shadow-2xl",
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "transition-all duration-300 hover:scale-110",
            "ring-4 ring-primary/30"
          )}
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {/* Green notification dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background" />
          </span>
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {language === 'km' ? 'ជំនួយការ AI' : 'AI Assistant'}
                  </h3>
                  <p className="text-xs text-white/80">
                    {language === 'km' ? 'ស្វែងរកកម្មវិធីល្អបំផុត' : 'Find the perfect app'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="flex gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                    <p className="text-sm">{welcomeMessage}</p>
                  </div>
                </div>
              )}
              
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3 mb-4",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary/10"
                  )}>
                    {message.role === "user" 
                      ? <User className="h-4 w-4" />
                      : <Bot className="h-4 w-4 text-primary" />
                    }
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-3 max-w-[85%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={language === 'km' ? 'សរសេរសារ...' : 'Type a message...'}
                  className="flex-1 rounded-full bg-muted border-0"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="rounded-full h-10 w-10 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
