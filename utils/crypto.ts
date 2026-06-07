import { ethers } from 'ethers';
import { base58check, bech32 } from '@scure/base';

/**
 * Generates a Tron address from a private key.
 * @returns Tron address starting with 'T'
 */
function computeTronAddress(privateKey: string): string {
  const publicKey = ethers.SigningKey.computePublicKey(privateKey, false);
  const publicKeyBytes = ethers.getBytes(publicKey).slice(1);
  const addressBytes = ethers.getBytes(ethers.keccak256(publicKeyBytes)).slice(-20);
  const payload = ethers.getBytes(ethers.concat([new Uint8Array([0x41]), addressBytes]));

  return base58check(sha256Bytes).encode(payload);
}

function computeBitcoinNativeSegwitAddress(privateKey: string): string {
  const compressedPublicKey = ethers.getBytes(ethers.SigningKey.computePublicKey(privateKey, true));
  const publicKeyHash = ethers.getBytes(ethers.ripemd160(ethers.getBytes(ethers.sha256(compressedPublicKey))));
  const words = [0, ...bech32.toWords(publicKeyHash)];

  return bech32.encode('bc', words);
}

function sha256Bytes(data: Uint8Array): Uint8Array {
  return ethers.getBytes(ethers.sha256(data));
}

export interface GeneratedWallet {
  mnemonic: string;
  wallets: {
    chain: string;
    network: string;
    assets: string[];
    address: string;
    path: string;
  }[];
}

/**
 * Internal helper to derive wallets from a Mnemonic object
 */
const deriveWalletsFromMnemonicObject = (mnemonic: ethers.Mnemonic): GeneratedWallet => {
  // Create Master Node at Root "m"
  const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, "m");
  
  // 1. Ethereum / BSC / Polygon (Standard EVM)
  // Path: m/44'/60'/0'/0/0
  const evmPath = "m/44'/60'/0'/0/0";
  const evmWallet = hdNode.derivePath(evmPath);
  
  // 2. Tron
  // Path: m/44'/195'/0'/0/0
  const tronPath = "m/44'/195'/0'/0/0";
  const tronNode = hdNode.derivePath(tronPath);
  const tronAddress = computeTronAddress(tronNode.privateKey);

  // 3. Bitcoin Native SegWit
  // Path: m/84'/0'/0'/0/0
  const bitcoinPath = "m/84'/0'/0'/0/0";
  const bitcoinNode = hdNode.derivePath(bitcoinPath);
  const bitcoinAddress = computeBitcoinNativeSegwitAddress(bitcoinNode.privateKey);

  return {
    mnemonic: mnemonic.phrase,
    wallets: [
      {
        chain: 'Ethereum',
        network: 'ERC20',
        assets: ['ETH', 'USDC', 'USDT'],
        address: evmWallet.address,
        path: evmPath,
      },
      {
        chain: 'BNB Chain',
        network: 'BEP20',
        assets: ['BNB', 'USDT'],
        address: evmWallet.address, // EVM Compatible
        path: evmPath, // Same derivation as ETH
      },
      {
        chain: 'Polygon',
        network: 'Polygon PoS',
        assets: ['POL', 'USDC', 'USDT'],
        address: evmWallet.address, // EVM Compatible
        path: evmPath, // Same derivation as ETH
      },
      {
        chain: 'Tron',
        network: 'TRC20',
        assets: ['TRX', 'USDT'],
        address: tronAddress,
        path: tronPath,
      },
      {
        chain: 'Bitcoin',
        network: 'Native SegWit',
        assets: ['BTC'],
        address: bitcoinAddress,
        path: bitcoinPath,
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
