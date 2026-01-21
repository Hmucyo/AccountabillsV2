import { useState } from 'react';
import { Wallet, Shield, Users, ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would authenticate with backend
    onLogin();
  };

  const handleGoogleSignIn = () => {
    // In a real app, this would use Google OAuth
    onLogin();
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call backend API to send reset email
    setResetEmailSent(true);
    setTimeout(() => {
      setResetEmailSent(false);
      setShowForgotPassword(false);
      setResetEmail('');
    }, 3000);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#9E89FF] to-[#7B68EE] flex flex-col p-6">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          {/* Back Button */}
          <button
            onClick={() => setShowForgotPassword(false)}
            className="text-white mb-8 self-start"
          >
            ← Back
          </button>

          {/* Forgot Password Card */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#9E89FF]" />
              </div>
              <h2 className="text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600">
                Enter your email and we'll send you a link to reset your password
              </p>
            </div>

            {resetEmailSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-gray-900 mb-2">Email Sent!</p>
                <p className="text-gray-600">
                  Check your email for a password reset link
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#9E89FF] text-white py-3 rounded-xl hover:bg-[#8B76F0] transition-colors"
                >
                  Send Reset Link
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#9E89FF] to-[#7B68EE] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-4">
              <Wallet className="w-12 h-12 text-[#9E89FF]" />
            </div>
            <h1 className="text-center text-white">ACCOUNTABILLS</h1>
            <p className="text-center text-purple-100 mt-2">Smart spending with accountability</p>
          </div>

          {/* Features */}
          <div className="w-full max-w-md space-y-4 mb-12">
            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-[#9E89FF]" />
              </div>
              <div>
                <p className="text-white">Accountability Partners</p>
                <p className="text-[rgb(147,146,148)] text-sm">Get approval from trusted friends</p>
              </div>
            </div>

            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#9E89FF]" />
              </div>
              <div>
                <p className="text-white">Secure Wallet</p>
                <p className="text-[rgb(147,146,148)] text-sm">Link bank accounts & virtual card</p>
              </div>
            </div>

            <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-[#9E89FF]" />
              </div>
              <div>
                <p className="text-white">Smart Spending</p>
                <p className="text-[rgb(147,146,148)] text-sm">Share, approve, and track purchases</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="w-full max-w-md space-y-3">
            <button
              onClick={() => {
                setIsSignUp(true);
                setShowAuth(true);
              }}
              className="w-full bg-white text-[#9E89FF] py-4 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsSignUp(false);
                setShowAuth(true);
              }}
              className="w-full bg-transparent border-2 border-white text-white py-4 rounded-full hover:bg-white hover:text-[#9E89FF] transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9E89FF] to-[#7B68EE] flex flex-col p-6">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        {/* Back Button */}
        <button
          onClick={() => setShowAuth(false)}
          className="text-white mb-8 self-start"
        >
          ← Back
        </button>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-gray-900 mb-2">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-gray-600">
              {isSignUp ? 'Join ACCOUNTABILLS today' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Choose a username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF]"
                    required
                  />
                </div>
              </>
            )}

            {!isSignUp && (
              <div>
                <label className="block text-gray-700 mb-2">Username or Email</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username or email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF]"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isSignUp && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[#9E89FF] text-sm hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#9E89FF] text-white py-3 rounded-xl hover:bg-[#8B76F0] transition-colors"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-gray-600 mt-6">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#9E89FF] hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}