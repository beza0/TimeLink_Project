import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { Search, Send, Check, X } from "lucide-react";
import { useState } from "react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { formatTemplate } from "../i18n/messages";

interface MessagesPageProps {
  onNavigate?: (page: PageType) => void;
}

const conversations = [
  {
    id: "1",
    user: {
      name: "Sarah Martinez",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    lastMessage: "Great! Looking forward to our session tomorrow.",
    time: "2 min ago",
    unread: 2,
    status: "accepted"
  },
  {
    id: "2",
    user: {
      name: "Marcus Johnson",
      image: "https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    lastMessage: "Hi! I'd love to learn guitar from you. Are you available?",
    time: "1 hour ago",
    unread: 1,
    status: "pending-incoming",
    isPendingRequest: true
  },
  {
    id: "3",
    user: {
      name: "Emily Chen",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    lastMessage: "Hi! I'm interested in your piano lessons.",
    time: "2 hours ago",
    unread: 0,
    status: "pending-outgoing",
    isPendingRequest: false
  }
];

const chatThread = [
  {
    id: "1",
    sender: "other",
    text: "Hi Alex! I'm interested in your web development course.",
    time: "10:30 AM"
  },
  {
    id: "2",
    sender: "me",
    text: "Hello Sarah! I'd be happy to help you learn web development. What's your current experience level?",
    time: "10:32 AM"
  },
  {
    id: "3",
    sender: "other",
    text: "I'm a complete beginner, but very motivated to learn!",
    time: "10:35 AM"
  },
  {
    id: "4",
    sender: "me",
    text: "Perfect! I love working with beginners. We can start with HTML and CSS basics.",
    time: "10:36 AM"
  },
  {
    id: "5",
    sender: "other",
    text: "Great! Looking forward to our session tomorrow.",
    time: "10:40 AM"
  }
];

export function MessagesPage({ onNavigate }: MessagesPageProps) {
  const { t } = useLanguage();
  const m = t.messagesPage;
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAcceptRequest = (convId: string) => {
    console.log("Accepted:", convId);
  };

  const handleRejectRequest = (convId: string) => {
    console.log("Rejected:", convId);
  };

  return (
    <PageLayout onNavigate={onNavigate} className="min-h-screen bg-gray-50">
      
      <div className="pt-20 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-[calc(100vh-7rem)]">
          <Card className="h-full rounded-2xl border-0 shadow-lg overflow-hidden flex flex-row">
            <div className="w-96 border-r border-gray-200 flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl text-gray-900 mb-4">{m.title}</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder={m.searchPlaceholder}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                      selectedConversation.id === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ImageWithFallback 
                        src={conv.user.image}
                        alt={conv.user.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm text-gray-900 truncate">{conv.user.name}</h3>
                          <span className="text-xs text-gray-500 flex-shrink-0">{conv.time}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                          {conv.unread > 0 && (
                            <Badge className="ml-2 flex-shrink-0">{conv.unread}</Badge>
                          )}
                        </div>
                        
                        {conv.status === "pending-incoming" && (
                          <Badge variant="secondary" className="mt-2">{m.pendingRequest}</Badge>
                        )}
                        {conv.status === "pending-outgoing" && (
                          <Badge variant="outline" className="mt-2">{m.waitingApproval}</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <ImageWithFallback 
                    src={selectedConversation.user.image}
                    alt={selectedConversation.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-gray-900">{selectedConversation.user.name}</h3>
                    <p className="text-xs text-gray-500">{m.activeNow}</p>
                  </div>
                </div>
              </div>

              {selectedConversation.status === "pending-incoming" && (
                <div className="p-4 bg-blue-50 border-b border-blue-100">
                  <p className="text-sm text-gray-700 mb-3">
                    {formatTemplate(m.wantsConnect, { name: selectedConversation.user.name })}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      onClick={() => handleAcceptRequest(selectedConversation.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {m.accept}
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(selectedConversation.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      {m.decline}
                    </Button>
                  </div>
                </div>
              )}

              {selectedConversation.status === "pending-outgoing" && (
                <div className="p-4 bg-yellow-50 border-b border-yellow-100">
                  <p className="text-sm text-gray-700">
                    {formatTemplate(m.waitingOutgoing, { name: selectedConversation.user.name })}
                  </p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.status === "accepted" ? (
                  chatThread.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-md ${msg.sender === "me" ? "order-2" : "order-1"}`}>
                        <div
                          className={`p-3 rounded-2xl ${
                            msg.sender === "me"
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-3">{msg.time}</p>
                      </div>
                    </div>
                  ))
                ) : selectedConversation.status === "pending-incoming" ? (
                  <div className="text-center text-gray-500 py-12">
                    <p className="mb-2">{m.messageRequest}</p>
                    <p className="text-sm">{m.acceptHint}</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <p className="mb-2">{m.requestSent}</p>
                    <p className="text-sm">
                      {formatTemplate(m.waitingAccept, { name: selectedConversation.user.name })}
                    </p>
                  </div>
                )}
              </div>

              {selectedConversation.status === "accepted" && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <Input 
                      placeholder={m.typeMessage}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && setMessageText("")}
                    />
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      
    </PageLayout>
  );
}
