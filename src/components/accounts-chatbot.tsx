import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AccountsChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your AI Agency Analyst assistant. I can help you with insights about your client accounts, performance analysis, and recommendations. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  };

  useEffect(() => {
    // Skip scroll on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Response logic based on keywords
    if (lowerMessage.includes("roas") || lowerMessage.includes("return on ad spend")) {
      return "Based on the current data, your average ROAS across all clients is performing well. TechCorp Solutions has the highest ROAS at 5.2x, while FitLife Gym needs attention at 1.8x. I recommend focusing on optimizing FitLife's ad targeting and creative strategy to improve their return.";
    } else if (lowerMessage.includes("critical") || lowerMessage.includes("warning")) {
      return "You currently have 3 clients in critical status and 2 in warning status. The critical accounts are: FitLife Gym (high CPA), EcoGreen Products (low CTR), and another requiring immediate attention. I can help you create action bundles to address these issues. Would you like me to suggest specific optimizations?";
    } else if (lowerMessage.includes("budget") || lowerMessage.includes("spend") || lowerMessage.includes("ad spend")) {
      return "Your total ad spend across all clients is $127,500. The highest spenders are TechCorp Solutions ($45,000) and StyleHub Boutique ($28,000). Based on performance, I recommend redistributing budget from underperforming campaigns to those with ROAS above 3.5x.";
    } else if (lowerMessage.includes("conversion") || lowerMessage.includes("conversions")) {
      return "Conversion performance varies across accounts. HomeChef Delivery shows a +23% increase in conversions, while FitLife Gym has a -15% decline. I suggest implementing conversion tracking optimizations and testing new ad copy for underperforming accounts.";
    } else if (lowerMessage.includes("best") || lowerMessage.includes("top") || lowerMessage.includes("performing")) {
      return "Your top performing clients are: 1) TechCorp Solutions (5.2x ROAS, 245 conversions), 2) HomeChef Delivery (4.8x ROAS, strong growth trend), and 3) StyleHub Boutique (4.1x ROAS, consistent performance). These accounts demonstrate excellent targeting and creative strategies worth replicating.";
    } else if (lowerMessage.includes("recommend") || lowerMessage.includes("suggestion") || lowerMessage.includes("improve")) {
      return "Here are my top recommendations: 1) Pause underperforming keywords with CTR below 2% for FitLife Gym and EcoGreen Products. 2) Increase budget for TechCorp's top-performing campaigns by 20%. 3) Implement responsive search ads for all accounts lacking them. 4) Set up automated bidding strategies for accounts still using manual CPC. Would you like detailed action steps for any of these?";
    } else if (lowerMessage.includes("manager") || lowerMessage.includes("strategist")) {
      return "Your ad managers are handling multiple accounts. Sarah Chen manages the most clients and has the highest average ROAS at 4.2x. Mike Rodriguez has 2 clients in warning status and may need support. Consider redistributing workload or providing additional training resources.";
    } else if (lowerMessage.includes("ctr") || lowerMessage.includes("click-through rate") || lowerMessage.includes("click through")) {
      return "Click-through rates vary significantly. The highest CTR is 6.8% (TechCorp Solutions) and lowest is 2.1% (EcoGreen Products). Industry benchmarks suggest aiming for 4-6% CTR. I recommend A/B testing ad copy and using more compelling calls-to-action for accounts below 3%.";
    } else if (lowerMessage.includes("cpa") || lowerMessage.includes("cost per")) {
      return "Cost per acquisition ranges from $18 (TechCorp) to $95 (FitLife Gym). The high CPAs are concerning for FitLife and EcoGreen. I suggest improving landing page quality scores, refining audience targeting, and testing different bidding strategies to reduce acquisition costs.";
    } else if (lowerMessage.includes("help") || lowerMessage.includes("what can you")) {
      return "I can help you with: \n• Performance analysis and insights\n• Budget and spend optimization\n• ROAS and conversion tracking\n• Identifying critical issues\n• Account health monitoring\n• Manager workload analysis\n• Competitive recommendations\n• Custom reporting suggestions\n\nJust ask me anything about your client accounts!";
    } else {
      return "That's a great question! Based on your current account data, I can provide insights on performance metrics, budget optimization, conversion trends, and strategic recommendations. Could you be more specific about which aspect you'd like to explore? For example, you could ask about ROAS performance, critical accounts, or budget allocation.";
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "Which accounts need immediate attention?",
    "What's the average ROAS across all clients?",
    "How can I improve conversion rates?",
    "Show me top performing accounts",
  ];

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">AI Assistant</CardTitle>
            <p className="text-xs text-slate-500">Ask me anything about your accounts</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96 p-4" ref={scrollAreaRef}>
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
              placeholder="Ask about account performance, recommendations..."
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
