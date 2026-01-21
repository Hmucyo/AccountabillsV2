import { useState, useEffect } from 'react';
import { Search, Send, ArrowLeft, UserPlus, User } from 'lucide-react';
import { Conversation, Message, Approver } from '../App';

interface MessagesProps {
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (conversationId: string, recipient: string, text: string) => void;
  approvers: Approver[];
  onNavigateToProfile?: () => void;
  markMessagesAsRead?: (conversationId: string) => void;
}

export function Messages({ conversations, messages, sendMessage, approvers, onNavigateToProfile, markMessagesAsRead }: MessagesProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  // Sort conversations by timestamp (latest first)
  const sortedConversations = [...conversations].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filteredConversations = sortedConversations.filter(conv =>
    conv.participant.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    sendMessage(selectedConversation.id, selectedConversation.participant, messageText);
    setMessageText('');
  };

  const conversationMessages = selectedConversation
    ? messages.filter(m => m.conversationId === selectedConversation.id)
    : [];

  const startNewConversation = (approver: Approver) => {
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.participant === approver.name);
    if (existingConv) {
      setSelectedConversation(existingConv);
      setShowNewChat(false);
      return;
    }

    // Create new conversation
    const newConv: Conversation = {
      id: Date.now().toString(),
      participant: approver.name,
      lastMessage: '',
      timestamp: new Date().toISOString(),
      unreadCount: 0,
      avatar: approver.avatar
    };
    setSelectedConversation(newConv);
    setShowNewChat(false);
  };

  // Get approvers that don't have active conversations
  const availableToChat = approvers.filter(
    approver => !conversations.some(conv => conv.participant === approver.name)
  );

  useEffect(() => {
    if (selectedConversation && markMessagesAsRead) {
      markMessagesAsRead(selectedConversation.id);
    }
  }, [selectedConversation, markMessagesAsRead]);

  if (selectedConversation) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
        {/* Chat Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setSelectedConversation(null)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-[#9E89FF] rounded-full flex items-center justify-center text-white">
            <span>{selectedConversation.avatar}</span>
          </div>
          <div className="flex-1">
            <p className="text-gray-900 dark:text-white">{selectedConversation.participant}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Active now</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversationMessages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#9E89FF] rounded-full flex items-center justify-center text-white mx-auto mb-3">
                <span className="text-2xl">{selectedConversation.avatar}</span>
              </div>
              <p className="text-gray-900 dark:text-white mb-1">{selectedConversation.participant}</p>
              <p className="text-gray-500 dark:text-gray-400">Start a conversation about your spending requests</p>
            </div>
          ) : (
            conversationMessages.map((message) => {
              const isFromUser = message.sender === 'You';
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${isFromUser ? 'order-2' : 'order-1'}`}>
                    {!isFromUser && (
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 ml-2">{message.sender}</p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isFromUser
                          ? 'bg-[#9E89FF] text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm'
                      }`}
                    >
                      <p>{message.text}</p>
                    </div>
                    <p className={`text-gray-500 dark:text-gray-400 text-xs mt-1 ${isFromUser ? 'text-right mr-2' : 'ml-2'}`}>
                      {getTimeAgo(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="bg-[#9E89FF] text-white p-3 rounded-full hover:bg-[#8B76F0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-gray-900 dark:text-white">Messages</h1>
          {approvers.length > 0 && (
            <button
              onClick={() => setShowNewChat(true)}
              className="bg-[#9E89FF] text-white p-2 rounded-full hover:bg-[#8B76F0] transition-colors shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">Chat with your accountability partners</p>
      </div>

      {/* Search */}
      {conversations.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="space-y-2">
        {approvers.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <UserPlus className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No accountability partners yet</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">Add partners in your Profile to start messaging</p>
          </div>
        ) : filteredConversations.length === 0 && conversations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Send className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No conversations yet</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">Tap on an accountability partner above to start chatting</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Search className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-[#9E89FF] hover:shadow-md transition-all text-left"
            >
              <div className="flex gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white">
                    <span>{conversation.avatar}</span>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-gray-900 dark:text-white">{conversation.participant}</p>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {getTimeAgo(conversation.timestamp)}
                    </span>
                  </div>
                  <p className={`text-gray-600 dark:text-gray-400 truncate ${conversation.unreadCount > 0 ? 'font-medium text-gray-900 dark:text-white' : ''}`}>
                    {conversation.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white">New Message</h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-600 dark:text-gray-400">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">Select an accountability partner to message</p>
            
            <div className="space-y-2">
              {approvers.map(approver => {
                const hasConversation = conversations.some(c => c.participant === approver.name);
                return (
                  <button
                    key={approver.id}
                    onClick={() => startNewConversation(approver)}
                    className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-xl p-4 flex items-center gap-3 transition-colors border border-transparent hover:border-[#9E89FF]"
                  >
                    <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white">
                      <span>{approver.avatar}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-gray-900 dark:text-white">{approver.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          approver.role === 'approver' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                            : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        }`}>
                          {approver.role === 'approver' ? 'Approver' : 'Viewer'}
                        </span>
                        {hasConversation && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">• Active chat</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}