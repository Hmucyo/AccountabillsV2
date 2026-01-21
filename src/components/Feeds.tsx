import { CheckCircle, XCircle, FileText, Clock, TrendingUp } from 'lucide-react';
import { FeedItem, MoneyRequest, Approver } from '../App';

interface FeedsProps {
  feedItems: FeedItem[];
  requests: MoneyRequest[];
  approvers: Approver[];
  updateRequestStatus: (id: string, status: any, notes?: string, approver?: string) => void;
  onNavigateToProfile?: () => void;
  currentUser?: { name: string; email: string; } | null;
}

export function Feeds({ feedItems, requests, approvers, updateRequestStatus, onNavigateToProfile, currentUser }: FeedsProps) {
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'approved':
        return <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />;
      case 'rejected':
        return <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />;
      case 'submitted':
        return <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />;
      case 'comment':
        return <FileText className="w-10 h-10 text-gray-600 dark:text-gray-400" />;
      default:
        return <FileText className="w-10 h-10 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getIconBgColor = (type: FeedItem['type']) => {
    switch (type) {
      case 'approved':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'rejected':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'submitted':
        return 'bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  // Group by date
  const groupedByDate = feedItems.reduce((groups, item) => {
    const date = new Date(item.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, FeedItem[]>);

  const today = new Date().toLocaleDateString();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

  const getDateLabel = (date: string) => {
    if (date === today) return 'Today';
    if (date === yesterday) return 'Yesterday';
    return date;
  };

  // Generate initials from user's name
  const getUserInitials = () => {
    if (!currentUser?.name) return 'U';
    return currentUser.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-gray-900 dark:text-white mb-2">Activity Feed</h1>
          <p className="text-gray-600 dark:text-gray-400">Stay updated on all request activities</p>
        </div>
        {onNavigateToProfile && (
          <button
            onClick={onNavigateToProfile}
            className="w-10 h-10 bg-[#9E89FF] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#8B76F0] transition-colors flex-shrink-0"
          >
            <span className="text-sm">{getUserInitials()}</span>
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
          <p className="text-gray-900 dark:text-white">
            {feedItems.filter(f => f.type === 'submitted').length}
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-xs">Submitted</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
          <p className="text-gray-900 dark:text-white">
            {feedItems.filter(f => f.type === 'approved').length}
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-xs">Approved</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-1" />
          <p className="text-gray-900 dark:text-white">
            {feedItems.filter(f => f.type === 'rejected').length}
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-xs">Rejected</p>
        </div>
      </div>

      {/* Feed Items */}
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date}>
            <h3 className="text-gray-700 dark:text-gray-300 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-950 py-2">
              {getDateLabel(date)}
            </h3>
            <div className="space-y-3">
              {items.map((item) => {
                // Find the associated request to get the image
                const request = requests.find(r => r.id === item.requestId);
                
                return (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                  {/* Image Preview if available */}
                  {request?.imageUrl && (
                    <div className="w-full h-48 overflow-hidden">
                      <img 
                        src={request.imageUrl} 
                        alt="Request item" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getIconBgColor(item.type)} flex items-center justify-center`}>
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-gray-900 dark:text-white">
                            <span className="font-medium">{item.user}</span>
                          </p>
                          <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                            {getTimeAgo(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {item.description}
                        </p>
                        {item.amount && (
                          <div className="flex items-center gap-4">
                            <span className="text-gray-900 dark:text-white">
                              ${item.amount.toFixed(2)}
                            </span>
                            {item.status && (
                              <span
                                className={`inline-block px-2 py-1 rounded text-white text-xs ${
                                  item.status === 'approved'
                                    ? 'bg-green-600 dark:bg-green-700'
                                    : item.status === 'rejected'
                                    ? 'bg-red-600 dark:bg-red-700'
                                    : 'bg-yellow-600 dark:bg-yellow-700'
                                }`}
                              >
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        ))}
      </div>

      {feedItems.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No activity yet</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">Your feed will appear here</p>
        </div>
      )}
    </div>
  );
}