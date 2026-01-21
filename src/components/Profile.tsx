import { Mail, Shield, UserCircle, Plus, Users, Trash2, Settings, Upload, UserPlus, MessageCircle, Moon, Sun, ChevronDown } from 'lucide-react';
import { Approver } from '../App';
import { useState } from 'react';

interface ProfileProps {
  approvers: Approver[];
  addApprover: (approver: Approver) => void;
  removeApprover: (id: string) => void;
  approvalThreshold: number;
  setApprovalThreshold: (threshold: number) => void;
  isDarkMode?: boolean;
  setIsDarkMode?: (isDark: boolean) => void;
  onMessageApprover?: (approverId: string) => void;
}

export function Profile({ approvers, addApprover, removeApprover, approvalThreshold, setApprovalThreshold, isDarkMode, setIsDarkMode, onMessageApprover }: ProfileProps) {
  const [showAddApprover, setShowAddApprover] = useState(false);
  const [newApproverName, setNewApproverName] = useState('');
  const [newApproverEmail, setNewApproverEmail] = useState('');
  const [newApproverRole, setNewApproverRole] = useState<'approver' | 'viewer'>('approver');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showPartnersList, setShowPartnersList] = useState(false);

  // Simulated contacts - in a real app, this would come from the device's contact list
  const mockContacts = [
    { id: '1', name: 'Jennifer Smith', email: 'jennifer.s@email.com', phone: '+1 (555) 123-4567' },
    { id: '2', name: 'David Brown', email: 'david.brown@email.com', phone: '+1 (555) 234-5678' },
    { id: '3', name: 'Lisa Anderson', email: 'lisa.a@email.com', phone: '+1 (555) 345-6789' },
    { id: '4', name: 'Robert Taylor', email: 'robert.t@email.com', phone: '+1 (555) 456-7890' },
    { id: '5', name: 'Amanda White', email: 'amanda.w@email.com', phone: '+1 (555) 567-8901' },
  ];

  const handleImportFromContacts = async () => {
    // In a real app, this would use the Contact Picker API
    // if ('contacts' in navigator && 'ContactsManager' in window) {
    //   try {
    //     const contacts = await (navigator as any).contacts.select(['name', 'email'], { multiple: true });
    //     // Process contacts
    //   } catch (error) {
    //     console.error('Error accessing contacts:', error);
    //   }
    // }
    
    // For demo, show modal with mock contacts
    setShowContactPicker(true);
  };

  const addContactAsApprover = (contact: any, role: 'approver' | 'viewer') => {
    const initials = contact.name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    addApprover({
      name: contact.name,
      email: contact.email,
      avatar: initials,
      role: role
    });
  };

  const handleAddApprover = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newApproverName.trim() || !newApproverEmail.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const initials = newApproverName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    addApprover({
      name: newApproverName,
      email: newApproverEmail,
      avatar: initials,
      role: newApproverRole
    });

    setNewApproverName('');
    setNewApproverEmail('');
    setNewApproverRole('approver');
    setShowAddApprover(false);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-gray-900 dark:text-white mb-2">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your ACCOUNTABILLS settings</p>
      </div>

      {/* User Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-[#9E89FF] rounded-full flex items-center justify-center text-white">
            <span className="text-2xl">JD</span>
          </div>
          <div>
            <p className="text-gray-900 dark:text-white mb-1">John Doe</p>
            <p className="text-gray-600 dark:text-gray-400">john.doe@email.com</p>
          </div>
        </div>
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Shield className="w-5 h-5" />
            <span>Account Member</span>
          </div>
        </div>
      </div>

      {/* Dark Mode Toggle */}
      {setIsDarkMode && (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
                <span className="text-gray-900 dark:text-white">Dark Mode</span>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  isDarkMode ? 'bg-[#9E89FF]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                    isDarkMode ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accountability Partners Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-900 dark:text-white">Accountability Partners</h2>
          <div className="flex gap-2">
            <button
              onClick={handleImportFromContacts}
              className="bg-white dark:bg-gray-800 border-2 border-[#9E89FF] text-[#9E89FF] p-2 rounded-full hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              title="Import from contacts"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAddApprover(!showAddApprover)}
              className="bg-[#9E89FF] text-white p-2 rounded-full hover:bg-[#8B76F0] transition-colors shadow-md"
              title="Add manually"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">People who can approve or view your spending requests</p>
        
        {/* Show Partners Count and Toggle Button */}
        {approvers.length > 0 && !showPartnersList && (
          <button
            onClick={() => setShowPartnersList(true)}
            className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-[#9E89FF] transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#9E89FF]" />
              <span className="text-gray-900 dark:text-white">{approvers.length} Partner{approvers.length !== 1 ? 's' : ''}</span>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        )}
        
        {/* Add Approver Form */}
        {showAddApprover && (
          <form onSubmit={handleAddApprover} className="bg-purple-50 dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-4 space-y-3">
            <input
              type="text"
              value={newApproverName}
              onChange={(e) => setNewApproverName(e.target.value)}
              placeholder="Partner name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <input
              type="email"
              value={newApproverEmail}
              onChange={(e) => setNewApproverEmail(e.target.value)}
              placeholder="Partner email"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <select
              value={newApproverRole}
              onChange={(e) => setNewApproverRole(e.target.value as 'approver' | 'viewer')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E89FF] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="approver">Approver - Can approve/reject requests</option>
              <option value="viewer">Viewer - Can only view requests</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-[#9E89FF] text-white py-2 rounded-lg hover:bg-[#8B76F0] transition-colors"
              >
                Add Partner
              </button>
              <button
                type="button"
                onClick={() => setShowAddApprover(false)}
                className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        
        <div className="space-y-3">
          {approvers.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No accountability partners yet</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">Click the + button to add a partner</p>
            </div>
          ) : showPartnersList ? (
            <>
              {approvers.map(approver => (
                <div key={approver.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white">
                      <span>{approver.avatar}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white mb-1">{approver.name}</p>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span className="text-xs">{approver.email}</span>
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                        approver.role === 'approver' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      }`}>
                        {approver.role === 'approver' ? 'Can Approve' : 'View Only'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {onMessageApprover && (
                        <button
                          onClick={() => onMessageApprover(approver.id)}
                          className="bg-[#9E89FF] text-white p-2 rounded-lg hover:bg-[#8B76F0] transition-colors"
                          title="Send message"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${approver.name} as an accountability partner?`)) {
                            removeApprover(approver.id);
                          }
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowPartnersList(false)}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Hide Partners
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Contact Picker Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-900 dark:text-white">Import from Contacts</h3>
                <button 
                  onClick={() => setShowContactPicker(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Select contacts to add as accountability partners</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {mockContacts.map(contact => {
                const isAlreadyAdded = approvers.some(a => a.email === contact.email);
                return (
                  <div 
                    key={contact.id} 
                    className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 ${isAlreadyAdded ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#9E89FF] rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white mb-1">{contact.name}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm truncate">{contact.email}</p>
                        <p className="text-gray-500 dark:text-gray-500 text-xs">{contact.phone}</p>
                      </div>
                    </div>
                    
                    {isAlreadyAdded ? (
                      <div className="text-center py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 text-sm">
                        Already Added
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            addContactAsApprover(contact, 'approver');
                            setShowContactPicker(false);
                          }}
                          className="flex-1 bg-[#9E89FF] text-white py-2 rounded-lg hover:bg-[#8B76F0] transition-colors text-sm"
                        >
                          Add as Approver
                        </button>
                        <button
                          onClick={() => {
                            addContactAsApprover(contact, 'viewer');
                            setShowContactPicker(false);
                          }}
                          className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                          Add as Viewer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowContactPicker(false)}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings */}
      <div>
        <h2 className="text-gray-900 dark:text-white mb-3">Settings</h2>
        <div className="space-y-2">
          <button className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Notifications
          </button>
          <button className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Security
          </button>
          <button className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Help & Support
          </button>
          <button className="w-full bg-red-600 dark:bg-red-700 text-white text-left px-4 py-3 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}