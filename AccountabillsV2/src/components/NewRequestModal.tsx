import { useState } from 'react';
import { X, DollarSign, FileText, Tag, Calendar, Users, Camera, Upload } from 'lucide-react';
import { MoneyRequest, Approver } from '../App';

interface NewRequestModalProps {
  onClose: () => void;
  onSubmit: (request: Omit<MoneyRequest, 'id'>) => void;
  approvers: Approver[];
  capturedImage?: string | null;
  onClearCapturedImage?: () => void;
}

export function NewRequestModal({ onClose, onSubmit, approvers, capturedImage, onClearCapturedImage }: NewRequestModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedApprover, setSelectedApprover] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>(capturedImage || '');
  const [imageUrl, setImageUrl] = useState<string>('');

  const categories = ['Office', 'Software', 'Events', 'Entertainment', 'Travel', 'Equipment', 'Other'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !category || !selectedApprover) {
      alert('Please fill in all required fields and select an approver');
      return;
    }

    if (!imagePreview) {
      alert('Please take or upload a picture of the item/receipt');
      return;
    }

    onSubmit({
      amount: parseFloat(amount),
      description,
      category,
      date,
      status: 'pending',
      submittedBy: 'You',
      approvers: [selectedApprover],
      imageUrl: imagePreview
    });

    onClearCapturedImage?.();
    onClose();
  };

  const handleClose = () => {
    onClearCapturedImage?.();
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseUrl = () => {
    if (imageUrl.trim()) {
      setImagePreview(imageUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-gray-900">New Request</h2>
          <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Photo Section */}
          <div>
            <label className="block text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                <span>Item Photo / Receipt *</span>
              </div>
            </label>
            
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview('');
                    onClearCapturedImage?.();
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-4">Upload an image or use camera button below</p>
                  
                  <label className="bg-[#9E89FF] text-white px-6 py-3 rounded-lg hover:bg-[#8B76F0] transition-colors cursor-pointer inline-flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                
                <div className="text-center text-gray-500">or</div>
                
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleUseUrl}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Use URL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>Amount</span>
              </div>
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>Description</span>
              </div>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this request for?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                <span>Category</span>
              </div>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>Date</span>
              </div>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Approvers */}
          <div>
            <label className="block text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Select Approver *</span>
              </div>
            </label>
            <div className="space-y-2">
              {approvers.length === 0 ? (
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-gray-600">No approvers added yet. Add approvers in your Profile.</p>
                </div>
              ) : (
                approvers.map(approver => (
                  <label
                    key={approver.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedApprover === approver.name
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="approver"
                      checked={selectedApprover === approver.name}
                      onChange={() => setSelectedApprover(approver.name)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                        <span className="text-sm">{approver.avatar}</span>
                      </div>
                      <div>
                        <p className="text-gray-900">{approver.name}</p>
                        <p className="text-gray-600 text-xs">{approver.email}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}