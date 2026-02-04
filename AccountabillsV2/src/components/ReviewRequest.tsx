import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, DollarSign, Calendar, Tag, User, MessageSquare } from 'lucide-react';
import { MoneyRequest, RequestStatus } from '../App';

interface ReviewRequestProps {
  request: MoneyRequest;
  onBack: () => void;
  onReview: (requestId: string, status: 'approved' | 'rejected', comment: string, approver: string) => void;
}

export function ReviewRequest({ request, onBack, onReview }: ReviewRequestProps) {
  const [comment, setComment] = useState('');
  const [showError, setShowError] = useState(false);

  const handleApprove = () => {
    if (!comment.trim()) {
      setShowError(true);
      return;
    }
    onReview(request.id, 'approved', comment, 'You');
    onBack();
  };

  const handleDeny = () => {
    if (!comment.trim()) {
      setShowError(true);
      return;
    }
    onReview(request.id, 'rejected', comment, 'You');
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={onBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-gray-900 dark:text-white">Review Request</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Submitted by {request.submittedBy}</p>
        </div>
      </div>

      {/* Request Image */}
      {request.imageUrl && (
        <div className="w-full bg-gray-900">
          <img
            src={request.imageUrl}
            alt="Request item"
            className="w-full max-h-96 object-contain"
          />
        </div>
      )}

      {/* Request Details */}
      <div className="p-4 space-y-4">
        {/* Amount Card */}
        <div className="bg-gradient-to-br from-[#9E89FF] to-[#8B76F0] rounded-2xl p-6 text-white shadow-lg">
          <p className="text-purple-100 mb-2">Requested Amount</p>
          <div className="flex items-center gap-2">
            <DollarSign className="w-8 h-8" />
            <h2 className="text-white">${request.amount.toFixed(2)}</h2>
          </div>
        </div>

        {/* Status Banner for Reviewed Requests */}
        {request.status !== 'pending' && (
          <div className={`rounded-xl p-4 shadow-sm border ${
            request.status === 'approved'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {request.status === 'approved' ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
              <h3 className={`${
                request.status === 'approved'
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                Request {request.status === 'approved' ? 'Approved' : 'Rejected'}
              </h3>
            </div>
            <p className={`${
              request.status === 'approved'
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              {request.status === 'approved' 
                ? `This request was approved by ${request.approvedBy?.join(', ')}`
                : `This request was rejected by ${request.rejectedBy}`
              }
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-[#9E89FF] mt-0.5" />
            <div className="flex-1">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Category</p>
              <p className="text-gray-900 dark:text-white">{request.category}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#9E89FF] mt-0.5" />
            <div className="flex-1">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Date</p>
              <p className="text-gray-900 dark:text-white">{new Date(request.date).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-[#9E89FF] mt-0.5" />
            <div className="flex-1">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Submitted By</p>
              <p className="text-gray-900 dark:text-white">{request.submittedBy}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Description</p>
          <p className="text-gray-900 dark:text-white">{request.description}</p>
        </div>

        {/* Reviewer Notes (if request is reviewed) */}
        {request.status !== 'pending' && request.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-[#9E89FF]" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">Reviewer's Comment</p>
            </div>
            <p className="text-gray-900 dark:text-white">{request.notes}</p>
          </div>
        )}

        {/* Comment Section - Only show for pending requests */}
        {request.status === 'pending' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <label className="block mb-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-[#9E89FF]" />
                <span className="text-gray-900 dark:text-white">Your Comment *</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Please provide feedback about this request (required)
              </p>
              <textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  setShowError(false);
                }}
                placeholder="Example: This looks reasonable for the office supplies. Approved!"
                rows={4}
                className={`w-full px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                  showError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </label>
            {showError && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                ⚠️ Please add a comment before reviewing this request
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="sticky bottom-4 space-y-3 pt-2">
          {request.status === 'pending' ? (
            <>
              <button
                onClick={handleApprove}
                className="w-full bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle className="w-6 h-6" />
                <span className="text-lg">Approve Request</span>
              </button>
              
              <button
                onClick={handleDeny}
                className="w-full bg-red-600 text-white py-4 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <XCircle className="w-6 h-6" />
                <span className="text-lg">Deny Request</span>
              </button>

              <button
                onClick={onBack}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onBack}
              className="w-full bg-[#9E89FF] text-white py-4 rounded-xl hover:bg-[#8B76F0] transition-colors shadow-lg"
            >
              Back to Notifications
            </button>
          )}
        </div>
      </div>
    </div>
  );
}