import React, { useState } from 'react';
import { EntropyCollector } from './components/EntropyCollector';
import { WalletDashboard } from './components/WalletDashboard';
import { ImportWallet } from './components/ImportWallet';
import { generateWalletFromEntropy, GeneratedWallet } from './utils/crypto';
import { entropyCollector } from './utils/entropy';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  const [stage, setStage] = useState<'collecting' | 'generated' | 'importing'>('collecting');
  const [wallet, setWallet] = useState<GeneratedWallet | null>(null);

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
    setWallet(null);
    setStage('collecting');
    entropyCollector.reset();
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
