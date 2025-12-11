import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, X, MessageCircle, Plus, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { mockClients } from "../lib/mock-data";
import { useData } from "../lib/data-context";
import { formatCurrency } from "../lib/currencies";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachedData?: string[];
}

interface ClientChatbotProps {
  clientName: string;
}

export function ClientChatbot({ clientName }: ClientChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hi! I'm your AI assistant for ${clientName}. I can help you with account insights, daily task status, recent updates, and performance recommendations. What would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedData, setAttachedData] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const { clients } = useData();
  const availableClients = clients.length ? clients : mockClients;
  // Get client data from data provider (fallback to mock)
  const client = availableClients.find(c => c.name === clientName);

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

  const getContextualResponse = (message: string, data: string[]): string => {
    const hasMetrics = data.some(d => 
      d.includes("ROAS") || d.includes("CPA") || d.includes("CTR") || 
      d.includes("Conversions") || d.includes("Ad Spend")
    );
    
    if (hasMetrics) {
      return `Looking at the metrics you've attached, here's what stands out: The current performance shows ${client?.roas || "N/A"}x ROAS with ${client?.conversions || 0} conversions. The CPA is ${formatCurrency(client?.cpa ?? 0, client?.currencyCode)} and CTR is ${client?.ctr || 0}%. ${
        message.includes("improve") || message.includes("optimize")
          ? "To improve these numbers, I recommend focusing on high-performing keywords, testing new ad copy, and optimizing landing pages for better conversion rates."
          : "These metrics indicate " + (client && client.roas > 3 ? "strong performance" : "room for improvement") + ". Would you like specific recommendations?"
      }`;
    }
    
    if (data.some(d => d.includes("Task"))) {
      return "With the task data attached, I can see we need to focus on completing the pending yellow-status days. Prioritize keyword optimization and ad copy testing to prevent these from becoming critical.";
    }
    
    return "The data looks good. What specific aspect would you like me to analyze further?";
  };

  const dataPoints = [
    { label: "ROAS", value: `${client?.roas || "N/A"}x` },
    { label: "CPA", value: formatCurrency(client?.cpa ?? 0, client?.currencyCode) },
    { label: "CTR", value: `${client?.ctr || 0}%` },
    { label: "Conversions", value: `${client?.conversions || 0}` },
    { label: "Ad Spend", value: formatCurrency(client?.adSpend ?? 0, client?.currencyCode) },
    { label: "Clicks", value: `${client?.clicks?.toLocaleString() || 0}` },
    { label: "Impressions", value: `${client?.impressions?.toLocaleString() || 0}` },
    { label: "Revenue", value: formatCurrency(client?.revenue ?? 0, client?.currencyCode) },
    { label: "Status", value: client?.status || "Unknown" },
    { label: "Manager", value: client?.manager || "Unassigned" },
    { label: "Task Completion", value: "18/29 days completed" },
    { label: "Critical Days", value: "4 days" },
    { label: "Pending Days", value: "7 days" },
  ];

  const toggleDataPoint = (label: string, value: string) => {
    const dataStr = `${label}: ${value}`;
    if (attachedData.includes(dataStr)) {
      setAttachedData(attachedData.filter(d => d !== dataStr));
    } else {
      setAttachedData([...attachedData, dataStr]);
    }
  };

  const clearAttachedData = () => {
    setAttachedData([]);
  };

  const generateResponse = (userMessage: string, dataContext?: string[]): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // If there's attached data, provide contextual response
    if (dataContext && dataContext.length > 0) {
      const contextStr = dataContext.join(", ");
      return `Based on the data you've provided (${contextStr}), here's my analysis for ${clientName}: ${getContextualResponse(lowerMessage, dataContext)}`;
    }

    // Response logic based on keywords
    if (lowerMessage.includes("task") || lowerMessage.includes("daily") || lowerMessage.includes("checklist")) {
      return `For ${clientName}, this month we have 18 completed days (green), 7 pending days (yellow), and 4 critical days (red) that need immediate attention. The critical days are primarily from Oct 8-10 and Oct 15, where several optimization tasks were delayed. Would you like me to show you the specific tasks that need completion?`;
    } else if (lowerMessage.includes("critical") || lowerMessage.includes("alert") || lowerMessage.includes("issue")) {
      return "The critical issues detected are: 1) CPA spike of +23% on Oct 29 - currently under investigation, 2) CTR drop of -8% in Search campaign on Oct 26, 3) Several days with incomplete optimization tasks. I recommend addressing the CPA spike first by reviewing recent bid adjustments and audience targeting changes.";
    } else if (lowerMessage.includes("update") || lowerMessage.includes("action") || lowerMessage.includes("change")) {
      return "Recent updates for this account include: Today (Oct 30) - Keyword bids increased by 12% for Q4 Campaign at 9:15 AM by Sarah Johnson. Yesterday - 15 negative keywords added to reduce wasted spend, ad copy updated for mobile campaigns, and budget reallocation of $2,500 to high-performing campaigns. Would you like details on any specific update?";
    } else if (lowerMessage.includes("performance") || lowerMessage.includes("metrics") || lowerMessage.includes("kpi")) {
      return `${clientName} is showing strong overall performance with healthy status indicators. Key metrics are trending positively with good ROAS and conversion rates. However, monitor the recent CPA increase and ensure the optimization tasks from critical days are completed to maintain momentum.`;
    } else if (lowerMessage.includes("recommend") || lowerMessage.includes("suggest") || lowerMessage.includes("improve")) {
      return "My recommendations for this account: 1) Complete the pending tasks on the 7 yellow days - prioritize keyword optimization and ad copy testing. 2) Address the critical CPA spike by analyzing the Oct 29 changes. 3) Schedule A/B testing for new ad creatives to improve CTR. 4) Review and update conversion tracking to ensure accuracy. 5) Consider increasing budget for top-performing campaigns identified this month.";
    } else if (lowerMessage.includes("budget") || lowerMessage.includes("spend")) {
      return "Budget was recently adjusted on Oct 28 with a $2,500 reallocation to high-performing campaigns. The account is pacing well for the month. Based on current performance, I recommend maintaining or slightly increasing the budget for campaigns with ROAS above 4x to maximize returns.";
    } else if (lowerMessage.includes("conversion") || lowerMessage.includes("lead")) {
      return "Conversion performance has been solid this month with several successful optimization rounds. The conversion tracking was recently updated on Oct 24 to ensure accuracy. The best performing days were Oct 24-26 where we saw peak conversion rates. Consider replicating the strategies used during those days.";
    } else if (lowerMessage.includes("pending") || lowerMessage.includes("yellow") || lowerMessage.includes("incomplete")) {
      return "There are 7 pending days (yellow status) with partially completed tasks. These include various optimization tasks like keyword research, ad copy testing, and bid adjustments that are in progress but not yet finalized. I recommend prioritizing these to prevent them from becoming critical. Would you like a detailed breakdown of pending tasks?";
    } else if (lowerMessage.includes("complete") || lowerMessage.includes("green") || lowerMessage.includes("success")) {
      return "Great news! 18 days this month show completed status (green) with all tasks successfully finished. These days had high task completion rates including regular monitoring, bid optimizations, negative keyword additions, and performance reporting. This represents about 62% task completion rate for the month.";
    } else if (lowerMessage.includes("help") || lowerMessage.includes("what can you")) {
      return `I can help you with ${clientName}: \n• Daily task status and completion tracking\n• Recent account updates and changes\n• Performance alerts and issues\n• Optimization recommendations\n• Budget and spend insights\n• Conversion tracking analysis\n• Historical performance trends\n\nJust ask me anything about this client's account!`;
    } else {
      return `That's a great question about ${clientName}! I can provide insights on daily task completion, recent updates, performance metrics, and optimization recommendations. Could you be more specific? For example, you could ask about critical issues, pending tasks, or recent account changes.`;
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
      attachedData: attachedData.length > 0 ? [...attachedData] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    const currentAttachedData = [...attachedData];
    setInputValue("");
    setAttachedData([]);
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(currentInput, currentAttachedData.length > 0 ? currentAttachedData : undefined),
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
    "Show me critical issues",
    "What tasks are pending?",
    "What were the recent updates?",
    "Give me performance recommendations",
  ];

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50 group hover:scale-110"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 z-50 shadow-2xl rounded-lg overflow-hidden">
          <Card className="border-0">
            <CardHeader className="border-b bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">AI Assistant</CardTitle>
                    <p className="text-xs text-white/80">Ask about {clientName}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
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
                          {message.attachedData && message.attachedData.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1">
                              {message.attachedData.map((data, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className={`text-xs ${
                                    message.role === "user"
                                      ? "bg-blue-700 text-white border-blue-500"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  <Database className="w-3 h-3 mr-1" />
                                  {data}
                                </Badge>
                              ))}
                            </div>
                          )}
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
                {attachedData.length > 0 && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600">Attached Data ({attachedData.length})</span>
                      <button
                        onClick={clearAttachedData}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {attachedData.map((data, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200"
                          onClick={() => {
                            const [label, value] = data.split(": ");
                            toggleDataPoint(label, value);
                          }}
                        >
                          {data}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm text-slate-900 mb-1">Add Client Data</h4>
                          <p className="text-xs text-slate-500">
                            Select metrics to attach to your message for contextual analysis
                          </p>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-1">
                          {dataPoints.map((point) => {
                            const dataStr = `${point.label}: ${point.value}`;
                            const isSelected = attachedData.includes(dataStr);
                            return (
                              <button
                                key={point.label}
                                onClick={() => toggleDataPoint(point.label, point.value)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                                  isSelected
                                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <span>{point.label}</span>
                                <span className="text-xs">{point.value}</span>
                              </button>
                            );
                          })}
                        </div>
                        {attachedData.length > 0 && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => setIsPopoverOpen(false)}
                          >
                            Done ({attachedData.length} selected)
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    placeholder="Ask about this client account..."
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
        </div>
      )}
    </>
  );
}
