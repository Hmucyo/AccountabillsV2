import { useState, useEffect } from 'react';
import { Filter, Search, ArrowLeft } from 'lucide-react';
import { MoneyRequest, RequestStatus } from '../App';

interface MyRequestsProps {
  requests: MoneyRequest[];
  initialFilter?: RequestStatus;
  onBack?: () => void;
}

export function MyRequests({ requests, initialFilter, onBack }: MyRequestsProps) {
  const [filter, setFilter] = useState<RequestStatus | 'all'>(initialFilter || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  // Update filter when initialFilter changes
  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const filteredRequests = requests.filter(request => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const matchesSearch = request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          request.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalAmount = filteredRequests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-gray-900 dark:text-white">My Requests</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">View all your submitted requests</p>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            filter === 'all'
              ? 'bg-[#9E89FF] text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            filter === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            filter === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            filter === 'rejected'
              ? 'bg-red-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Summary */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
            <p className="text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 dark:text-gray-400 mb-1">Requests</p>
            <p className="text-gray-900 dark:text-white">{filteredRequests.length}</p>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No requests found</p>
          </div>
        ) : (
          filteredRequests.map(request => (
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
                </div>
                <div className="text-right ml-4">
                  <p className="text-gray-900 dark:text-white mb-1">${request.amount.toFixed(2)}</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-white text-xs ${
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

              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                <span>{new Date(request.date).toLocaleDateString()}</span>
                <span>→ {request.approvers.join(', ')}</span>
              </div>

              {request.notes && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-600 dark:text-gray-300">Note: {request.notes}</p>
                </div>
              )}

              {request.status === 'approved' && request.approvedBy && (
                <div className="mt-2">
                  <p className="text-gray-600 dark:text-gray-400">Approved by: {request.approvedBy.join(', ')}</p>
                </div>
              )}

              {request.status === 'rejected' && request.rejectedBy && (
                <div className="mt-2">
                  <p className="text-gray-600 dark:text-gray-400">Rejected by: {request.rejectedBy}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}