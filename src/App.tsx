import { useState, useEffect, useCallback } from 'react';
import { Home, FileText, CheckSquare, User, Bell, MessageCircle, Camera, Wallet, Rss } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { MyRequests } from './components/MyRequests';
import { Approvals } from './components/Approvals';
import { Profile } from './components/Profile';
import { Feeds } from './components/Feeds';
import { Messages } from './components/Messages';
import { LandingPage } from './components/LandingPage';
import { AccountabillsWallet } from './components/AccountabillsWallet';
import { CameraCapture } from './components/CameraCapture';
import { ReviewRequest } from './components/ReviewRequest';
import { Notifications } from './components/Notifications';
import { getSession, signOut, getPartners, addPartner, removePartner, getMyRequests, getWalletBalance, getTransactions, getConversations, getNotifications, getFeed, getProfile } from './utils/api';
import { testBackendConnection } from './utils/testBackend';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface MoneyRequest {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  status: RequestStatus;
  submittedBy: string;
  approvers: string[];
  approvedBy?: string[];
  rejectedBy?: string;
  notes?: string;
  imageUrl?: string;
}

export interface Approver {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'approver' | 'viewer';
}

export interface FeedItem {
  id: string;
  type: 'submitted' | 'approved' | 'rejected' | 'comment';
  requestId: string;
  user: string;
  amount?: number;
  description: string;
  timestamp: string;
  status?: RequestStatus;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  recipient: string;
  text: string;
  timestamp: string;
  read: boolean;
  requestId?: string;
}

export interface Conversation {
  id: string;
  participant: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatar: string;
}

export interface Notification {
  id: string;
  type: 'friend_request' | 'approval_request' | 'request_reviewed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  requestId?: string;
  approverId?: string;
}

