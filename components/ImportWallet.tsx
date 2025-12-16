import React, { useState } from 'react';
import { generateWalletFromMnemonic, GeneratedWallet } from '../utils/crypto';
import { KeyRound, ArrowLeft, AlertCircle } from 'lucide-react';

interface ImportWalletProps {
  onImport: (wallet: GeneratedWallet) => void;
  onBack: () => void;
}

export const ImportWallet: React.FC<ImportWalletProps> = ({ onImport, onBack }) => {
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);
    try {
      const trimmedPhrase = phrase.trim();
      if (!trimmedPhrase) {
        throw new Error('Please enter a recovery phrase.');
      }
      
      // Attempt to generate. Ethers will throw if checksum or wordlist is invalid.
      const wallet = generateWalletFromMnemonic(trimmedPhrase);
      onImport(wallet);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'INVALID_ARGUMENT') {
        setError('Invalid mnemonic phrase. Please check for typos and word order.');
      } else {
        setError(err.message || 'Failed to import wallet. Ensure the phrase is valid.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in px-4">
      <div className="max-w-2xl w-full bg-slate-900/50 border border-slate-700 p-8 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
            <button 
                onClick={onBack}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            >
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <KeyRound className="text-blue-400" /> Import Existing Wallet
            </h2>
        </div>

        <p className="text-slate-400 mb-6">
            Enter your 12, 15, 18, 21, or 24-word Secret Recovery Phrase to restore your wallet addresses.
        </p>

        <div className="mb-6">
            <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="apple banana cat dog..."
                className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            />
            {error && (
                <div className="mt-3 text-red-400 text-sm flex items-center gap-2 bg-red-900/10 p-2 rounded border border-red-900/20">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
        </div>

        <div className="flex justify-end">
            <button
                onClick={handleImport}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
            >
                Restore Wallet
            </button>
        </div>
      </div>
    </div>
  );
};
