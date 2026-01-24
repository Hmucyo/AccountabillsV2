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
import {
  getSession,
  signOut,
  getWalletBalance,
  getMyRequests,
  getRequestsToApprove,
  createRequest as apiCreateRequest,
  updateRequestStatus as apiUpdateRequestStatus,
  checkBackendHealth,
  getCurrentUser,
  getAccessToken,
  initializeUser,
  getTransactions,
  getCard,
  createCard,
  CardData
} from './utils/api';

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

// Helper to transform API request to UI format
const transformApiRequest = (apiReq: any, currentUserName: string): MoneyRequest => ({
  id: apiReq.id,
  amount: apiReq.amount,
  description: apiReq.description,
  category: apiReq.category || 'Other',
  date: apiReq.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
  status: apiReq.status,
  submittedBy: apiReq.senderName === currentUserName ? 'You' : apiReq.senderName,
  approvers: apiReq.approvers?.map((a: any) => a.name === currentUserName ? 'You' : a.name) || [],
  approvedBy: apiReq.approvedBy?.map((a: any) => a.name) || [],
  rejectedBy: apiReq.rejectedBy?.name,
  notes: apiReq.notes,
  imageUrl: apiReq.imageUrl
});

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [previousView, setPreviousView] = useState<View>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<string | null>(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestStatus | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
  const [userCard, setUserCard] = useState<CardData | null>(null);

  // Fetch data from API when user logs in
  const fetchUserData = useCallback(async () => {
    if (!currentUser) return;

    // Check if we have an auth token before making API calls
    const token = getAccessToken();
    if (!token) {
      console.log('No auth token available, skipping data fetch');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch wallet balance, transactions, and card from Marqeta
      try {
        const [balanceData, transactionsData, cardData] = await Promise.all([
          getWalletBalance().catch(e => { console.error('Balance error:', e); return { balance: 0 }; }),
          getTransactions().catch(e => { console.error('Transactions error:', e); return []; }),
          getCard().catch(e => { console.error('Card error:', e); return { hasCard: false, card: null }; })
        ]);
        setWalletBalance(balanceData.balance || 0);
        
        // Transform Marqeta transactions to our format
        const formattedTransactions = (transactionsData || []).map((tx: any) => ({
          id: tx.token || tx.id,
          type: tx.type,
          description: tx.memo || tx.type || 'Transaction',
          amount: tx.amount || 0,
          date: tx.created_time || tx.createdTime || new Date().toISOString(),
          status: tx.state || 'completed'
        }));
        setTransactions(formattedTransactions);

        // Set card if exists
        if (cardData?.hasCard && cardData?.card) {
          setUserCard(cardData.card);
        }
      } catch (error) {
        console.error('Failed to fetch wallet data:', error);
        setWalletBalance(0);
      }

      // Fetch my requests and requests to approve
      try {
        const [myRequests, toApprove] = await Promise.all([
          getMyRequests().catch(() => []),
          getRequestsToApprove().catch(() => [])
        ]);

        // Combine and dedupe requests
        const allRequests = [...myRequests, ...toApprove];
        const uniqueRequests = allRequests.filter((req, index, self) =>
          index === self.findIndex(r => r.id === req.id)
        );

        const transformedRequests = uniqueRequests.map(req =>
          transformApiRequest(req, currentUser.name)
        );
        setRequests(transformedRequests);

        // Generate feed items from requests
        const newFeedItems: FeedItem[] = transformedRequests.map(req => ({
          id: `${req.id}-feed`,
          type: req.status === 'pending' ? 'submitted' : req.status,
          requestId: req.id,
          user: req.submittedBy,
          amount: req.amount,
          description: `${req.status === 'pending' ? 'submitted' : req.status} request for ${req.description}`,
          timestamp: req.date,
          status: req.status
        }));
        setFeedItems(newFeedItems);
      } catch (error) {
        console.error('Failed to fetch requests:', error);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Fetch data when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser, fetchUserData]);

  // Calculate accessible funds from approved requests submitted by the user
  const accessibleFunds = requests
    .filter(req => req.submittedBy === 'You' && req.status === 'approved')
    .reduce((total, req) => total + req.amount, 0);

  const totalUnreadMessages = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const addRequest = async (request: Omit<MoneyRequest, 'id'>) => {
    try {
      // Transform UI format to API format
      const apiRequest = {
        amount: request.amount,
        description: request.description,
        category: request.category,
        imageUrl: request.imageUrl,
        approvers: request.approvers.map(name => ({
          userId: name, // In real implementation, this would be the actual user ID
          name: name,
          email: '' // Would come from approver lookup
        }))
      };

      const newRequest = await apiCreateRequest(apiRequest);

      // Add to local state
      const uiRequest = transformApiRequest(newRequest, currentUser?.name || '');
      setRequests([uiRequest, ...requests]);

      // Add feed item
      const feedItem: FeedItem = {
        id: Date.now().toString() + '-feed',
        type: 'submitted',
        requestId: uiRequest.id,
        user: 'You',
        amount: uiRequest.amount,
        description: `submitted a new request for ${uiRequest.description}`,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      setFeedItems([feedItem, ...feedItems]);

      // Create notifications for approvers
      if (request.approvers && request.approvers.length > 0) {
        request.approvers.forEach(approverName => {
          if (approverName !== 'You') {
            const notification: Notification = {
              id: Date.now().toString() + '-notif-' + approverName,
              type: 'approval_request',
              title: 'New Approval Request',
              message: `You have a new $${request.amount.toFixed(2)} request for ${request.description}`,
              timestamp: new Date().toISOString(),
              read: false,
              requestId: uiRequest.id
            };
            setNotifications(prev => [notification, ...prev]);
          }
        });
      }
    } catch (error) {
      console.error('Failed to create request:', error);
      // Fallback to local-only for now
      const newRequest = {
        ...request,
        id: Date.now().toString()
      };
      setRequests([newRequest, ...requests]);
    }
  };

  const updateRequestStatus = async (id: string, status: RequestStatus, notes?: string, approver?: string) => {
    try {
      // Call API
      await apiUpdateRequestStatus(id, status, notes);

      // Refresh requests from API
      await fetchUserData();
    } catch (error) {
      console.error('Failed to update request status:', error);
    }

    // Update local state regardless (for immediate UI feedback)
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

        // Create notification for request submitter
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

  const addApprover = (approver: Omit<Approver, 'id'>) => {
    const newApprover = {
      ...approver,
      id: Date.now().toString()
    };
    setApprovers([...approvers, newApprover]);

    // Create notification
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
  };

  const removeApprover = (id: string) => {
    setApprovers(approvers.filter(a => a.id !== id));
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
    setMessages(prevMessages => prevMessages.map(msg =>
      msg.conversationId === conversationId && msg.recipient === 'You'
        ? { ...msg, read: true }
        : msg
    ));

    setConversations(prevConversations => prevConversations.map(conv =>
      conv.id === conversationId
        ? { ...conv, unreadCount: 0 }
        : conv
    ));
  }, []);

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
      setTransactions([]);
      setBankAccounts([]);
      setCurrentView('dashboard');
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
          card={userCard}
          onCardCreated={(card) => setUserCard(card)}
        />;
      case 'camera':
        return <CameraCapture onClose={() => setCurrentView('dashboard')} onCapture={(mediaUrl, isVideo) => {
          if (!isVideo) {
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
            const approver = approvers.find(a => a.id === approverId);
            if (approver) {
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
      // Check backend health
      const health = await checkBackendHealth();
      if (!health.ok) {
        console.warn('Backend not available:', health.error);
      }

      // Check for existing session
      const session = await getSession();
      if (session && session.user) {
        // Get user name from session metadata or email
        const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';

        // Initialize user with Marqeta FIRST (before setting currentUser)
        // This ensures the Marqeta token is ready before fetchUserData runs
        try {
          const nameParts = userName.split(' ');
          await initializeUser(nameParts[0], nameParts.slice(1).join(' ') || '');
        } catch (initError) {
          console.error('Failed to initialize Marqeta user on session restore:', initError);
        }

        // Now set user state - this will trigger fetchUserData
        setIsLoggedIn(true);
        setCurrentUser({
          name: userName,
          email: session.user.email || ''
        });
      }
    };
    checkSession();
  }, []);

  if (!isLoggedIn) {
    return <LandingPage onLogin={(user) => {
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
