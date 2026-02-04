import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { MoneyRequest, RequestStatus } from '../App';

interface ApprovalsProps {
  requests: MoneyRequest[];
  updateRequestStatus: (id: string, status: 'approved' | 'rejected', notes?: string, approver?: string) => void;
  onNavigateBack?: () => void;
  onNavigateToReview?: (requestId: string) => void;
}

export function Approvals({ requests, updateRequestStatus, onNavigateBack, onNavigateToReview }: ApprovalsProps) {
  const [selectedRequest, setSelectedRequest] = useState<MoneyRequest | null>(null);
  const [notes, setNotes] = useState('');

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  const handleApprove = (request: MoneyRequest) => {
    updateRequestStatus(request.id, 'approved', notes || undefined, 'You');
    setSelectedRequest(null);
    setNotes('');
  };

  const handleReject = (request: MoneyRequest) => {
    if (!notes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    updateRequestStatus(request.id, 'rejected', notes, 'You');
    setSelectedRequest(null);
    setNotes('');
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        {onNavigateBack && (
          <button
            onClick={onNavigateBack}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-gray-900 dark:text-white mb-2">Approvals</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and approve requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="text-gray-900 dark:text-white">{pendingRequests.length} Pending Approvals</p>
            <p className="text-gray-600 dark:text-gray-400">
              Total: ${pendingRequests.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="mb-6">
        <h2 className="text-gray-900 dark:text-white mb-3">Pending Requests</h2>
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No pending approvals</p>
            </div>
          ) : (
            pendingRequests.map(request => (
              <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Image Preview */}
                {request.imageUrl && (
                  <div className="mb-3 -mx-4 -mt-4">
                    <img
                      src={request.imageUrl}
                      alt="Item or receipt"
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white mb-1">{request.description}</p>
                    <p className="text-gray-600 dark:text-gray-400">{request.category}</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">From: {request.submittedBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white">${request.amount.toFixed(2)}</p>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400 mb-3">{new Date(request.date).toLocaleDateString()}</p>

                {selectedRequest?.id === request.id ? (
                  <div className="space-y-3">
                    <textarea
                      placeholder="Add notes (optional for approval, required for rejection)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request)}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        <span>Reject</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRequest(null);
                        setNotes('');
                      }}
                      className="w-full text-gray-600 dark:text-gray-400 px-4 py-2 hover:text-gray-900 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      if (onNavigateToReview) {
                        onNavigateToReview(request.id);
                      }
                    }}
                    className="w-full bg-[#9E89FF] text-white px-4 py-2 rounded-lg hover:bg-[#8B76F0] transition-colors"
                  >
                    Review
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reviewed Requests */}
      {reviewedRequests.length > 0 && (
        <div>
          <h2 className="text-gray-900 dark:text-white mb-3">Already Reviewed</h2>
          <div className="space-y-3">
            {reviewedRequests.map(request => (
              <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 opacity-60">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white mb-1">{request.description}</p>
                    <p className="text-gray-600 dark:text-gray-400">{request.category}</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">From: {request.submittedBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white mb-1">${request.amount.toFixed(2)}</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-white text-xs ${
                        request.status === 'approved' ? 'bg-green-600' : 'bg-red-600'
                      }`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                </div>
                {request.notes && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                    <p className="text-gray-600 dark:text-gray-400">Note: {request.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}