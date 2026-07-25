import React, { useState, useEffect, useRef } from 'react';
import { MouseEntropyCollector, generateSystemEntropy } from '../utils/entropy';
import { Cpu, Download, Lock, MousePointer2, ShieldCheck } from 'lucide-react';

interface EntropyCollectorProps {
  onComplete: (entropyHex: string) => void;
  onRequestImport: () => void;
}

export const EntropyCollector: React.FC<EntropyCollectorProps> = ({ onComplete, onRequestImport }) => {
  const [progress, setProgress] = useState(0);
  const [useMouseEntropy, setUseMouseEntropy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 创建新实例而非使用全局单例，防止数据残留
  const collectorRef = useRef<MouseEntropyCollector>(new MouseEntropyCollector());
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!useMouseEntropy) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const newProgress = collectorRef.current.addEvent(e);
      
      setProgress(prev => {
        // Only update if progress increases to avoid unnecessary renders
        if (newProgress > prev) return newProgress;
        return prev;
      });
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [useMouseEntropy]);

  useEffect(() => {
    if (useMouseEntropy && progress >= 100 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      let finalEntropy: string;

      try {
        finalEntropy = collectorRef.current.getFinalEntropy();
      } catch (error) {
        hasCompletedRef.current = false;
        console.error(error);
        return;
      }

      // Small delay to show 100% before transitioning
      setTimeout(() => {
        onComplete(finalEntropy);
      }, 500);
    }
  }, [progress, onComplete, useMouseEntropy]);

  const generateWithSystemEntropy = () => {
    if (hasCompletedRef.current) return;

    try {
      hasCompletedRef.current = true;
      setError(null);
      onComplete(generateSystemEntropy());
    } catch (err) {
      hasCompletedRef.current = false;
      setError(err instanceof Error ? err.message : 'Failed to generate secure entropy.');
    }
  };

  const enableMouseEntropy = () => {
    setError(null);
    setProgress(0);
    hasCompletedRef.current = false;
    collectorRef.current.reset();
    setUseMouseEntropy(true);
  };

  const disableMouseEntropy = () => {
    setError(null);
    setProgress(0);
    hasCompletedRef.current = false;
    collectorRef.current.reset();
    setUseMouseEntropy(false);
  };

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
                {progress >= 100 ? <Lock className="w-16 h-16" /> : useMouseEntropy ? <MousePointer2 className="w-16 h-16" /> : <ShieldCheck className="w-16 h-16" />}
            </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          {progress >= 100 ? 'Entropy Secured' : 'Generate Wallet'}
        </h1>
        <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto">
          {progress >= 100
            ? "Your wallet is ready to be generated."
            : useMouseEntropy
              ? "Move your mouse randomly anywhere on the screen to add optional physical entropy."
              : "Generate a 256-bit BIP-39 seed phrase using the browser's cryptographically secure random source."}
        </p>

        {/* Large Progress Bar */}
        {useMouseEntropy && (
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
        )}

        {!useMouseEntropy && (
          <div className="mb-8 flex flex-col items-center gap-4">
            <button
              onClick={generateWithSystemEntropy}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Cpu size={18} /> Generate Secure Wallet
            </button>
            {error && (
              <div className="max-w-xl rounded-lg border border-red-900/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>
        )}

        {useMouseEntropy && error && (
          <div className="mx-auto mb-8 max-w-xl rounded-lg border border-red-900/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Import Option */}
        <div className="mb-12 flex flex-col items-center gap-3">
            <button 
                onClick={onRequestImport}
                className="text-slate-500 hover:text-blue-400 text-sm flex items-center gap-2 mx-auto transition-colors border-b border-transparent hover:border-blue-400/50 pb-0.5"
            >
                <Download size={14} /> Already have a seed phrase? Import here
            </button>
            {useMouseEntropy ? (
              <button
                onClick={disableMouseEntropy}
                className="text-slate-500 hover:text-emerald-400 text-sm flex items-center gap-2 mx-auto transition-colors border-b border-transparent hover:border-emerald-400/50 pb-0.5"
              >
                <Cpu size={14} /> Use system random only
              </button>
            ) : (
              <button
                onClick={enableMouseEntropy}
                className="text-slate-500 hover:text-blue-400 text-sm flex items-center gap-2 mx-auto transition-colors border-b border-transparent hover:border-blue-400/50 pb-0.5"
              >
                <MousePointer2 size={14} /> Add optional mouse entropy
              </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
             <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <Cpu className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-bold text-slate-200 text-lg mb-1">System CSPRNG</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Wallet entropy comes from the browser's cryptographically secure random number generator.
                </p>
             </div>
             <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <Lock className="w-8 h-8 text-emerald-400 mb-3" />
                <h3 className="font-bold text-slate-200 text-lg mb-1">256-bit Entropy</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    The generator produces 32 bytes of entropy for a 24-word BIP-39 recovery phrase.
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
