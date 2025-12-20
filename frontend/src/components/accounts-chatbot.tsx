import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

import { ChatbotMode, sendChatbotMessage } from "../lib/api";
import { useData } from "../lib/data-context";
import { toast } from "sonner@2.0.3";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function buildIntroMessage(mode: ChatbotMode, clientName?: string) {
  if (mode === "account") {
    if (clientName) {
      return `You're chatting in the context of ${clientName}. Ask for account health, trends, or optimization ideas tailored to this client.`;
    }
    return "Switch to account-specific chat by selecting a client. I'll use their metrics to personalize recommendations.";
  }

  return "Hi! I'm your AI Agency Analyst assistant. I can help you with insights about your client accounts, performance analysis, and recommendations. What would you like to know?";
}

export function AccountsChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<ChatbotMode>("general");
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);

  const { authToken, clients, clientsLoading } = useData();
  const selectedClient = clients.find((client) => String(client.id) === selectedClientId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  };

  useEffect(() => {
    const intro = buildIntroMessage(mode, selectedClient?.name);
    isInitialMount.current = true;
    setMessages([
      {
        id: `${mode}-${selectedClient?.id ?? "general"}`,
        role: "assistant",
        content: intro,
        timestamp: new Date(),
      },
    ]);
  }, [mode, selectedClient?.id, selectedClient?.name]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (mode === "account" && !selectedClientId) {
      toast.error("Select a client account", {
        description: "Choose which client you want me to analyze before sending a question.",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await sendChatbotMessage(
        {
          message: userMessage.content,
          mode,
          clientId: mode === "account" ? Number(selectedClientId) : undefined,
        },
        authToken,
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chatbot request failed";
      toast.error("Chatbot unavailable", { description: message });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const generalSuggestions = [
    "Which accounts need immediate attention?",
    "What's the average ROAS across all clients?",
    "How can I improve conversion rates?",
    "Show me top performing accounts",
  ];

  const accountSuggestions = [
    "Summarize this client's top winning campaigns",
    "Where are we wasting budget right now?",
    "What actions will improve ROAS next week?",
    "Give me optimization ideas for this account",
  ];

  const suggestedQuestions = mode === "account" ? accountSuggestions : generalSuggestions;

  const modeDisplayLabel = mode === "account" ? selectedClient?.name ?? "Select a client" : "General assistant";

  return (
    <Card>
      <CardHeader className="border-b space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">AI Assistant</CardTitle>
            <p className="text-xs text-slate-500">Switch between general help or account-specific guidance.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Assistant mode</span>
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
              <button
                onClick={() => setMode("general")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  mode === "general" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                General chat
              </button>
              <button
                onClick={() => setMode("account")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  mode === "account" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Account-specific
              </button>
            </div>
            <span className="text-xs text-slate-500">Context: {modeDisplayLabel}</span>
          </div>

          {mode === "account" && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Select a client account to ground responses in their ads data and receive targeted suggestions.
              </p>
              <Select
                value={selectedClientId ?? ""}
                onValueChange={(value) => setSelectedClientId(value)}
                disabled={clientsLoading}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Choose a client"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                  {!clients.length && !clientsLoading && (
                    <SelectItem value="no-clients" disabled>
                      No clients available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback
                    className={
                      message.role === "assistant"
                        ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }
                  >
                    {message.role === "assistant" ? (
                      <Bot className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex-1 ${
                    message.role === "user" ? "flex justify-end" : ""
                  }`}
                >
                  <div
                    className={`inline-block max-w-[85%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === "user"
                          ? "text-blue-100"
                          : "text-slate-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-slate-100 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {messages.length === 1 && (
          <div className="px-4 pb-3 border-t pt-3">
            <p className="text-xs text-slate-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(question)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t bg-slate-50">
          <div className="flex gap-2">
            <Input
              placeholder={
                mode === "account"
                  ? "Ask about this client's performance, optimizations..."
                  : "Ask about account performance, recommendations..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
