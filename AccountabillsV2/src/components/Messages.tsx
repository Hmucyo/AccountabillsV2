import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, ArrowLeft, UserPlus, Users, X, Camera, Check, Plus, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { Conversation, Message, Approver } from '../App';
import {
  GroupWithMembers,
  GroupMessage,
  getGroups,
  createGroup as apiCreateGroup,
  updateGroup as apiUpdateGroup,
  deleteGroup as apiDeleteGroup,
  addGroupMember as apiAddGroupMember,
  removeGroupMember as apiRemoveGroupMember,
  getGroupMessages,
  sendGroupMessage,
  subscribeToGroupMessages,
  supabase
} from '../utils/api';

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
  
  // Group state - now uses API types
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  
  // Group chat state
  const [activeGroupChat, setActiveGroupChat] = useState<GroupWithMembers | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Create group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Approver[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  // File input refs
  const createGroupFileInputRef = useRef<HTMLInputElement>(null);
  const editGroupFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch groups from API
  const fetchGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const data = await getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, messages, selectedConversation, scrollToBottom]);

  // Subscribe to real-time group messages
  useEffect(() => {
    if (!activeGroupChat) return;

    const unsubscribe = subscribeToGroupMessages(activeGroupChat.id, (newMessage) => {
      setGroupMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [activeGroupChat]);

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

  // Handle sending group message
  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeGroupChat || sendingMessage) return;

    try {
      setSendingMessage(true);
      await sendGroupMessage(activeGroupChat.id, messageText.trim());
      setMessageText('');
      // Refresh groups to update last message
      fetchGroups();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Open group chat
  const openGroupChat = async (group: GroupWithMembers) => {
    setActiveGroupChat(group);
    setLoadingMessages(true);
    try {
      const messages = await getGroupMessages(group.id);
      setGroupMessages(messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
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

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0 || creatingGroup) return;
    
    try {
      setCreatingGroup(true);
      // Use userId (actual user ID) not id (friend record ID) for group members
      const memberIds = selectedMembers.map(m => m.userId);
      console.log('Creating group with members:', memberIds, selectedMembers);
      
      if (memberIds.some(id => !id)) {
        console.error('Some members have undefined userId:', selectedMembers);
        alert('Error: Some selected members have invalid IDs. Please refresh and try again.');
        return;
      }
      
      await apiCreateGroup(newGroupName.trim(), newGroupAvatarUrl, memberIds);
      await fetchGroups();
      resetCreateGroupForm();
      setShowCreateGroup(false);
    } catch (error: any) {
      console.error('Failed to create group:', error);
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error) || 'Unknown error';
      alert('Failed to create group: ' + errorMessage);
    } finally {
      setCreatingGroup(false);
    }
  };

  const resetCreateGroupForm = () => {
    setNewGroupName('');
    setNewGroupAvatarUrl(null);
    setSelectedMembers([]);
  };

  const openGroupDetails = (group: GroupWithMembers, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
  const handleEditGroupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedGroup) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageUrl = reader.result as string;
        try {
          await apiUpdateGroup(selectedGroup.id, { avatar_url: imageUrl });
          await fetchGroups();
          setSelectedGroup(prev => prev ? { ...prev, avatar_url: imageUrl } : null);
        } catch (error) {
          console.error('Failed to update group avatar:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const updateGroupName = async (name: string) => {
    if (selectedGroup && name.trim()) {
      try {
        await apiUpdateGroup(selectedGroup.id, { name: name.trim() });
        setSelectedGroup(prev => prev ? { ...prev, name: name.trim() } : null);
        // Refresh groups after a small delay to avoid too many requests while typing
      } catch (error) {
        console.error('Failed to update group name:', error);
      }
    }
  };

  // Debounced group name update
  const [pendingGroupName, setPendingGroupName] = useState<string>('');
  const groupNameTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleGroupNameChange = (name: string) => {
    setPendingGroupName(name);
    if (groupNameTimeoutRef.current) {
      clearTimeout(groupNameTimeoutRef.current);
    }
    groupNameTimeoutRef.current = setTimeout(() => {
      if (name.trim()) {
        updateGroupName(name);
      }
    }, 500);
  };

  useEffect(() => {
    if (selectedGroup) {
      setPendingGroupName(selectedGroup.name);
    }
  }, [selectedGroup]);

  const addMemberToGroup = async (approver: Approver) => {
    if (!selectedGroup) return;
    
    // Check if already a member
    if (selectedGroup.members.some(m => m.user_id === approver.id)) return;
    
    try {
      await apiAddGroupMember(selectedGroup.id, approver.id);
      await fetchGroups();
      // Update selected group with new member
      const updatedGroups = await getGroups();
      const updatedGroup = updatedGroups.find(g => g.id === selectedGroup.id);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
      }
      setShowAddMembers(false);
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const removeMemberFromGroup = async (userId: string) => {
    if (!selectedGroup) return;
    
    if (selectedGroup.members.length <= 1) return; // Keep at least one member
    
    try {
      await apiRemoveGroupMember(selectedGroup.id, userId);
      await fetchGroups();
      // Update selected group
      const updatedGroups = await getGroups();
      const updatedGroup = updatedGroups.find(g => g.id === selectedGroup.id);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const deleteGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      await apiDeleteGroup(selectedGroup.id);
      await fetchGroups();
      setSelectedGroup(null);
      setShowGroupDetails(false);
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  // Default group avatar component
  const GroupAvatar = ({ avatarUrl, size = 'md', className = '' }: { avatarUrl: string | null | undefined; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
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
    ? approvers.filter(a => !selectedGroup.members.some(m => m.user_id === a.id))
    : [];

  // Group Chat View
  if (activeGroupChat) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
        {/* Chat Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => {
              setActiveGroupChat(null);
              setGroupMessages([]);
            }}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={() => openGroupDetails(activeGroupChat)}
            className="flex items-center gap-3 flex-1"
          >
            <GroupAvatar avatarUrl={activeGroupChat.avatar_url} size="sm" className="w-10 h-10" />
            <div className="flex-1 text-left">
              <p className="text-gray-900 dark:text-white font-medium">{activeGroupChat.name}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                {activeGroupChat.members.length} members
              </p>
            </div>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#9E89FF] animate-spin" />
            </div>
          ) : groupMessages.length === 0 ? (
            <div className="text-center py-12">
              <GroupAvatar avatarUrl={activeGroupChat.avatar_url} size="lg" className="mx-auto mb-3" />
              <p className="text-gray-900 dark:text-white font-medium mb-1">{activeGroupChat.name}</p>
              <p className="text-gray-500 dark:text-gray-400">Start a conversation with your group</p>
            </div>
          ) : (
            <>
              {groupMessages.map((message) => {
                const isFromUser = message.sender_id === currentUserId;
                const senderName = message.sender?.name || 'Unknown';
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] ${isFromUser ? 'order-2' : 'order-1'}`}>
                      {!isFromUser && (
                        <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 ml-2">{senderName}</p>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isFromUser
                            ? 'bg-[#9E89FF] text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm'
                        }`}
                      >
                        <p>{message.content}</p>
                      </div>
                      <p className={`text-gray-500 dark:text-gray-400 text-xs mt-1 ${isFromUser ? 'text-right mr-2' : 'ml-2'}`}>
                        {getTimeAgo(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendGroupMessage} className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg">
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
              disabled={!messageText.trim() || sendingMessage}
              className="bg-[#9E89FF] text-white p-3 rounded-full hover:bg-[#8B76F0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {sendingMessage ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

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
            <>
              {conversationMessages.map((message) => {
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
              })}
              <div ref={messagesEndRef} />
            </>
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
      {loadingGroups ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#9E89FF] animate-spin" />
        </div>
      ) : groups.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-3 px-1">Groups</h2>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => openGroupChat(group)}
                className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-[#9E89FF] hover:shadow-md transition-all text-left"
              >
                <div className="flex gap-3">
                  <div
                    onClick={(e) => openGroupDetails(group, e)}
                    className="relative flex-shrink-0 cursor-pointer"
                  >
                    <GroupAvatar avatarUrl={group.avatar_url} size="sm" />
                    {group.unreadCount && group.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {group.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-gray-900 dark:text-white font-medium">{group.name}</p>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {group.lastMessage?.created_at ? getTimeAgo(group.lastMessage.created_at) : ''}
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                      {group.members.length} members
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
                      {group.lastMessage?.content || 'Tap to start chatting'}
                    </p>
                  </div>
                  <div
                    onClick={(e) => openGroupDetails(group, e)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
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
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-900 dark:text-white text-xl font-semibold">Create Group Chat</h3>
                <button 
                  onClick={() => {
                    resetCreateGroupForm();
                    setShowCreateGroup(false);
                  }} 
                  className="text-gray-600 dark:text-gray-400"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Select participants for the group chat</p>
            </div>
            
            {/* Group Name Input */}
            <div className="px-4 pb-4">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group Name"
                className="w-full pl-8 pr-5 py-4 mt-2 mb-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9E89FF] text-base"
              />
            </div>

            {/* Participants List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {approvers.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <UserPlus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No friends to add yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Add partners in your Profile first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {approvers.map((approver) => {
                    const isSelected = selectedMembers.some(m => m.id === approver.id);
                    // Get initials from name
                    const initials = approver.name.split(' ').map(n => n[0]).join('').toUpperCase();
                    return (
                      <button
                        key={approver.id}
                        onClick={() => toggleMemberSelection(approver)}
                        className={`w-full rounded-xl p-4 flex items-center gap-3 transition-colors border ${
                          isSelected 
                            ? 'bg-purple-50 dark:bg-gray-700 border-[#9E89FF]' 
                            : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:border-[#9E89FF]'
                        }`}
                      >
                        <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-gray-900 dark:text-white font-medium">{approver.name}</p>
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                            approver.role === 'approver' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          }`}>
                            {approver.role === 'approver' ? 'Approver' : 'Viewer'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Hidden file input for avatar (kept for future use) */}
            <input
              ref={createGroupFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCreateGroupImageUpload}
              className="hidden"
            />

            {/* Create Button */}
            <div className="p-4 pt-2">
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className={`w-full py-4 rounded-full font-semibold text-lg transition-all ${
                  selectedMembers.length > 0 && newGroupName.trim()
                    ? 'bg-[#9E89FF] text-white hover:bg-[#8B76F0]'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Group ({selectedMembers.length} selected)
              </button>
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
                  fetchGroups(); // Refresh groups on close
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
                {selectedGroup.avatar_url ? (
                  <div className="relative">
                    <img 
                      src={selectedGroup.avatar_url} 
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
                value={pendingGroupName}
                onChange={(e) => handleGroupNameChange(e.target.value)}
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
                {selectedGroup.members.map((member) => {
                  const memberName = member.profile?.name || member.profile?.email || 'Unknown';
                  const memberInitials = memberName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const isAdmin = member.role === 'admin';
                  
                  return (
                    <div
                      key={member.id}
                      className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white font-medium">
                        {member.profile?.avatar || memberInitials}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white">{memberName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isAdmin 
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      {selectedGroup.members.length > 1 && member.user_id !== currentUserId && (
                        <button
                          onClick={() => removeMemberFromGroup(member.user_id)}
                          className="text-red-500 hover:text-red-600 p-2"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  );
                })}
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