import React, { useState } from 'react';
import { GeneratedWallet } from '../utils/crypto';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Eye, EyeOff, Printer, RefreshCw, AlertTriangle, Shield, Wallet } from 'lucide-react';

interface WalletDashboardProps {
  wallet: GeneratedWallet;
  onReset: () => void;
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({ wallet, onReset }) => {
  const [showSensitive, setShowSensitive] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const printWallet = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in pb-24">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <Shield className="text-emerald-400" /> Secure Wallet Generated
           </h2>
           <p className="text-slate-400 text-sm mt-1">
             Store your Secret Recovery Phrase in a safe place. It is the ONLY way to recover your funds.
           </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={printWallet}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
            >
                <Printer size={18} /> Print Paper Wallet
            </button>
            <button 
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors border border-red-900/30"
            >
                <RefreshCw size={18} /> Start Over
            </button>
        </div>
      </div>

      {/* Secret Phrase Section */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-8 shadow-xl print:border-black print:shadow-none">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
                <AlertTriangle size={20} /> Secret Recovery Phrase (BIP-39)
            </h3>
            <button 
                onClick={() => setShowSensitive(!showSensitive)}
                className="text-slate-400 hover:text-white transition-colors print:hidden"
            >
                {showSensitive ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
        </div>
        
        <div className="relative group">
            <div className={`
                grid grid-cols-3 md:grid-cols-4 gap-4 p-6 rounded-lg font-mono text-lg
                ${showSensitive ? 'bg-slate-950 text-white' : 'bg-slate-800 text-transparent select-none blur-sm'}
                print:bg-white print:text-black print:blur-0 print:border print:border-black
            `}>
                {wallet.mnemonic.split(' ').map((word, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm select-none print:text-gray-500">{i + 1}.</span>
                        <span>{word}</span>
                    </div>
                ))}
            </div>
            {!showSensitive && (
                <div className="absolute inset-0 flex items-center justify-center print:hidden">
                    <button 
                        onClick={() => setShowSensitive(true)}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-medium transition-colors shadow-lg"
                    >
                        Click to Reveal
                    </button>
                </div>
            )}
        </div>
        <div className="mt-4 flex justify-end print:hidden">
            <button 
                onClick={() => copyToClipboard(wallet.mnemonic, 'mnemonic')}
                className="text-sm flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors"
            >
                {copied === 'mnemonic' ? 'Copied!' : 'Copy Phrase'} <Copy size={14} />
            </button>
        </div>
      </div>

      {/* Wallets Grid */}
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 print:text-black">
        <Wallet className="text-blue-400" /> Multi-Chain USDT Addresses
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
        {wallet.wallets.map((w) => (
            <div key={w.chain} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden print:bg-white print:border-black print:text-black">
                {/* Card Header */}
                <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center print:bg-gray-100 print:border-black">
                    <div>
                        <h4 className="font-bold text-white text-lg print:text-black">{w.chain}</h4>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 print:border-black print:text-black print:bg-transparent">
                            USDT-{w.symbol}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 font-mono print:text-gray-600">Derivation Path</p>
                        <p className="text-xs text-slate-400 font-mono print:text-black">{w.path}</p>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col items-center space-y-6">
                    <div className="p-2 bg-white rounded-lg">
                        <QRCodeSVG value={w.address} size={140} level="M" />
                    </div>
                    
                    <div className="w-full">
                        <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block print:text-gray-600">Public Address</label>
                        <div 
                            className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-sm text-slate-300 break-all cursor-pointer hover:border-blue-500/50 transition-colors flex justify-between items-start gap-2 print:bg-white print:border-gray-300 print:text-black"
                            onClick={() => copyToClipboard(w.address, `addr-${w.chain}`)}
                        >
                            <span>{w.address}</span>
                            <Copy size={14} className="mt-1 shrink-0 opacity-50 print:hidden" />
                        </div>
                        {copied === `addr-${w.chain}` && <span className="text-xs text-emerald-400 mt-1 block text-right print:hidden">Copied!</span>}
                    </div>

                    <div className="w-full print:hidden">
                        <label className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block">Private Key</label>
                        <div className="relative">
                            <input 
                                type={showSensitive ? "text" : "password"}
                                readOnly
                                value={w.privateKey}
                                className="w-full bg-slate-950 p-3 rounded border border-slate-800 font-mono text-sm text-red-300 focus:outline-none focus:border-red-500/50"
                            />
                            <button 
                                onClick={() => copyToClipboard(w.privateKey, `pk-${w.chain}`)}
                                className="absolute right-3 top-3 text-slate-600 hover:text-white"
                            >
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 text-center text-sm text-gray-500">
        <p>Generated by OmniVault Offline Generator.</p>
        <p>DO NOT SHARE YOUR RECOVERY PHRASE WITH ANYONE.</p>
      </div>
    </div>
  );
};
