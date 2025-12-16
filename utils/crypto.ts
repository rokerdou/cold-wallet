import { ethers } from 'ethers';
import { utils as TronWebUtils } from 'tronweb';

/**
 * Generates a Tron address from a private key using official TronWeb library.
 * This is more secure and reliable than custom Base58 encoding implementation.
 *
 * @param privateKey - The private key (with or without '0x' prefix)
 * @returns Tron address starting with 'T'
 */
function computeTronAddress(privateKey: string): string {
  // Remove '0x' prefix if present
  const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  try {
    // Use TronWeb's official address generation from private key
    const address = TronWebUtils.address.fromPrivateKey(cleanPrivateKey);
    return address;
  } catch (error) {
    console.error('Failed to generate Tron address:', error);
    throw new Error('Failed to generate Tron address from private key');
  }
}

export interface GeneratedWallet {
  mnemonic: string;
  privateKey: string; // The master private key
  wallets: {
    chain: string;
    symbol: string;
    address: string;
    path: string;
    privateKey: string; // Derived private key for this chain
  }[];
}

/**
 * Internal helper to derive wallets from a Mnemonic object
 */
const deriveWalletsFromMnemonicObject = (mnemonic: ethers.Mnemonic): GeneratedWallet => {
  // Create Master Node at Root "m"
  const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, "m");
  
  // 1. Ethereum / BSC / Polygon / Avalanche (Standard EVM)
  // Path: m/44'/60'/0'/0/0
  const evmPath = "m/44'/60'/0'/0/0";
  const evmWallet = hdNode.derivePath(evmPath);
  
  // 2. Tron
  // Path: m/44'/195'/0'/0/0
  const tronPath = "m/44'/195'/0'/0/0";
  const tronNode = hdNode.derivePath(tronPath);
  // Use TronWeb's official address generation from private key
  const tronAddress = computeTronAddress(tronNode.privateKey);

  return {
    mnemonic: mnemonic.phrase,
    privateKey: hdNode.privateKey,
    wallets: [
      {
        chain: 'Ethereum',
        symbol: 'ERC20',
        address: evmWallet.address,
        path: evmPath,
        privateKey: evmWallet.privateKey,
      },
      {
        chain: 'BNB Chain',
        symbol: 'BEP20',
        address: evmWallet.address, // EVM Compatible
        path: evmPath, // Same derivation as ETH
        privateKey: evmWallet.privateKey,
      },
      {
        chain: 'Polygon',
        symbol: 'ERC20',
        address: evmWallet.address, // EVM Compatible
        path: evmPath, // Same derivation as ETH
        privateKey: evmWallet.privateKey,
      },
      {
        chain: 'Tron',
        symbol: 'TRC20',
        address: tronAddress,
        path: tronPath,
        privateKey: tronNode.privateKey,
      }
    ]
  };
}

/**
 * Generate wallet from collected entropy
 */
export const generateWalletFromEntropy = (entropyHex: string): GeneratedWallet => {
  const mnemonic = ethers.Mnemonic.fromEntropy(ethers.getBytes(entropyHex));
  return deriveWalletsFromMnemonicObject(mnemonic);
};

/**
 * Restore wallet from an existing mnemonic phrase
 */
export const generateWalletFromMnemonic = (phrase: string): GeneratedWallet => {
  const mnemonic = ethers.Mnemonic.fromPhrase(phrase);
  return deriveWalletsFromMnemonicObject(mnemonic);
};
