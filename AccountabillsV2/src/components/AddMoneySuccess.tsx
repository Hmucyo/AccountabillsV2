import React, { useEffect, useState } from 'react';
import { Sparkles, PartyPopper, CheckCircle2 } from 'lucide-react';

interface AddMoneySuccessProps {
  amount: number;
  fundingSourceName: string;
  onClose: () => void;
}

// Confetti particle component
const Confetti = ({ delay }: { delay: number }) => {
  const colors = ['#9E89FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const animationDuration = 2 + Math.random() * 2;
  
  return (
    <div
      className="absolute w-3 h-3 rounded-sm animate-confetti"
      style={{
        left: `${left}%`,
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        animationDuration: `${animationDuration}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
    />
  );
};

export function AddMoneySuccess({ amount, fundingSourceName, onClose }: AddMoneySuccessProps) {
  const [show, setShow] = useState(false);
  const [confettiPieces] = useState(() => 
    Array.from({ length: 50 }, (_, i) => i)
  );

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setShow(true), 50);
    
    // Auto-close after 4 seconds
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300);
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          show ? 'bg-opacity-60' : 'bg-opacity-0'
        }`}
        onClick={() => {
          setShow(false);
          setTimeout(onClose, 300);
        }}
      />
      
      {/* Confetti container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((i) => (
          <Confetti key={i} delay={i * 50} />
        ))}
      </div>
      
      {/* Modal */}
      <div 
        className={`relative bg-gradient-to-br from-[#9E89FF] via-[#7B68EE] to-[#6B5BCC] rounded-3xl p-8 max-w-sm mx-4 transform transition-all duration-500 ${
          show 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-50 opacity-0 translate-y-10'
        }`}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-[#9E89FF] blur-2xl opacity-50 -z-10" />
        
        {/* Success icon with pulse */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30" />
            <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle2 className="w-12 h-12 text-[#9E89FF]" />
            </div>
          </div>
        </div>
        
        {/* Amount with bounce animation */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            <span className="text-white text-lg">Money Added!</span>
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
          </div>
          
          <div 
            className={`text-5xl font-bold text-white mb-2 transition-all duration-700 ${
              show ? 'scale-100 opacity-100' : 'scale-150 opacity-0'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            ${amount.toFixed(2)}
          </div>
          
          <div 
            className={`flex items-center justify-center gap-2 text-purple-200 transition-all duration-500 ${
              show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <PartyPopper className="w-5 h-5" />
            <span>from {fundingSourceName}</span>
          </div>
        </div>
        
        {/* Fun message */}
        <p 
          className={`text-center text-purple-100 text-sm mb-6 transition-all duration-500 ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          Your wallet just got a boost! 🚀
        </p>
        
        {/* Close button */}
        <button
          onClick={() => {
            setShow(false);
            setTimeout(onClose, 300);
          }}
          className={`w-full bg-white text-[#9E89FF] font-semibold py-3 rounded-xl hover:bg-purple-50 transition-all duration-300 shadow-lg ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '700ms' }}
        >
          Awesome! 🎉
        </button>
      </div>
      
      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
