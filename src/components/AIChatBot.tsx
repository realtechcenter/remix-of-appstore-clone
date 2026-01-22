import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ParsedApp {
  id: number;
  name: string;
  description: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app-recommend-chat`;

// Parse [APP:id:name:description] tags from message content
const parseAppTags = (content: string): { text: string; apps: ParsedApp[] }[] => {
  const parts: { text: string; apps: ParsedApp[] }[] = [];
  const appRegex = /\[APP:(\d+):([^:]+):([^\]]+)\]/g;
  
  let lastIndex = 0;
  let match;
  let currentApps: ParsedApp[] = [];
  let textBeforeApps = "";
  
  const lines = content.split('\n');
  let result: { text: string; apps: ParsedApp[] }[] = [];
  let pendingText = "";
  let pendingApps: ParsedApp[] = [];
  
  for (const line of lines) {
    const appMatch = line.match(/\[APP:(\d+):([^:]+):([^\]]+)\]/);
    if (appMatch) {
      pendingApps.push({
        id: parseInt(appMatch[1], 10),
        name: appMatch[2],
        description: appMatch[3]
      });
    } else {
      if (pendingApps.length > 0) {
        result.push({ text: pendingText, apps: pendingApps });
        pendingText = line;
        pendingApps = [];
      } else {
        pendingText += (pendingText ? '\n' : '') + line;
      }
    }
  }
  
  // Push remaining content
  if (pendingText || pendingApps.length > 0) {
    result.push({ text: pendingText, apps: pendingApps });
  }
  
  return result.length > 0 ? result : [{ text: content, apps: [] }];
};

const createSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

// App Card Component for chat recommendations
const AppRecommendCard = ({ app, onClick }: { app: ParsedApp; onClick: () => void }) => {
  const gradients = [
    "from-blue-500 to-purple-600",
    "from-green-500 to-teal-600", 
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
  ];
  
  const gradientIndex = app.id % gradients.length;
  
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl bg-background border hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 w-full text-left group"
    >
      <div className={cn(
        "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md group-hover:scale-105 transition-transform",
        gradients[gradientIndex]
      )}>
        {app.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {app.name}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {app.description}
        </p>
      </div>
    </button>
  );
};

// Message content renderer with app cards
const MessageContent = ({ content, onAppClick }: { content: string; onAppClick: (id: number, name: string) => void }) => {
  const parsed = parseAppTags(content);
  
  return (
    <div className="space-y-2">
      {parsed.map((section, idx) => (
        <div key={idx}>
          {section.text && (
            <p className="text-sm whitespace-pre-wrap">{section.text}</p>
          )}
          {section.apps.length > 0 && (
            <div className="space-y-2 mt-2">
              {section.apps.map((app) => (
                <AppRecommendCard 
                  key={app.id} 
                  app={app} 
                  onClick={() => onAppClick(app.id, app.name)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const AIChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const navigate = useNavigate();

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

  const handleAppClick = (id: number, name: string) => {
    const slug = createSlug(name);
    setIsOpen(false);
    navigate(`/${id}-${slug}`);
  };

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
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-4 duration-300">
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
            <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
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
                    {message.role === "assistant" ? (
                      <MessageContent content={message.content} onAppClick={handleAppClick} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
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
