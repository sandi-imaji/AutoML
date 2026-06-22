"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Send,
    Bot,
    User,
    Sparkles,
    Loader2,
    MessageSquare,
    Copy,
    Check,
    RefreshCw,
    MoreVertical,
    Trash2,
    Settings,
    Zap,
    Brain,
    HelpCircle,
    AlertCircle
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Mock initial messages for demo
const initialMessages = [
    {
        id: 1,
        role: "assistant",
        content: "Halo! How can I assist you today?",
        timestamp: new Date(Date.now() - 60000),
    },
];

// Typing indicator component
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-3">
            <div className="flex gap-1">
                <span className="w-2.5 h-2.5 bg-violet-500/80 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2.5 h-2.5 bg-violet-500/80 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2.5 h-2.5 bg-violet-500/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm text-muted-foreground ml-2">Thinking ...</span>
        </div>
    );
}

// Message bubble component
function MessageBubble({ message, onCopy, onRegenerate, copiedId }) {
    const isUser = message.role === "user";
    const isCopied = copiedId === message.id;

    return (
        <div
            className={`flex gap-4 group animate-in slide-in-from-bottom duration-300 ${isUser ? "flex-row-reverse" : ""
                }`}
        >
            {/* Avatar */}
            <Avatar className={`h-10 w-10 shrink-0 shadow-lg ${isUser ? "ring-2 ring-blue-500/30" : "ring-2 ring-violet-500/30"}`}>
                {isUser ? (
                    <>
                        <AvatarImage src="/avatars/user.png" />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm font-semibold">
                            U
                        </AvatarFallback>
                    </>
                ) : (
                    <>
                        <AvatarImage src="/avatars/ai.png" />
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white">
                            <Sparkles className="h-5 w-5" />
                        </AvatarFallback>
                    </>
                )}
            </Avatar>

            {/* Message content */}
            <div className={`flex flex-col gap-1.5 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                {/* Sender name */}
                <span className={`text-xs font-medium px-1 ${isUser ? "text-blue-600 dark:text-blue-400" : "text-violet-600 dark:text-violet-400"}`}>
                    {isUser ? "You" : "IMAJI Assistant"}
                </span>

                <div
                    className={`relative px-5 py-4 rounded-2xl shadow-md ${isUser
                        ? "bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 text-white rounded-tr-md"
                        : "bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-tl-md"
                        }`}
                >
                    {/* Message text with markdown support */}
                    <div
                        className={`text-sm leading-relaxed prose prose-sm max-w-none ${
                            isUser 
                                ? "prose-invert text-white [&_*]:text-white [&_strong]:text-white [&_a]:text-blue-200 [&_a:hover]:text-blue-100 [&_code]:text-white [&_code]:bg-white/20 [&_pre]:bg-white/10 [&_pre]:text-white [&_blockquote]:border-white/30 [&_blockquote]:text-white/90 [&_table]:border-white/30 [&_th]:border-white/30 [&_td]:border-white/30" 
                                : "prose-gray dark:prose-invert [&_a]:text-blue-600 [&_a:hover]:text-blue-500 dark:[&_a]:text-blue-400 dark:[&_a:hover]:text-blue-300"
                        }`}
                    >
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                pre: ({ node, ...props }) => (
                                    <div className="overflow-auto rounded-lg my-2 p-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                                        <pre {...props} className="m-0 p-0 bg-transparent border-0 text-xs" />
                                    </div>
                                ),
                                code: ({ node, inline, ...props }) => (
                                    inline 
                                        ? <code {...props} className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 text-xs font-mono" />
                                        : <code {...props} className="text-xs font-mono text-gray-800 dark:text-gray-200" />
                                ),
                                table: ({ node, ...props }) => (
                                    <div className="overflow-auto my-2">
                                        <table {...props} className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs" />
                                    </div>
                                ),
                                th: ({ node, ...props }) => (
                                    <th {...props} className="px-3 py-2 text-left font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" />
                                ),
                                td: ({ node, ...props }) => (
                                    <td {...props} className="px-3 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700" />
                                ),
                                blockquote: ({ node, ...props }) => (
                                    <blockquote {...props} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic text-gray-600 dark:text-gray-400" />
                                ),
                                ul: ({ node, ...props }) => (
                                    <ul {...props} className="list-disc list-inside my-2 space-y-1" />
                                ),
                                ol: ({ node, ...props }) => (
                                    <ol {...props} className="list-decimal list-inside my-2 space-y-1" />
                                ),
                                li: ({ node, ...props }) => (
                                    <li {...props} className="ml-1" />
                                ),
                                h1: ({ node, ...props }) => (
                                    <h1 {...props} className="text-xl font-bold my-3 text-gray-900 dark:text-gray-100" />
                                ),
                                h2: ({ node, ...props }) => (
                                    <h2 {...props} className="text-lg font-bold my-2.5 text-gray-900 dark:text-gray-100" />
                                ),
                                h3: ({ node, ...props }) => (
                                    <h3 {...props} className="text-base font-bold my-2 text-gray-900 dark:text-gray-100" />
                                ),
                                hr: ({ node, ...props }) => (
                                    <hr {...props} className="my-3 border-gray-200 dark:border-gray-700" />
                                ),
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>

                    {/* Action buttons - visible on hover for AI messages */}
                    {!isUser && (
                        <div className="absolute -bottom-9 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            onClick={() => onCopy(message.id, message.content)}
                                        >
                                            {isCopied ? (
                                                <Check className="h-3.5 w-3.5 text-green-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">{isCopied ? "Tersalin!" : "Salin pesan"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            onClick={() => onRegenerate(message.id)}
                                        >
                                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">Regenerate</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                <span className="text-[11px] text-muted-foreground px-1">
                    {message.timestamp.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </span>
            </div>
        </div>
    );
}

// Quick action cards
function QuickActionCard({ icon: Icon, title, description, onClick, gradient }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-start gap-2 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg text-left group`}
        >
            <div className={`p-2 rounded-lg ${gradient}`}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
        </button>
    );
}

