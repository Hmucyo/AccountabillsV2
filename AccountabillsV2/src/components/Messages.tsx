import { useState, useEffect, useRef } from 'react';
import { Search, Send, ArrowLeft, UserPlus, Users, X, Camera, Check, Plus, ChevronRight, Trash2, Upload } from 'lucide-react';
import { Conversation, Message, Approver } from '../App';

// Group type for UI
interface Group {
  id: string;
  name: string;
  avatarUrl: string | null; // Image URL or null for default
  members: Approver[];
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

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
  
  // Group state
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  
  // Create group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Approver[]>([]);
  
  // File input refs
  const createGroupFileInputRef = useRef<HTMLInputElement>(null);
  const editGroupFileInputRef = useRef<HTMLInputElement>(null);

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

  // Group functions
  const toggleMemberSelection = (approver: Approver) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === approver.id);
      if (isSelected) {
        return prev.filter(m => m.id !== approver.id);
      } else {
        return [...prev, approver];
      }
    });
  };

  const createGroup = () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    const newGroup: Group = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      avatarUrl: newGroupAvatarUrl,
      members: selectedMembers,
      createdAt: new Date().toISOString(),
      unreadCount: 0
    };
    
    setGroups(prev => [...prev, newGroup]);
    resetCreateGroupForm();
    setShowCreateGroup(false);
  };

  const resetCreateGroupForm = () => {
    setNewGroupName('');
    setNewGroupAvatarUrl(null);
    setSelectedMembers([]);
  };

  const openGroupDetails = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  // Handle image upload for create group
  const handleCreateGroupImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGroupAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image upload for edit group
  const handleEditGroupImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedGroup) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setGroups(prev => prev.map(g => 
          g.id === selectedGroup.id ? { ...g, avatarUrl: imageUrl } : g
        ));
        setSelectedGroup(prev => prev ? { ...prev, avatarUrl: imageUrl } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateGroupName = (name: string) => {
    if (selectedGroup && name.trim()) {
      setGroups(prev => prev.map(g => 
        g.id === selectedGroup.id ? { ...g, name: name.trim() } : g
      ));
      setSelectedGroup(prev => prev ? { ...prev, name: name.trim() } : null);
    }
  };

  const addMemberToGroup = (approver: Approver) => {
    if (!selectedGroup) return;
    
    // Check if already a member
    if (selectedGroup.members.some(m => m.id === approver.id)) return;
    
    const updatedMembers = [...selectedGroup.members, approver];
    setGroups(prev => prev.map(g => 
      g.id === selectedGroup.id ? { ...g, members: updatedMembers } : g
    ));
    setSelectedGroup(prev => prev ? { ...prev, members: updatedMembers } : null);
    setShowAddMembers(false);
  };

  const removeMemberFromGroup = (memberId: string) => {
    if (!selectedGroup) return;
    
    const updatedMembers = selectedGroup.members.filter(m => m.id !== memberId);
    if (updatedMembers.length === 0) return; // Keep at least one member
    
    setGroups(prev => prev.map(g => 
      g.id === selectedGroup.id ? { ...g, members: updatedMembers } : g
    ));
    setSelectedGroup(prev => prev ? { ...prev, members: updatedMembers } : null);
  };

  const deleteGroup = () => {
    if (!selectedGroup) return;
    setGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
    setSelectedGroup(null);
    setShowGroupDetails(false);
  };

  // Default group avatar component
  const GroupAvatar = ({ avatarUrl, size = 'md', className = '' }: { avatarUrl: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
    const sizeClasses = {
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-24 h-24'
    };
    
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt="Group" 
          className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        />
      );
    }
    
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-[#9E89FF] to-[#7B68EE] rounded-full flex items-center justify-center shadow-md ${className}`}>
        <Users className={`${size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-7 h-7' : 'w-5 h-5'} text-white`} />
      </div>
    );
  };

  // Get friends that are not already in the selected group
  const availableFriendsForGroup = selectedGroup 
    ? approvers.filter(a => !selectedGroup.members.some(m => m.id === a.id))
    : [];

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
          <h1 className="text-gray-900 dark:text-white text-xl font-semibold">Messages</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="bg-[#9E89FF] text-white px-4 py-2 rounded-full hover:bg-[#8B76F0] transition-colors shadow-md flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Group</span>
            </button>
            <button
              onClick={() => setShowNewChat(true)}
              className="bg-[#9E89FF] text-white p-2 rounded-full hover:bg-[#8B76F0] transition-colors shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
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

      {/* Groups Section */}
      {groups.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-3 px-1">Groups</h2>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-[#9E89FF] hover:shadow-md transition-all"
              >
                <div className="flex gap-3">
                  <button
                    onClick={() => openGroupDetails(group)}
                    className="relative flex-shrink-0"
                  >
                    <GroupAvatar avatarUrl={group.avatarUrl} size="sm" />
                    {group.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {group.unreadCount}
                      </span>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-gray-900 dark:text-white font-medium">{group.name}</p>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {group.lastMessageTime ? getTimeAgo(group.lastMessageTime) : ''}
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                      {group.members.length} members
                    </p>
                    <p className={`text-gray-600 dark:text-gray-400 text-sm truncate ${group.unreadCount > 0 ? 'font-medium text-gray-900 dark:text-white' : ''}`}>
                      {group.lastMessage || 'Tap to start chatting'}
                    </p>
                  </div>
                  <button
                    onClick={() => openGroupDetails(group)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct Messages Section */}
      {(conversations.length > 0 || groups.length > 0) && (
        <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-3 px-1">Direct Messages</h2>
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

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => {
                  resetCreateGroupForm();
                  setShowCreateGroup(false);
                }} 
                className="text-[#9E89FF] font-medium"
              >
                Cancel
              </button>
              <h3 className="text-gray-900 dark:text-white font-semibold">New Group</h3>
              <button 
                onClick={createGroup}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className="text-[#9E89FF] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
            
            {/* Group Avatar & Name */}
            <div className="flex flex-col items-center mb-6">
              {/* Avatar Upload */}
              <div className="relative mb-4">
                {newGroupAvatarUrl ? (
                  <div className="relative">
                    <img 
                      src={newGroupAvatarUrl} 
                      alt="Group" 
                      className="w-24 h-24 rounded-full object-cover shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setNewGroupAvatarUrl(null)}
                      className="absolute -top-1 -right-1 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => createGroupFileInputRef.current?.click()}
                    className="w-24 h-24 bg-gradient-to-br from-[#9E89FF] to-[#7B68EE] rounded-full flex flex-col items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
                  >
                    <Camera className="w-8 h-8 text-white mb-1" />
                    <span className="text-white text-xs">Add Photo</span>
                  </button>
                )}
                <input
                  ref={createGroupFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCreateGroupImageUpload}
                  className="hidden"
                />
              </div>
              
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group Name"
                className="text-center text-lg font-medium bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-[#9E89FF] outline-none py-2 px-4 text-gray-900 dark:text-white placeholder-gray-400 w-full max-w-xs"
              />
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                  {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-[#9E89FF] bg-opacity-20 text-[#9E89FF] px-3 py-1.5 rounded-full flex items-center gap-2 text-sm"
                    >
                      <span>{member.avatar}</span>
                      <span>{member.name}</span>
                      <button
                        onClick={() => toggleMemberSelection(member)}
                        className="hover:bg-[#9E89FF] hover:bg-opacity-30 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add Members */}
            <div>
              <p className="text-gray-900 dark:text-white font-medium mb-3">Add Friends to Group</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                Only your friends/partners can be added
              </p>
              
              {approvers.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <UserPlus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No friends to add yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Add partners in your Profile first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {approvers.map((approver) => {
                    const isSelected = selectedMembers.some(m => m.id === approver.id);
                    return (
                      <button
                        key={approver.id}
                        onClick={() => toggleMemberSelection(approver)}
                        className={`w-full rounded-xl p-4 flex items-center gap-3 transition-all border ${
                          isSelected 
                            ? 'bg-[#9E89FF] bg-opacity-10 border-[#9E89FF]' 
                            : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white">
                          <span>{approver.avatar}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-gray-900 dark:text-white">{approver.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            approver.role === 'approver' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          }`}>
                            {approver.role === 'approver' ? 'Approver' : 'Viewer'}
                          </span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-[#9E89FF] border-[#9E89FF]' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Details Modal (iMessage style) */}
      {showGroupDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowGroupDetails(false);
                  setSelectedGroup(null);
                }} 
                className="text-[#9E89FF] font-medium"
              >
                Done
              </button>
              <h3 className="text-gray-900 dark:text-white font-semibold">Group Info</h3>
              <div className="w-12" /> {/* Spacer for alignment */}
            </div>
            
            {/* Group Avatar & Name */}
            <div className="flex flex-col items-center py-6 px-4 border-b border-gray-200 dark:border-gray-800">
              {/* Avatar with upload */}
              <div className="relative mb-4">
                {selectedGroup.avatarUrl ? (
                  <div className="relative">
                    <img 
                      src={selectedGroup.avatarUrl} 
                      alt="Group" 
                      className="w-24 h-24 rounded-full object-cover shadow-lg"
                    />
                    <button
                      onClick={() => editGroupFileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-[#9E89FF] text-white p-2 rounded-full hover:bg-[#8B76F0] shadow-md"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => editGroupFileInputRef.current?.click()}
                    className="w-24 h-24 bg-gradient-to-br from-[#9E89FF] to-[#7B68EE] rounded-full flex flex-col items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
                  >
                    <Camera className="w-8 h-8 text-white mb-1" />
                    <span className="text-white text-xs">Add Photo</span>
                  </button>
                )}
                <input
                  ref={editGroupFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditGroupImageUpload}
                  className="hidden"
                />
              </div>
              
              <input
                type="text"
                value={selectedGroup.name}
                onChange={(e) => updateGroupName(e.target.value)}
                className="text-center text-xl font-semibold bg-transparent border-b-2 border-transparent focus:border-[#9E89FF] outline-none py-1 text-gray-900 dark:text-white"
              />
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {selectedGroup.members.length} participants
              </p>
            </div>
            
            {/* Members Section */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-900 dark:text-white font-medium">Members</p>
                {availableFriendsForGroup.length > 0 && (
                  <button
                    onClick={() => setShowAddMembers(true)}
                    className="text-[#9E89FF] text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {selectedGroup.members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white">
                      <span>{member.avatar}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">{member.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        member.role === 'approver' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      }`}>
                        {member.role === 'approver' ? 'Approver' : 'Viewer'}
                      </span>
                    </div>
                    {selectedGroup.members.length > 1 && (
                      <button
                        onClick={() => removeMemberFromGroup(member.id)}
                        className="text-red-500 hover:text-red-600 p-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Danger Zone */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={deleteGroup}
                className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembers && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-[60]">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md p-6 max-h-[70vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setShowAddMembers(false)} 
                className="text-[#9E89FF] font-medium"
              >
                Cancel
              </button>
              <h3 className="text-gray-900 dark:text-white font-semibold">Add Members</h3>
              <div className="w-12" /> {/* Spacer */}
            </div>
            
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Only friends/partners not already in the group
            </p>
            
            {availableFriendsForGroup.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Users className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">All friends are already in this group</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableFriendsForGroup.map((approver) => (
                  <button
                    key={approver.id}
                    onClick={() => addMemberToGroup(approver)}
                    className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-xl p-4 flex items-center gap-3 transition-colors border border-transparent hover:border-[#9E89FF]"
                  >
                    <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white">
                      <span>{approver.avatar}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-gray-900 dark:text-white">{approver.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        approver.role === 'approver' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      }`}>
                        {approver.role === 'approver' ? 'Approver' : 'Viewer'}
                      </span>
                    </div>
                    <Plus className="w-5 h-5 text-[#9E89FF]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}