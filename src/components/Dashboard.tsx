import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Clock, CheckCircle, XCircle, Wallet, UserPlus, Upload, MessageCircle, Bell } from 'lucide-react';
import { MoneyRequest, Approver, RequestStatus } from '../App';
import { NewRequestModal } from './NewRequestModal';
import { StatCard } from './StatCard';

interface DashboardProps {
  requests: MoneyRequest[];
  addRequest: (request: Omit<MoneyRequest, 'id'>) => void;
  approvers: Approver[];
  walletBalance: number;
  onNavigateToProfile: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToNotifications?: () => void;
  unreadNotificationsCount?: number;
  onNavigateToReview?: (requestId: string) => void;
  onNavigateToRequests?: (statusFilter?: RequestStatus) => void;
  capturedImage?: string | null;
  onClearCapturedImage?: () => void;
  currentUser?: { name: string; email: string; } | null;
}

export function Dashboard({ requests, addRequest, approvers, walletBalance, onNavigateToProfile, onNavigateToMessages, onNavigateToNotifications, unreadNotificationsCount = 0, onNavigateToReview, onNavigateToRequests, capturedImage, onClearCapturedImage, currentUser }: DashboardProps) {
  const [showNewRequest, setShowNewRequest] = useState(false);

  // Auto-open modal when image is captured
  useEffect(() => {
    if (capturedImage) {
      setShowNewRequest(true);
    }
  }, [capturedImage]);

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

  const myRequests = requests.filter(r => r.submittedBy === 'You');
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = myRequests.filter(r => r.status === 'rejected').length;
  const totalAmount = myRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingApprovals = requests.filter(r => r.approvers.includes('You') && r.status === 'pending');
  
  // Check if user has no approvers
  const hasNoApprovers = approvers.length === 0;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-gray-900 dark:text-white mb-2">ACCOUNTABILLS</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your spending with accountability</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onNavigateToNotifications}
            className="relative w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          <button
            onClick={onNavigateToProfile}
            className="w-10 h-10 bg-[#9E89FF] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#8B76F0] transition-colors"
          >
            <span className="text-sm">{getUserInitials()}</span>
          </button>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-[#9E89FF] to-[#8B76F0] rounded-3xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5" />
          <p className="text-purple-100">Wallet Balance</p>
        </div>
        <h2 className="text-white mb-4">${walletBalance.toFixed(2)}</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-purple-100 text-xs mb-1">Pending</p>
            <p className="text-white">{pendingCount}</p>
          </div>
          <div>
            <p className="text-purple-100 text-xs mb-1">Approved</p>
            <p className="text-white">{approvedCount}</p>
          </div>
          <div>
            <p className="text-purple-100 text-xs mb-1">Total</p>
            <p className="text-white">${totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* No Approvers Banner - Shown prominently when user has no approvers */}
      {hasNoApprovers && (
        <div className="mb-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-[#9E89FF] rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-gray-900 dark:text-white mb-1">Add Accountability Partners</h2>
              <p className="text-gray-600 dark:text-gray-400">Get started by adding people who can approve your spending requests</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={onNavigateToProfile}
              className="w-full bg-[#9E89FF] text-white rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-[#8B76F0] transition-colors shadow-sm"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Partner Manually</span>
            </button>
            <button
              onClick={onNavigateToProfile}
              className="w-full bg-white dark:bg-gray-800 border-2 border-[#9E89FF] text-[#9E89FF] rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Import from Contacts</span>
            </button>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              💡 <span className="text-gray-700 dark:text-gray-300">Tip:</span> You can set up approvers with different roles - some can approve requests while others can only view them.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total Approved"
          value={`$${totalAmount.toFixed(2)}`}
          icon={<TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />}
          onClick={onNavigateToRequests ? () => onNavigateToRequests('approved') : undefined}
        />

        <StatCard
          title="Pending"
          value={`${pendingCount} requests`}
          icon={<Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
          onClick={onNavigateToRequests ? () => onNavigateToRequests('pending') : undefined}
        />

        <StatCard
          title="Approved"
          value={`${approvedCount} requests`}
          icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
          onClick={onNavigateToRequests ? () => onNavigateToRequests('approved') : undefined}
        />

        <StatCard
          title="Rejected"
          value={`${rejectedCount} requests`}
          icon={<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          onClick={onNavigateToRequests ? () => onNavigateToRequests('rejected') : undefined}
        />
      </div>

      {/* Pending Approvals Section */}
      {pendingApprovals.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-900 dark:text-white mb-3">Needs Your Approval</h2>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-gray-900 dark:text-white mb-2">
              {pendingApprovals.length} {pendingApprovals.length === 1 ? 'request' : 'requests'} waiting for your approval
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-3">Review pending requests now</p>
            {onNavigateToReview && pendingApprovals[0] && (
              <button
                onClick={() => onNavigateToReview(pendingApprovals[0].id)}
                className="w-full bg-[#9E89FF] text-white rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-[#8B76F0] transition-colors shadow-sm"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Review Now</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-gray-900 dark:text-white mb-3">Quick Actions</h2>
        <div className="space-y-2">
          <button
            onClick={() => setShowNewRequest(true)}
            className="w-full bg-[#9E89FF] text-white rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-[#8B76F0] transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>New Spending Request</span>
          </button>
          
          {approvers.length > 0 && onNavigateToMessages && (
            <button
              onClick={onNavigateToMessages}
              className="w-full bg-white dark:bg-gray-800 border-2 border-[#9E89FF] text-[#9E89FF] rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Message Partners</span>
            </button>
          )}
          
          {onNavigateToRequests && (
            <button
              onClick={onNavigateToRequests}
              className="w-full bg-white dark:bg-gray-800 border-2 border-[#9E89FF] text-[#9E89FF] rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>View All Requests</span>
            </button>
          )}
          
          {onNavigateToNotifications && (
            <button
              onClick={onNavigateToNotifications}
              className="w-full bg-white dark:bg-gray-800 border-2 border-[#9E89FF] text-[#9E89FF] rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span>Notifications {unreadNotificationsCount > 0 ? `(${unreadNotificationsCount})` : ''}</span>
            </button>
          )}
        </div>
      </div>

      {/* Recent Requests */}
      <div>
        <h2 className="text-gray-900 dark:text-white mb-3">Recent Requests</h2>
        <div className="space-y-3">
          {myRequests.slice(0, 3).map(request => (
            <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white mb-1">{request.description}</p>
                  <p className="text-gray-600 dark:text-gray-400">{request.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 dark:text-white">${request.amount.toFixed(2)}</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-white text-xs mt-1 ${
                      request.status === 'approved'
                        ? 'bg-green-600 dark:bg-green-700'
                        : request.status === 'rejected'
                        ? 'bg-red-600 dark:bg-red-700'
                        : 'bg-yellow-600 dark:bg-yellow-700'
                    }`}
                  >
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{new Date(request.date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* New Request Modal */}
      {showNewRequest && (
        <NewRequestModal
          onClose={() => setShowNewRequest(false)}
          onSubmit={addRequest}
          approvers={approvers}
          capturedImage={capturedImage}
          onClearCapturedImage={onClearCapturedImage}
        />
      )}
    </div>
  );
}