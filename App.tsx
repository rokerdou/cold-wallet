import React, { useState, useEffect, useRef } from 'react';
import { EntropyCollector } from './components/EntropyCollector';
import { WalletDashboard } from './components/WalletDashboard';
import { ImportWallet } from './components/ImportWallet';
import { generateWalletFromEntropy, GeneratedWallet } from './utils/crypto';
import { Activity } from 'lucide-react';

// 会话超时时间（5分钟）
const SESSION_TIMEOUT = 5 * 60 * 1000;

const App: React.FC = () => {
  const [stage, setStage] = useState<'collecting' | 'generated' | 'importing'>('collecting');
  const [wallet, setWallet] = useState<GeneratedWallet | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 安全清理函数：清除敏感数据并重置会话
   */
  const secureCleanup = () => {
    // 清除钱包数据
    setWallet(null);
    setStage('collecting');

    // 清除会话超时定时器
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  };

  /**
   * 重置会话超时计时器
   */
  const resetSessionTimeout = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }

    // 仅在生成钱包后设置超时
    if (stage === 'generated' && wallet) {
      sessionTimeoutRef.current = setTimeout(() => {
        alert('安全超时：钱包数据已从内存中清除');
        secureCleanup();
      }, SESSION_TIMEOUT);
    }
  };

  // 钱包数据变化时设置会话超时
  useEffect(() => {
    resetSessionTimeout();

    return () => {
      // 组件卸载时清理定时器
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [wallet, stage]);

  // 组件卸载时清除敏感数据
  useEffect(() => {
    return () => {
      // 尝试清零内存中的敏感数据（虽然JavaScript不保证内存清零）
      if (wallet) {
        // 删除对象引用，帮助垃圾回收
        delete (wallet as any).mnemonic;
        delete (wallet as any).privateKey;
        if (wallet.wallets) {
          wallet.wallets.forEach(w => {
            delete (w as any).privateKey;
          });
        }
      }
    };
  }, [wallet]);

  const handleEntropyComplete = (entropyHex: string) => {
    // Generate the wallet
    const generated = generateWalletFromEntropy(entropyHex);
    setWallet(generated);
    setStage('generated');
  };

  const handleImportWallet = (importedWallet: GeneratedWallet) => {
    setWallet(importedWallet);
    setStage('generated');
  };

  const handleReset = () => {
    secureCleanup();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-emerald-500/30">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div 
                className="flex items-center gap-2 cursor-pointer" 
                onClick={handleReset}
            >
              <div className="bg-emerald-500 p-1.5 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
                OmniVault
              </span>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center space-x-4">
                 <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   Offline Mode Active
                 </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto py-8">
        {stage === 'collecting' && (
          <EntropyCollector 
            onComplete={handleEntropyComplete} 
            onRequestImport={() => setStage('importing')}
          />
        )}

        {stage === 'importing' && (
            <ImportWallet 
                onImport={handleImportWallet} 
                onBack={() => setStage('collecting')}
            />
        )}
        
        {stage === 'generated' && wallet && (
          <WalletDashboard wallet={wallet} onReset={handleReset} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-600 text-sm print:hidden">
        <p>© {new Date().getFullYear()} OmniVault Open Source.</p>
        <p className="mt-1">
          Keys are generated locally in your browser memory. Nothing is ever sent to a server.
        </p>
      </footer>
      
      {/* Print Styles Override */}
      <style>{`
        @media print {
            body { background-color: white; color: black; }
            .animate-fade-in { animation: none !important; }
            nav, footer { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