// Main Chat Page Component
export default function ChatbotPage() {
    const [messages, setMessages] = useState(initialMessages);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [error, setError] = useState(null);
    const scrollAreaRef = useRef(null);
    const inputRef = useRef(null);

    const quickActions = [
        {
            icon: Zap,
            title: "BMS Assistant",
            description: "BMS Assistant",
            prompt: "What's BMS Data Center?",
            gradient: "bg-gradient-to-br from-amber-500 to-orange-500"
        },
        {
            icon: Brain,
            title: "Smartlink",
            description: "Q&A about Smartlink",
            prompt: "What's Smartlink ?",
            gradient: "bg-gradient-to-br from-violet-500 to-purple-500"
        },
        {
            icon: HelpCircle,
            title: "Point Diagnosis",
            description: "Point Diagnosis",
            prompt: "Please check point name JK-1",
            gradient: "bg-gradient-to-br from-rose-500 to-pink-500"
        },
    ];

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, isTyping]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Handle send message with API call
    const handleSendMessage = async (customMessage) => {
        const messageText = customMessage || inputValue.trim();
        if (!messageText) return;

        const userMessage = {
            id: Date.now(),
            role: "user",
            content: messageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsTyping(true);
        setError(null);

        try {
            // Call API endpoint
            const chatHost = process.env.NEXT_PUBLIC_HOST_AGENT || '0.0.0.0'
            const chatPort = process.env.NEXT_PUBLIC_PORT_AGENT || '8005'
            const response = await fetch(`http://${chatHost}:${chatPort}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: messageText
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Extract response from API
            const aiResponse = data.response || "Maaf, tidak ada respons dari server.";

            const aiMessage = {
                id: Date.now() + 1,
                role: "assistant",
                content: aiResponse,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (err) {
            console.error("Error calling API:", err);
            const errorMessage = {
                id: Date.now() + 1,
                role: "assistant",
                content: `**⚠️ Terjadi kesalahan saat menghubungi server:**\n\n${err.message}\n\nPastikan server API berjalan di http://localhost:8005/chat`,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, errorMessage]);
            setError(err.message);
        } finally {
            setIsTyping(false);
        }
    };

    // Handle copy message
    const handleCopy = (id, content) => {
        // Remove HTML tags before copying
        const cleanContent = content.replace(/<br\/>/g, '\n').replace(/<[^>]*>/g, '');
        navigator.clipboard.writeText(cleanContent);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Handle regenerate message
    const handleRegenerate = async (id) => {
        // Find the user message that prompted this response
        const messageIndex = messages.findIndex(m => m.id === id);
        if (messageIndex > 0) {
            const previousUserMessage = messages[messageIndex - 1];
            if (previousUserMessage.role === "user") {
                // Remove the AI message and regenerate
                setMessages(prev => prev.filter(m => m.id !== id));
                await handleSendMessage(previousUserMessage.content);
            }
        }
    };

    // Handle clear chat
    const handleClearChat = () => {
        setMessages(initialMessages);
        setError(null);
    };

    // Handle key press
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const showQuickActions = messages.length <= 1 && !isTyping;

    return (
        <div className="h-[calc(100vh-8rem)] flex gap-6">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 border-b border-gray-200/80 dark:border-gray-800/80">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar className="h-12 w-12 ring-2 ring-violet-500/30 shadow-lg">
                                <AvatarImage src="/avatars/ai-large.png" />
                                <AvatarFallback className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white">
                                    <Sparkles className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chat IMAJI</h1>
                                <Badge className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0">
                                    AI Powered
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                Online
                            </p>
                        </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={handleClearChat} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Hapus Riwayat
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Pengaturan
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea ref={scrollAreaRef} className="h-full">
                        <div className="flex flex-col gap-8 p-6 pb-32">
                            {/* Error Alert */}
                            {error && (
                                <Alert variant="destructive" className="animate-in slide-in-from-top">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Koneksi ke server gagal. Pastikan API berjalan di http://localhost:8005/chat
                                    </AlertDescription>
                                </Alert>
                            )}

                            {messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    onCopy={handleCopy}
                                    onRegenerate={handleRegenerate}
                                    copiedId={copiedId}
                                />
                            ))}

                            {/* Quick Actions - Show when only welcome message */}
                            {showQuickActions && (
                                <div className="mt-4">
                                    <p className="text-sm text-muted-foreground mb-4 font-medium">✨ Quick Actions:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {quickActions.map((action, index) => (
                                            <QuickActionCard
                                                key={index}
                                                icon={action.icon}
                                                title={action.title}
                                                description={action.description}
                                                gradient={action.gradient}
                                                onClick={() => handleSendMessage(action.prompt)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Typing indicator */}
                            {isTyping && (
                                <div className="flex gap-4 animate-in slide-in-from-bottom">
                                    <Avatar className="h-10 w-10 shrink-0 ring-2 ring-violet-500/30 shadow-lg">
                                        <AvatarFallback className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white">
                                            <Sparkles className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl rounded-tl-md shadow-md">
                                        <TypingIndicator />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Input area */}
                <div className="flex-shrink-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/80 dark:border-gray-800/80">
                    <div className="flex items-center gap-3 max-w-4xl mx-auto">
                        <div className="flex-1 relative">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message here..."
                                className="pr-4 py-6 text-base rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all shadow-sm"
                                disabled={isTyping}
                            />
                        </div>
                        <Button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isTyping}
                            className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all shrink-0"
                        >
                            {isTyping ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3">
                        Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">Shift+Enter</kbd> to new line
                    </p>
                </div>
            </div>

            {/* Right Sidebar - Chat History/Info */}
            <div className="hidden xl:flex w-72 flex-col gap-4">
                {/* Chat Info Card */}
                <Card className="border-gray-200/80 dark:border-gray-800/80 shadow-lg">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-violet-500" />
                            About IMAJI Chat
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-2">
                        <p>IMAJI is an AI Assistant specifically designed to assist you in BMS..</p>
                        <p className="text-[11px] italic">Powered by Imaji Otomasi Integra</p>
                    </CardContent>
                </Card>

                {/* Capabilities Card */}
                <Card className="border-gray-200/80 dark:border-gray-800/80 shadow-lg flex-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Features
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            { icon: "⚙️", text: "BMS Assistant" },
                            { icon: "🔍", text: "Point Diagnosis" },
                            { icon: "💡", text: "Q&A about Smartlink" },
                        ].map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span>{item.icon}</span>
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
