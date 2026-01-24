import { useState } from 'react';
import { Wallet, Shield, Users, ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { signUp, signIn } from '../utils/api';

interface LandingPageProps {
  onLogin: (user: { name: string; email: string }) => void;
}

// Phone number formatting function
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);
  
  // Format as (XXX) XXX-XXXX
  if (limitedDigits.length <= 3) {
    return limitedDigits;
  } else if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  } else {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  }
};

export function LandingPage({ onLogin }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up with backend
        console.log('Starting signup process...');
        const signUpResponse = await signUp(formData.email, formData.password, formData.name);

        // Check if email confirmation is required
        if (signUpResponse.requiresEmailConfirmation) {
          console.log('Email confirmation required');
          setEmailConfirmationSent(true);
          return;
        }

        // Session was returned directly (email confirmation disabled)
        if (signUpResponse.session) {
          const userName = signUpResponse.user?.user_metadata?.name || formData.name;
          const userEmail = signUpResponse.user?.email || formData.email;
          console.log('Signup successful:', userName);
          onLogin({ name: userName, email: userEmail });
        }
      } else {
        // Sign in
        console.log('🔵 Signing in...');
        const { user } = await signIn(formData.email, formData.password);
        const userName = user?.user_metadata?.name || 'User';
        const userEmail = user?.email || '';
        console.log('✅ Sign in successful:', userName);
        onLogin({ name: userName, email: userEmail });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // Check if it's a network/server error
      if (err.message?.includes('fetch') || err.message?.includes('NetworkError') || err.message?.includes('Failed to fetch')) {
        setError('Backend server is not responding. The server may need to be deployed. Check the console for details.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    setError('Google Sign-In coming soon. Please use email/password.');
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

  if (emailConfirmationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#9E89FF] to-[#7B68EE] flex flex-col p-6">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          {/* Email Confirmation Card */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a confirmation link to <strong>{formData.email}</strong>.
                Please click the link to verify your account.
              </p>
              <button
                onClick={() => {
                  setEmailConfirmationSent(false);
                  setIsSignUp(false);
                }}
                className="w-full bg-[#9E89FF] text-white py-3 rounded-xl hover:bg-[#8B76F0] transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  <label className="block text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF] text-gray-900 placeholder-gray-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF] text-gray-900 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF] text-gray-900 placeholder-gray-500"
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter username or email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF] text-gray-900 placeholder-gray-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9E89FF] text-gray-900 placeholder-gray-500"
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

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-xl">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#9E89FF] text-white py-3 rounded-xl hover:bg-[#8B76F0] transition-colors"
              disabled={loading}
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