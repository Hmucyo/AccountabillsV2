import { useState } from 'react';
import { Wallet, Plus, ArrowDownToLine, CreditCard, Building2, Apple, TrendingUp, Clock } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  fee?: number;
}

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  status: string;
}

interface AccountabillsWalletProps {
  balance: number;
  setBalance: (balance: number) => void;
  accessibleFunds: number;
  onNavigateToProfile?: () => void;
  transactions?: Transaction[];
  bankAccounts?: BankAccount[];
  currentUser?: { name: string; email: string; } | null;
}

export function AccountabillsWallet({ 
  balance, 
  setBalance, 
  accessibleFunds, 
  onNavigateToProfile,
  transactions = [],
  bankAccounts = [],
  currentUser = null
}: AccountabillsWalletProps) {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');

  const handleAddMoney = () => {
    if (amount && parseFloat(amount) > 0) {
      setBalance(balance + parseFloat(amount));
      setAmount('');
      setShowAddMoney(false);
    }
  };

  const handleWithdraw = (instant: boolean) => {
    if (amount && parseFloat(amount) > 0) {
      const withdrawAmount = parseFloat(amount);
      const fee = instant ? withdrawAmount * 0.0195 : 0;
      setBalance(balance - withdrawAmount - fee);
      setAmount('');
      setShowWithdraw(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-[#9E89FF] to-[#7B68EE] pb-20">
      {/* Header */}
      <div className="p-6 text-white flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-white mb-2">ACCOUNTABILLS Wallet</h1>
          <p className="text-purple-100 dark:text-purple-200">Manage your spending money</p>
        </div>
        {onNavigateToProfile && (
          <button
            onClick={onNavigateToProfile}
            className="w-10 h-10 bg-white dark:bg-gray-200 bg-opacity-30 dark:bg-opacity-40 rounded-full flex items-center justify-center text-white dark:text-gray-900 shadow-lg hover:bg-opacity-40 dark:hover:bg-opacity-50 transition-colors flex-shrink-0 border-2 border-white dark:border-gray-300 border-opacity-80"
          >
            <span className="text-sm font-semibold">{getUserInitials()}</span>
          </button>
        )}
      </div>

      {/* Balance Card */}
      <div className="mx-4 mb-6">
        <div className="bg-white dark:bg-black bg-opacity-40 dark:bg-opacity-30 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-transparent">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-purple-700 dark:text-purple-200 mb-2">Available Balance</p>
              <h2 className="text-gray-900 dark:text-white mb-1">${balance.toFixed(2)}</h2>
            </div>
            <div className="text-right">
              <p className="text-green-700 dark:text-green-300 text-sm mb-2">Accessible Funds</p>
              <p className="text-gray-900 dark:text-white text-xl">${accessibleFunds.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddMoney(true)}
              className="flex-1 bg-[#9E89FF] dark:bg-gray-100 text-white dark:text-[#9E89FF] py-3 rounded-xl hover:bg-[#8B76F0] dark:hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Money</span>
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex-1 bg-transparent border-2 border-gray-800 dark:border-white text-gray-800 dark:text-white py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-white hover:text-white dark:hover:text-[#9E89FF] transition-colors flex items-center justify-center gap-2"
            >
              <ArrowDownToLine className="w-5 h-5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Virtual Card */}
      <div className="mx-4 mb-6">
        <h3 className="text-white mb-3">Virtual Card</h3>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-2xl">
          <div className="flex justify-between items-start mb-12">
            <div>
              <p className="text-gray-400 text-sm mb-1">ACCOUNTABILLS</p>
              <p className="text-white">Virtual Card</p>
            </div>
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          
          <div className="mb-6">
            <p className="text-2xl tracking-wider mb-4">•••• •••• •••• 4242</p>
            <div className="flex gap-8">
              <div>
                <p className="text-gray-400 text-xs mb-1">VALID THRU</p>
                <p className="text-white">12/28</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">CVV</p>
                <p className="text-white">•••</p>
              </div>
            </div>
          </div>

          <button className="w-full bg-white text-gray-900 py-3 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
            <Apple className="w-5 h-5" />
            <span>Add to Apple Wallet</span>
          </button>
        </div>
      </div>

      {/* Linked Accounts */}
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl pt-6 px-4">
        <h3 className="text-gray-900 dark:text-white mb-3">Linked Bank Accounts</h3>
        <div className="space-y-3 mb-6">
          {bankAccounts.map(account => (
            <div key={account.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">{account.name}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">••••{account.accountNumber}</p>
              </div>
              <p className="text-green-600 dark:text-green-400">{account.status}</p>
            </div>
          ))}

          <button className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-4 rounded-xl hover:border-[#9E89FF] hover:text-[#9E89FF] transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            <span>Link Bank Account</span>
          </button>
        </div>

        {/* Transaction History */}
        <h3 className="text-gray-900 dark:text-white mb-3">Recent Transactions</h3>
        <div className="space-y-3 pb-6">
          {transactions.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-1">No transactions yet</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            transactions.map(transaction => (
              <div key={transaction.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white mb-1">{transaction.description}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{new Date(transaction.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-gray-900 dark:text-white mb-1 ${transaction.amount > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </p>
                    {transaction.fee && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Fee: ${transaction.fee.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6">
            <h3 className="text-gray-900 mb-4">Add Money</h3>
            <p className="text-gray-600 mb-4">Transfer from your linked bank account</p>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF]"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-gray-600 text-sm">Funds will be available instantly</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddMoney(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMoney}
                className="flex-1 bg-[#9E89FF] text-white py-3 rounded-xl hover:bg-[#8B76F0] transition-colors"
              >
                Add Money
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6">
            <h3 className="text-gray-900 mb-4">Withdraw Money</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF]"
                />
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <button
                onClick={() => handleWithdraw(true)}
                className="w-full bg-[#9E89FF] text-white p-4 rounded-xl hover:bg-[#8B76F0] transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <span>Instant Transfer</span>
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-purple-100 text-sm">
                  1.95% fee (${amount ? (parseFloat(amount) * 0.0195).toFixed(2) : '0.00'}) • Arrives instantly
                </p>
              </button>

              <button
                onClick={() => handleWithdraw(false)}
                className="w-full bg-gray-100 text-gray-900 p-4 rounded-xl hover:bg-gray-200 transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <span>Standard Transfer</span>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-gray-600 text-sm">No fee • Arrives in 1-3 business days</p>
              </button>
            </div>

            <button
              onClick={() => setShowWithdraw(false)}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}