import { useState } from 'react';
import { X, DollarSign, FileText, Tag, Calendar, Users, Camera, Upload, User, UsersRound, Check } from 'lucide-react';
import { MoneyRequest, Approver, ApproverGroup } from '../App';

interface NewRequestModalProps {
  onClose: () => void;
  onSubmit: (request: Omit<MoneyRequest, 'id'>, selectedApprovers: Approver[], selectedGroups: ApproverGroup[]) => void;
  approvers: Approver[];
  approverGroups: ApproverGroup[];
  capturedImage?: string | null;
  onClearCapturedImage?: () => void;
  onOpenCamera?: () => void;
}

type ApproverTab = 'individual' | 'group';

export function NewRequestModal({ 
  onClose, 
  onSubmit, 
  approvers, 
  approverGroups,
  capturedImage, 
  onClearCapturedImage,
  onOpenCamera
}: NewRequestModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedApprovers, setSelectedApprovers] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [imagePreview, setImagePreview] = useState<string>(capturedImage || '');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [approverTab, setApproverTab] = useState<ApproverTab>('individual');

  const categories = ['Office', 'Software', 'Events', 'Entertainment', 'Travel', 'Equipment', 'Other'];

  // Filter to only show approvers with approving rights for individuals
  const approversWithRights = approvers.filter(a => a.role === 'approver');
  
  // Show all groups, but we'll indicate which ones have approvers
  const allGroups = approverGroups;

  const handleApproverToggle = (approverId: string) => {
    const newSelected = new Set(selectedApprovers);
    if (newSelected.has(approverId)) {
      newSelected.delete(approverId);
    } else {
      newSelected.add(approverId);
    }
    setSelectedApprovers(newSelected);
  };

  const handleGroupToggle = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !category) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedApprovers.size === 0 && selectedGroups.size === 0) {
      alert('Please select at least one approver or group');
      return;
    }

    // Check if at least one actual approver will receive the request
    const selectedGroupObjects = approverGroups.filter(g => selectedGroups.has(g.id));
    const hasApproverInGroups = selectedGroupObjects.some(g => 
      g.members.some(m => m.role === 'approver')
    );
    
    if (selectedApprovers.size === 0 && !hasApproverInGroups) {
      alert('The selected group(s) have no members with approving rights. Please also select an individual approver or choose a group with approvers.');
      return;
    }

    if (!imagePreview) {
      alert('Please take or upload a picture of the item/receipt');
      return;
    }

    // Get the selected approver objects
    const selectedApproverObjects = approvers.filter(a => selectedApprovers.has(a.id));
    
    // Collect all approver names (individuals + group members with approving rights)
    // Note: selectedGroupObjects already declared above for validation
    const allApproverNames = new Set<string>();
    
    // Add individual approvers
    selectedApproverObjects.forEach(a => allApproverNames.add(a.name));
    
    // Add group members with approving rights
    selectedGroupObjects.forEach(group => {
      group.members.forEach(member => {
        if (member.role === 'approver') {
          allApproverNames.add(member.name);
        }
      });
    });

    onSubmit({
      amount: parseFloat(amount),
      description,
      category,
      date,
      status: 'pending',
      submittedBy: 'You',
      approvers: Array.from(allApproverNames),
      imageUrl: imagePreview
    }, selectedApproverObjects, selectedGroupObjects);

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

  const totalSelected = selectedApprovers.size + selectedGroups.size;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-gray-900 dark:text-white text-lg font-semibold">New Request</h2>
          <button onClick={handleClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Photo Section */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
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
                  className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
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
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Take a photo or upload an image</p>
                  
                  <div className="flex gap-2 justify-center">
                    {onOpenCamera && (
                      <button
                        type="button"
                        onClick={onOpenCamera}
                        className="bg-[#9E89FF] text-white px-4 py-2 rounded-lg hover:bg-[#8B76F0] transition-colors flex items-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        <span>Take Photo</span>
                      </button>
                    )}
                    <label className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer inline-flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <div className="text-center text-gray-500 dark:text-gray-500 text-sm">or paste URL</div>
                
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleUseUrl}
                    className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    Use
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>Amount *</span>
              </div>
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>Description *</span>
              </div>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this request for?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                <span>Category *</span>
              </div>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>Date</span>
              </div>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Approvers Section */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Select Approvers *</span>
              </div>
            </label>

            {/* Individual / Group Tabs */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setApproverTab('individual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-medium transition-colors ${
                  approverTab === 'individual'
                    ? 'bg-[#9E89FF] text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Individual</span>
              </button>
              <button
                type="button"
                onClick={() => setApproverTab('group')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-medium transition-colors ${
                  approverTab === 'group'
                    ? 'bg-[#9E89FF] text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <UsersRound className="w-4 h-4" />
                <span>Group</span>
              </button>
            </div>

            {/* Approver List */}
            <div className="space-y-2">
              {approverTab === 'individual' ? (
                // Individual Approvers
                approversWithRights.length === 0 ? (
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400">No approvers with approving rights yet.</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Add approvers in your Profile.</p>
                  </div>
                ) : (
                  approversWithRights.map(approver => {
                    const isSelected = selectedApprovers.has(approver.id);
                    return (
                      <button
                        key={approver.id}
                        type="button"
                        onClick={() => handleApproverToggle(approver.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected 
                            ? 'bg-white border-white' 
                            : 'border-gray-400 dark:border-gray-500'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-gray-800" />}
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-[#9E89FF]' : 'bg-[#9E89FF]'
                        }`}>
                          <span className="text-white text-sm font-medium">{approver.avatar}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            {approver.name}
                          </p>
                          <p className={`text-sm ${isSelected ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {approver.email}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )
              ) : (
                // Groups
                allGroups.length === 0 ? (
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400">No groups created yet.</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Create groups in your Profile.</p>
                  </div>
                ) : (
                  allGroups.map(group => {
                    const isSelected = selectedGroups.has(group.id);
                    const approverCount = group.members.filter(m => m.role === 'approver').length;
                    const hasNoApprovers = approverCount === 0;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => handleGroupToggle(group.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected 
                            ? 'bg-white border-white' 
                            : 'border-gray-400 dark:border-gray-500'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-gray-800" />}
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          hasNoApprovers ? 'bg-gray-400' : 'bg-[#9E89FF]'
                        }`}>
                          <UsersRound className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            {group.name}
                          </p>
                          <p className={`text-sm ${isSelected ? 'text-gray-300' : hasNoApprovers ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {hasNoApprovers 
                              ? `${group.members.length} viewer${group.members.length !== 1 ? 's' : ''} only (cannot approve)`
                              : `${approverCount} approver${approverCount !== 1 ? 's' : ''} • ${group.members.length} member${group.members.length !== 1 ? 's' : ''}`
                            }
                          </p>
                        </div>
                      </button>
                    );
                  })
                )
              )}
            </div>

            {/* Selection Summary */}
            {totalSelected > 0 && (
              <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-[#9E89FF]">
                  {selectedApprovers.size > 0 && `${selectedApprovers.size} individual${selectedApprovers.size !== 1 ? 's' : ''}`}
                  {selectedApprovers.size > 0 && selectedGroups.size > 0 && ' and '}
                  {selectedGroups.size > 0 && `${selectedGroups.size} group${selectedGroups.size !== 1 ? 's' : ''}`}
                  {' '}selected
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
