import { useState } from 'react';
import { ArrowLeft, Bell, UserPlus, FileText, CheckCircle, XCircle, UserCheck, X } from 'lucide-react';
import { Notification } from '../App';

interface NotificationsProps {
  notifications: Notification[];
  onBack: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToRequest?: (requestId: string) => void;
  onAcceptFriendRequest?: (senderId: string, notificationId: string) => Promise<void>;
  onRejectFriendRequest?: (senderId: string, notificationId: string) => Promise<void>;
}

export function Notifications({ notifications, onBack, onMarkAsRead, onMarkAllAsRead, onNavigateToRequest, onAcceptFriendRequest, onRejectFriendRequest }: NotificationsProps) {
  const unreadCount = notifications.filter(n => !n.read).length;
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const handleAcceptFriendRequest = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    if (!notification.approverId || !onAcceptFriendRequest) return;
    
    setProcessingRequest(`accept-${notification.id}`);
    try {
      await onAcceptFriendRequest(notification.approverId, notification.id);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectFriendRequest = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    if (!notification.approverId || !onRejectFriendRequest) return;
    
    setProcessingRequest(`reject-${notification.id}`);
    try {
      await onRejectFriendRequest(notification.approverId, notification.id);
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  // Check if this is a pending friend request (not accepted/rejected already)
  const isPendingFriendRequest = (notification: Notification) => {
    return notification.type === 'friend_request' && 
           notification.approverId && 
           notification.title === 'New Friend Request' &&
           !notification.read;
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-[#9E89FF]" />;
      case 'approval_request':
        return <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'request_reviewed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-gray-900 dark:text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-gray-600 dark:text-gray-400">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-[#9E89FF] hover:text-[#8B76F0] transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h2 className="text-gray-900 dark:text-white mb-2">No notifications</h2>
            <p className="text-gray-600 dark:text-gray-400">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => {
                  if (!notification.read && !isPendingFriendRequest(notification)) {
                    onMarkAsRead(notification.id);
                  }
                  if (notification.requestId && onNavigateToRequest) {
                    onNavigateToRequest(notification.requestId);
                  }
                }}
                className={`p-4 rounded-xl border transition-all ${
                  isPendingFriendRequest(notification) ? '' : 'cursor-pointer'
                } ${
                  notification.read
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-purple-50 dark:bg-purple-900/20 border-[#9E89FF]'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.read
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'bg-white dark:bg-gray-800'
                  }`}>
                    {notification.type === 'request_reviewed' && notification.title.includes('Rejected') ? (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      getNotificationIcon(notification.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`${
                        notification.read
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#9E89FF] rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className={`mb-2 ${
                      notification.read
                        ? 'text-gray-600 dark:text-gray-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {notification.message}
                    </p>
                    
                    {/* Friend Request Accept/Reject Buttons */}
                    {isPendingFriendRequest(notification) && onAcceptFriendRequest && onRejectFriendRequest && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => handleAcceptFriendRequest(e, notification)}
                          disabled={processingRequest === `accept-${notification.id}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#9E89FF] text-white rounded-lg hover:bg-[#8B76F0] transition-colors disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span className="text-sm">
                            {processingRequest === `accept-${notification.id}` ? 'Accepting...' : 'Accept'}
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleRejectFriendRequest(e, notification)}
                          disabled={processingRequest === `reject-${notification.id}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          <span className="text-sm">
                            {processingRequest === `reject-${notification.id}` ? 'Declining...' : 'Decline'}
                          </span>
                        </button>
                      </div>
                    )}
                    
                    <p className="text-gray-500 dark:text-gray-500 mt-2">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}