type View = 'dashboard' | 'requests' | 'approvals' | 'profile' | 'feeds' | 'messages' | 'wallet' | 'camera' | 'review' | 'notifications';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [previousView, setPreviousView] = useState<View>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<string | null>(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestStatus | undefined>(undefined);
  
  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // Initialize data when user logs in
  useEffect(() => {
    if (currentUser) {
      // Load data from backend
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      // Load partners
      const partnersData = await getPartners();
      setApprovers(partnersData.partners || []);

      // Load requests
      const requestsData = await getMyRequests();
      setRequests(requestsData.requests || []);

      // Load wallet balance
      const balanceData = await getWalletBalance();
      setWalletBalance(balanceData.balance || 0);

      // Load transactions
      const transactionsData = await getTransactions();
      setTransactions(transactionsData.transactions || []);

      // Load conversations
      const conversationsData = await getConversations();
      setConversations(conversationsData.conversations || []);

      // Load notifications
      const notificationsData = await getNotifications();
      setNotifications(notificationsData.notifications || []);

      // Load feed
      const feedData = await getFeed();
      setFeedItems(feedData.feed || []);

      // Set bank accounts (still using initial function since not in backend yet)
      setBankAccounts(getInitialBankAccounts());
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };
  
  // Demo data for John Doe only
  const getInitialRequests = (): MoneyRequest[] => {
    if (currentUser?.name === 'John Doe') {
      return [
        {
          id: '1',
          amount: 250.00,
          description: 'Office supplies for Q4',
          category: 'Office',
          date: '2024-11-20',
          status: 'pending',
          submittedBy: 'You',
          approvers: ['Sarah Chen'],
          imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400'
        },
        {
          id: '2',
          amount: 1500.00,
          description: 'Team building event',
          category: 'Events',
          date: '2024-11-18',
          status: 'approved',
          submittedBy: 'You',
          approvers: ['Sarah Chen'],
          approvedBy: ['Sarah Chen'],
          imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400'
        },
        {
          id: '3',
          amount: 450.00,
          description: 'Software licenses',
          category: 'Software',
          date: '2024-11-22',
          status: 'pending',
          submittedBy: 'Alex Martinez',
          approvers: ['You'],
          imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400'
        },
        {
          id: '4',
          amount: 800.00,
          description: 'Client dinner',
          category: 'Entertainment',
          date: '2024-11-15',
          status: 'rejected',
          submittedBy: 'You',
          approvers: ['Mike Johnson'],
          rejectedBy: 'Mike Johnson',
          notes: 'Please provide itemized receipt',
          imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'
        }
      ];
    }
    return [];
  };

  const getInitialApprovers = (): Approver[] => {
    if (currentUser?.name === 'John Doe') {
      return [
        { id: '1', name: 'Sarah Chen', email: 'sarah.chen@company.com', avatar: 'SC', role: 'approver' },
        { id: '2', name: 'Mike Johnson', email: 'mike.j@company.com', avatar: 'MJ', role: 'approver' },
        { id: '3', name: 'Emma Wilson', email: 'emma.w@company.com', avatar: 'EW', role: 'viewer' }
      ];
    }
    return [];
  };

  const getInitialWalletBalance = (): number => {
    return currentUser?.name === 'John Doe' ? 1250.50 : 0;
  };

  const getInitialTransactions = () => {
    if (currentUser?.name === 'John Doe') {
      return [
        { id: '1', type: 'approved', description: 'Team building event', amount: -1500.00, date: '2024-11-24', status: 'completed' },
        { id: '2', type: 'deposit', description: 'Added from Bank of America', amount: 2000.00, date: '2024-11-22', status: 'completed' },
        { id: '3', type: 'approved', description: 'Office supplies', amount: -250.00, date: '2024-11-20', status: 'completed' },
        { id: '4', type: 'withdraw', description: 'Instant withdrawal', amount: -500.00, date: '2024-11-18', status: 'completed', fee: 9.75 }
      ];
    }
    return [];
  };

  const getInitialBankAccounts = () => {
    if (currentUser?.name === 'John Doe') {
      return [
        { id: '1', name: 'Bank of America', accountNumber: '1234', status: 'Connected' }
      ];
    }
    return [];
  };

  const getInitialFeedItems = (): FeedItem[] => {
    if (currentUser?.name === 'John Doe') {
      return [
        {
          id: '1',
          type: 'approved',
          requestId: '2',
          user: 'Sarah Chen',
          amount: 1500.00,
          description: 'approved your request for Team building event',
          timestamp: '2024-11-24T10:30:00',
          status: 'approved'
        },
        {
          id: '2',
          type: 'submitted',
          requestId: '3',
          user: 'Alex Martinez',
          amount: 450.00,
          description: 'submitted a new request for Software licenses',
          timestamp: '2024-11-24T09:15:00',
          status: 'pending'
        },
        {
          id: '3',
          type: 'rejected',
          requestId: '4',
          user: 'Mike Johnson',
          amount: 800.00,
          description: 'rejected your request for Client dinner',
          timestamp: '2024-11-23T16:45:00',
          status: 'rejected'
        },
        {
          id: '4',
          type: 'submitted',
          requestId: '1',
          user: 'You',
          amount: 250.00,
          description: 'submitted a new request for Office supplies for Q4',
          timestamp: '2024-11-23T14:20:00',
          status: 'pending'
        }
      ];
    }
    return [];
  };

  const getInitialConversations = (): Conversation[] => {
    if (currentUser?.name === 'John Doe') {
      return [
        {
          id: '1',
          participant: 'Sarah Chen',
          lastMessage: 'Approved your team building request!',
          timestamp: '2024-11-24T10:30:00',
          unreadCount: 1,
          avatar: 'SC'
        },
        {
          id: '2',
          participant: 'Mike Johnson',
          lastMessage: 'Can you provide more details?',
          timestamp: '2024-11-23T16:45:00',
          unreadCount: 0,
          avatar: 'MJ'
        },
        {
          id: '3',
          participant: 'Alex Martinez',
          lastMessage: 'Thanks for approving!',
          timestamp: '2024-11-22T11:20:00',
          unreadCount: 0,
          avatar: 'AM'
        }
      ];
    }
    return [];
  };

  const getInitialMessages = (): Message[] => {
    if (currentUser?.name === 'John Doe') {
      return [
        {
          id: '1',
          conversationId: '1',
          sender: 'Sarah Chen',
          recipient: 'You',
          text: 'Approved your team building request!',
          timestamp: '2024-11-24T10:30:00',
          read: false
        },
        {
          id: '2',
          conversationId: '1',
          sender: 'You',
          recipient: 'Sarah Chen',
          text: 'Thank you for the quick approval!',
          timestamp: '2024-11-24T10:25:00',
          read: true
        },
        {
          id: '3',
          conversationId: '2',
          sender: 'Mike Johnson',
          recipient: 'You',
          text: 'Can you provide more details?',
          timestamp: '2024-11-23T16:45:00',
          read: true,
          requestId: '4'
        },
        {
          id: '4',
          conversationId: '2',
          sender: 'You',
          recipient: 'Mike Johnson',
          text: 'Sure, I will send the itemized receipt',
          timestamp: '2024-11-23T16:50:00',
          read: true
        }
      ];
    }
    return [];
  };

  const getInitialNotifications = (): Notification[] => {
    if (currentUser?.name === 'John Doe') {
      return [
        {
          id: '1',
          type: 'approval_request',
          title: 'New Approval Request',
          message: 'Alex Martinez sent a $450.00 request for Software licenses',
          timestamp: '2024-11-22T09:15:00',
          read: false,
          requestId: '3'
        },
        {
          id: '2',
          type: 'request_reviewed',
          title: 'Request Approved',
          message: 'Sarah Chen approved your $1,500.00 request for Team building event',
          timestamp: '2024-11-24T10:30:00',
          read: false,
          requestId: '2'
        },
        {
          id: '3',
          type: 'request_reviewed',
          title: 'Request Rejected',
          message: 'Mike Johnson rejected your $800.00 request for Client dinner',
          timestamp: '2024-11-23T16:45:00',
          read: true,
          requestId: '4'
        }
      ];
    }
    return [];
  };
  
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [approvalThreshold, setApprovalThreshold] = useState(50);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Calculate accessible funds from approved requests submitted by the user
  const accessibleFunds = requests
    .filter(req => req.submittedBy === 'You' && req.status === 'approved')
    .reduce((total, req) => total + req.amount, 0);

  const totalUnreadMessages = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const addRequest = (request: Omit<MoneyRequest, 'id'>) => {
    const newRequest = {
      ...request,
      id: Date.now().toString()
    };
    setRequests([newRequest, ...requests]);
    
    // Add feed item
    const feedItem: FeedItem = {
      id: Date.now().toString() + '-feed',
      type: 'submitted',
      requestId: newRequest.id,
      user: 'You',
      amount: newRequest.amount,
      description: `submitted a new request for ${newRequest.description}`,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    setFeedItems([feedItem, ...feedItems]);
    
    // Create notifications for approvers (if request is sent to someone else)
    if (newRequest.approvers && newRequest.approvers.length > 0) {
      newRequest.approvers.forEach(approverName => {
        if (approverName !== 'You') {
          const notification: Notification = {
            id: Date.now().toString() + '-notif-' + approverName,
            type: 'approval_request',
            title: 'New Approval Request',
            message: `You have a new $${newRequest.amount.toFixed(2)} request for ${newRequest.description}`,
            timestamp: new Date().toISOString(),
            read: false,
            requestId: newRequest.id
          };
          setNotifications(prev => [notification, ...prev]);
        }
      });
    }
  };

  const updateRequestStatus = (id: string, status: RequestStatus, notes?: string, approver?: string) => {
    setRequests(requests.map(req => {
      if (req.id === id) {
        const updates: Partial<MoneyRequest> = { status };
        if (status === 'approved' && approver) {
          updates.approvedBy = [...(req.approvedBy || []), approver];
        } else if (status === 'rejected' && approver) {
          updates.rejectedBy = approver;
        }
        if (notes) {
          updates.notes = notes;
        }
        
        // Add feed item
        const feedItem: FeedItem = {
          id: Date.now().toString() + '-feed',
          type: status === 'approved' ? 'approved' : 'rejected',
          requestId: id,
          user: approver || 'Unknown',
          amount: req.amount,
          description: `${status === 'approved' ? 'approved' : 'rejected'} ${req.submittedBy === 'You' ? 'your' : 'the'} request for ${req.description}`,
          timestamp: new Date().toISOString(),
          status
        };
        setFeedItems([feedItem, ...feedItems]);
        
        // Create notification for request submitter if it's their request
        if (req.submittedBy === 'You' && approver && approver !== 'You') {
          const notification: Notification = {
            id: Date.now().toString() + '-notif-review',
            type: 'request_reviewed',
            title: status === 'approved' ? 'Request Approved' : 'Request Rejected',
            message: `${approver} ${status === 'approved' ? 'approved' : 'rejected'} your $${req.amount.toFixed(2)} request for ${req.description}`,
            timestamp: new Date().toISOString(),
            read: false,
            requestId: id
          };
          setNotifications(prev => [notification, ...prev]);
        }
        
        return { ...req, ...updates };
      }
      return req;
    }));
  };

  const sendMessage = (conversationId: string, recipient: string, text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId,
      sender: 'You',
      recipient,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };
    setMessages([...messages, newMessage]);
    
    // Update conversation
    setConversations(conversations.map(conv => 
      conv.id === conversationId 
        ? { ...conv, lastMessage: text, timestamp: newMessage.timestamp }
        : conv
    ));
  };

  const addApprover = async (approver: Omit<Approver, 'id'>) => {
    try {
      // Call backend API to add partner
      const response = await addPartner({
        name: approver.name,
        email: approver.email,
        avatar: approver.avatar,
        role: approver.role
      });
      
      // Add to local state with the ID from backend
      const newApprover = response.partner;
      setApprovers([...approvers, newApprover]);
      
      // Create notification for friend request
      const notification: Notification = {
        id: Date.now().toString() + '-notif-friend',
        type: 'friend_request',
        title: 'New Accountability Partner',
        message: `${newApprover.name} was added as an accountability partner`,
        timestamp: new Date().toISOString(),
        read: false,
        approverId: newApprover.id
      };
      setNotifications(prev => [notification, ...prev]);
      
      console.log('✅ Partner added successfully:', newApprover);
    } catch (error) {
      console.error('❌ Failed to add partner:', error);
      throw error; // Propagate error so UI can handle it
    }
  };

  const removeApprover = async (id: string) => {
    try {
      // Call backend API to remove partner
      await removePartner(id);
      
      // Remove from local state
      setApprovers(approvers.filter(a => a.id !== id));
      
      console.log('✅ Partner removed successfully');
    } catch (error) {
      console.error('❌ Failed to remove partner:', error);
      throw error;
    }
  };
  
  const markNotificationAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };
  
  const markAllNotificationsAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };
  
  const markMessagesAsRead = useCallback((conversationId: string) => {
    // Mark all messages in this conversation as read
    setMessages(prevMessages => prevMessages.map(msg => 
      msg.conversationId === conversationId && msg.recipient === 'You'
        ? { ...msg, read: true }
        : msg
    ));
    
    // Update conversation unread count to 0
    setConversations(prevConversations => prevConversations.map(conv =>
      conv.id === conversationId
        ? { ...conv, unreadCount: 0 }
        : conv
    ));
  }, []); // Empty dependency array since we're using functional setState

  const handleLogout = async () => {
    try {
      await signOut();
      // Clear all state
      setIsLoggedIn(false);
      setCurrentUser(null);
      setRequests([]);
      setApprovers([]);
      setWalletBalance(0);
      setFeedItems([]);
      setConversations([]);
      setMessages([]);
      setNotifications([]);
      setCurrentView('dashboard');
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard
          requests={requests}
          addRequest={addRequest}
          approvers={approvers}
          walletBalance={walletBalance}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToMessages={() => setCurrentView('messages')}
          onNavigateToNotifications={() => setCurrentView('notifications')}
          unreadNotificationsCount={unreadNotificationsCount}
          onNavigateToReview={(requestId) => {
            setSelectedRequestForReview(requestId);
            setCurrentView('review');
          }}
          onNavigateToRequests={(statusFilter) => {
            setRequestStatusFilter(statusFilter);
            setCurrentView('requests');
          }}
          capturedImage={capturedImage}
          onClearCapturedImage={() => setCapturedImage(null)}
          currentUser={currentUser}
        />;
      case 'requests':
        return <MyRequests 
          requests={requests.filter(r => r.submittedBy === 'You')} 
          initialFilter={requestStatusFilter}
          onBack={() => setCurrentView('dashboard')}
        />;
      case 'approvals':
        return <Approvals 
          requests={requests.filter(r => r.approvers.includes('You'))} 
          updateRequestStatus={updateRequestStatus} 
          onNavigateBack={() => setCurrentView('dashboard')}
        />; 
      case 'feeds':
        return <Feeds feedItems={feedItems} requests={requests} approvers={approvers} updateRequestStatus={updateRequestStatus} onNavigateToProfile={() => setCurrentView('profile')} currentUser={currentUser} />;
      case 'messages':
        return <Messages 
          conversations={conversations} 
          messages={messages} 
          sendMessage={sendMessage} 
          approvers={approvers} 
          onNavigateToProfile={() => setCurrentView('profile')}
          markMessagesAsRead={markMessagesAsRead}
        />; 
      case 'wallet':
        return <AccountabillsWallet 
          balance={walletBalance} 
          setBalance={setWalletBalance} 
          accessibleFunds={accessibleFunds} 
          onNavigateToProfile={() => setCurrentView('profile')} 
          transactions={transactions}
          bankAccounts={bankAccounts}
          currentUser={currentUser}
        />; 
      case 'camera':
        return <CameraCapture onClose={() => setCurrentView('dashboard')} onCapture={(mediaUrl, isVideo) => {
          if (!isVideo) {
            // Store the captured image and navigate back to dashboard
            setCapturedImage(mediaUrl);
          }
          setCurrentView('dashboard');
        }} />;
      case 'notifications':
        return <Notifications 
          notifications={notifications} 
          onBack={() => setCurrentView('dashboard')}
          onMarkAsRead={markNotificationAsRead}
          onMarkAllAsRead={markAllNotificationsAsRead}
          onNavigateToRequest={(requestId) => {
            setPreviousView('notifications');
            setSelectedRequestForReview(requestId);
            setCurrentView('review');
          }}
        />;
      case 'profile':
        return <Profile 
          approvers={approvers} 
          addApprover={addApprover} 
          removeApprover={removeApprover}
          approvalThreshold={approvalThreshold}
          setApprovalThreshold={setApprovalThreshold}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onLogout={handleLogout}
          currentUser={currentUser}
          onMessageApprover={(approverId) => {
            // Find the approver and navigate to messages
            const approver = approvers.find(a => a.id === approverId);
            if (approver) {
              // Check if conversation exists, if not create one
              const existingConv = conversations.find(c => c.participant === approver.name);
              if (!existingConv) {
                const newConv: Conversation = {
                  id: Date.now().toString(),
                  participant: approver.name,
                  lastMessage: '',
                  timestamp: new Date().toISOString(),
                  unreadCount: 0,
                  avatar: approver.avatar
                };
                setConversations([newConv, ...conversations]);
              }
              setCurrentView('messages');
            }
          }}
        />;
      case 'review':
        const requestToReview = requests.find(r => r.id === selectedRequestForReview);
        if (!requestToReview) return null;
        return <ReviewRequest
          request={requestToReview}
          onBack={() => setCurrentView(previousView)}
          onReview={updateRequestStatus}
        />;
      default:
        return <Dashboard
          requests={requests}
          addRequest={addRequest}
          approvers={approvers}
          walletBalance={walletBalance}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToMessages={() => setCurrentView('messages')}
          onNavigateToNotifications={() => setCurrentView('notifications')}
          unreadNotificationsCount={unreadNotificationsCount}
        />;
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      // Test backend connection
      console.log('🔍 Testing backend connection...');
      await testBackendConnection();
      
      // Check for existing session
      const session = await getSession();
      if (session?.access_token) {
        console.log('✅ Session found with access token');
        
        try {
          // Get user profile from backend
          console.log('🔵 Fetching user profile...');
          const { profile } = await getProfile();
          
          setIsLoggedIn(true);
          setCurrentUser({ 
            name: profile.name, 
            email: profile.email 
          });
          
          console.log('✅ User logged in:', profile.name);
        } catch (error) {
          console.error('❌ Failed to fetch profile:', error);
          // Session might be invalid, clear it
          console.log('🔄 Clearing invalid session...');
          await signOut();
        }
      } else {
        console.log('ℹ️ No active session found');
      }
    };
    checkSession();
  }, []);

  if (!isLoggedIn) {
    return <LandingPage onLogin={async (user) => {
      console.log('✅ Login callback received for:', user.name);
      setIsLoggedIn(true);
      setCurrentUser(user);
    }} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        {renderView()}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 max-w-md mx-auto">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              currentView === 'dashboard' ? 'text-[#9E89FF]' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => setCurrentView('feeds')}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              currentView === 'feeds' ? 'text-[#9E89FF]' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Rss className="w-6 h-6" />
            <span className="text-xs mt-1">Feed</span>
          </button>
          <button
            onClick={() => setCurrentView('camera')}
            className="flex flex-col items-center justify-center flex-1 h-full -mt-8"
          >
            <div className="w-14 h-14 bg-[#9E89FF] rounded-full flex items-center justify-center shadow-lg">
              <Camera className="w-7 h-7 text-white" />
            </div>
          </button>
          <button
            onClick={() => setCurrentView('wallet')}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              currentView === 'wallet' ? 'text-[#9E89FF]' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-xs mt-1">Wallet</span>
          </button>
          <button
            onClick={() => setCurrentView('messages')}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              currentView === 'messages' ? 'text-[#9E89FF]' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs mt-1">Messages</span>
          </button>
        </div>
      </nav>
    </div>
  );
}