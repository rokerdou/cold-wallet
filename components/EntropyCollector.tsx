import React, { useState, useEffect } from 'react';
import { entropyCollector } from '../utils/entropy';
import { MousePointer2, Lock, ShieldCheck, Download } from 'lucide-react';

interface EntropyCollectorProps {
  onComplete: (entropyHex: string) => void;
  onRequestImport: () => void;
}

export const EntropyCollector: React.FC<EntropyCollectorProps> = ({ onComplete, onRequestImport }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const newProgress = entropyCollector.addEvent(e);
      
      setProgress(prev => {
        // Only update if progress increases to avoid unnecessary renders
        if (newProgress > prev) return newProgress;
        return prev;
      });
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const finalEntropy = entropyCollector.getFinalEntropy();
      // Small delay to show 100% before transitioning
      setTimeout(() => {
        onComplete(finalEntropy);
      }, 500);
    }
  }, [progress, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-fade-in relative">
      {/* Background Gradient that intensifies with progress */}
      <div 
        className="fixed inset-0 bg-gradient-to-b from-transparent to-emerald-900/10 pointer-events-none -z-10 transition-opacity duration-300"
        style={{ opacity: 0.5 + (progress / 200) }}
      />
      
      <div className="max-w-3xl px-6">
        <div className="mb-8 flex justify-center">
            <div className={`
                p-4 rounded-full border shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all duration-500
                ${progress >= 100 ? 'bg-emerald-500 text-white border-emerald-400 scale-110' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
            `}>
                {progress >= 100 ? <Lock className="w-16 h-16" /> : <ShieldCheck className="w-16 h-16" />}
            </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          {progress >= 100 ? 'Entropy Secured' : 'Generate Randomness'}
        </h1>
        <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto">
          {progress >= 100 
            ? "Your wallet is ready to be generated." 
            : "Move your mouse randomly anywhere on the screen to generate cryptographic entropy."}
        </p>

        {/* Large Progress Bar */}
        <div className="w-full max-w-xl mx-auto relative mb-8">
             <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                 <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                 />
             </div>
             <div className="flex justify-between mt-2 text-sm font-mono text-slate-500">
                <span>0%</span>
                <span className={`transition-colors ${progress === 100 ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                    {progress}% Collected
                </span>
                <span>100%</span>
             </div>
        </div>

        {/* Import Option */}
        <div className="mb-12">
            <button 
                onClick={onRequestImport}
                className="text-slate-500 hover:text-blue-400 text-sm flex items-center gap-2 mx-auto transition-colors border-b border-transparent hover:border-blue-400/50 pb-0.5"
            >
                <Download size={14} /> Already have a seed phrase? Import here
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
             <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <MousePointer2 className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-bold text-slate-200 text-lg mb-1">True Randomness</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    By capturing your unique mouse movements across the entire screen, we create unpredictable noise essential for secure key generation.
                </p>
             </div>
             <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <Lock className="w-8 h-8 text-emerald-400 mb-3" />
                <h3 className="font-bold text-slate-200 text-lg mb-1">Double Encryption</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Your physical input is hashed and combined with the browser's cryptographically secure random number generator (CSPRNG).
                </p>
             </div>
             <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <ShieldCheck className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-bold text-slate-200 text-lg mb-1">100% Offline</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    This entire process runs locally in your browser memory. No internet connection is required, and nothing leaves your device.
                </p>
             </div>
        </div>
        
        <div className="mt-12 p-4 bg-yellow-900/10 border border-yellow-700/20 rounded-lg text-yellow-200/60 text-sm max-w-xl mx-auto">
            <strong>Tip:</strong> For maximum security, you can disconnect your internet connection now before continuing.
        </div>
      </div>
    </div>
  );
};