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

export function AIRecommendationsChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your AI Recommendations assistant. I can help you understand AI-generated insights, prioritize recommendations, and create action bundles. What would you like to know?",
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
    if (lowerMessage.includes("priority") || lowerMessage.includes("urgent") || lowerMessage.includes("critical")) {
      return "Currently, you have 8 high-priority recommendations requiring immediate action. The most critical ones are: 1) Pause underperforming keywords for FitLife Gym (projected to save $3,200/month), 2) Increase budget for TechCorp's top campaigns ($4,500 potential revenue increase), and 3) Implement responsive search ads for EcoGreen Products (15-25% CTR improvement expected).";
    } else if (lowerMessage.includes("budget") || lowerMessage.includes("increase") || lowerMessage.includes("decrease")) {
      return "I've identified 5 budget optimization recommendations. For high-performing campaigns like TechCorp Solutions, increasing budget by 15-20% could drive an additional $4,500 in monthly revenue. Conversely, reducing spend on underperforming keywords in FitLife Gym's campaigns could save $3,200/month with minimal impact.";
    } else if (lowerMessage.includes("keyword") || lowerMessage.includes("pause")) {
      return "There are 12 recommendations to pause underperforming keywords across your accounts. FitLife Gym has 8 keywords with CTR below 1.5% and high CPA that should be paused immediately. EcoGreen Products has 4 similar keywords. Pausing these could reduce wasted spend by up to $4,800/month.";
    } else if (lowerMessage.includes("ctr") || lowerMessage.includes("click-through") || lowerMessage.includes("responsive")) {
      return "Implementing responsive search ads is recommended for 6 accounts. Based on historical data, this could improve CTR by 15-25%. EcoGreen Products and FitLife Gym would benefit most, potentially increasing their CTR from 2.1% to 2.8-3.2%, leading to better Quality Scores and lower CPAs.";
    } else if (lowerMessage.includes("bundle") || lowerMessage.includes("action bundle") || lowerMessage.includes("create")) {
      return "You can create action bundles by grouping related recommendations. I suggest creating: 1) 'FitLife Optimization Bundle' (pause keywords + adjust bids), 2) 'Budget Reallocation Bundle' (increase high performers, decrease low performers), and 3) 'Ad Format Update Bundle' (implement RSAs across multiple accounts). Would you like help creating any of these?";
    } else if (lowerMessage.includes("revenue") || lowerMessage.includes("impact") || lowerMessage.includes("potential")) {
      return "The projected impact of implementing all recommendations is significant: Potential revenue increase of $12,800/month and cost savings of $6,500/month. The highest-impact recommendations are budget increases for TechCorp (+$4,500/month) and StyleHub (+$3,200/month), combined with keyword optimizations across underperforming accounts.";
    } else if (lowerMessage.includes("techcorp") || lowerMessage.includes("tech corp")) {
      return "TechCorp Solutions has 3 active recommendations: 1) Increase budget for top-performing campaigns (High Priority - $4,500 potential revenue), 2) Add negative keywords to reduce wasted spend (Medium Priority - $800 savings), and 3) Test new ad copy variations (Medium Priority - 10-15% CTR improvement). The budget increase should be implemented first.";
    } else if (lowerMessage.includes("fitlife") || lowerMessage.includes("fit life")) {
      return "FitLife Gym has 4 critical recommendations requiring immediate attention: 1) Pause 8 underperforming keywords ($3,200 monthly savings), 2) Implement responsive search ads (15-25% CTR improvement), 3) Adjust bidding strategy to Target CPA ($1,800 cost reduction), and 4) Improve landing page quality score. Start with pausing underperforming keywords for immediate impact.";
    } else if (lowerMessage.includes("implement") || lowerMessage.includes("apply") || lowerMessage.includes("execute")) {
      return "To implement recommendations: 1) Review and approve each recommendation in the dashboard, 2) Create action bundles for related changes, 3) Schedule implementation during low-traffic hours to minimize disruption, 4) Monitor performance for 7-14 days post-implementation, and 5) Adjust based on results. I recommend starting with high-priority items and implementing in batches.";
    } else if (lowerMessage.includes("how many") || lowerMessage.includes("count") || lowerMessage.includes("total")) {
      return "You currently have 24 active AI recommendations across all clients: 8 High Priority, 11 Medium Priority, and 5 Low Priority. These span multiple optimization types including budget adjustments (5), keyword optimizations (12), ad format updates (6), and bidding strategy changes (4).";
    } else if (lowerMessage.includes("help") || lowerMessage.includes("what can you")) {
      return "I can help you with: \n• Understanding recommendation priorities\n• Analyzing potential impact and ROI\n• Creating and managing action bundles\n• Identifying quick wins and high-impact changes\n• Account-specific recommendation details\n• Implementation strategies and timing\n• Performance predictions and projections\n\nJust ask me anything about your AI recommendations!";
    } else {
      return "That's a great question! I can provide insights on recommendation priorities, potential revenue impact, implementation strategies, and help you create action bundles. Could you be more specific? For example, you could ask about high-priority recommendations, potential revenue impact, or specific client recommendations.";
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
    "What are the high-priority recommendations?",
    "How much revenue can I gain from these recommendations?",
    "Help me create an action bundle for FitLife Gym",
    "Which recommendations should I implement first?",
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
            <p className="text-xs text-slate-500">Ask me about recommendations and optimization strategies</p>
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
              placeholder="Ask about recommendations, impact, priorities..."
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
