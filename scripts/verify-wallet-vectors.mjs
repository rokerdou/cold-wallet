import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { bech32, base58check } from '@scure/base';
import { HDKey } from '@scure/bip32';
import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { hexToBytes } from '@noble/hashes/utils.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import ts from 'typescript';

const projectRoot = process.cwd();
const cryptoSourcePath = path.join(projectRoot, 'utils', 'crypto.ts');
const cacheDir = path.join(projectRoot, 'node_modules', '.cache', 'omnivault-vector-test');
const compiledPath = path.join(cacheDir, 'crypto-under-test.mjs');
const textEncoder = new TextEncoder();

const chainSpecs = {
  Ethereum: {
    path: "m/44'/60'/0'/0/0",
    assets: ['ETH', 'USDC', 'USDT'],
    addressFromPrivateKey: evmAddressFromPrivateKey,
  },
  'BNB Chain': {
    path: "m/44'/60'/0'/0/0",
    assets: ['BNB', 'USDT'],
    addressFromPrivateKey: evmAddressFromPrivateKey,
  },
  Polygon: {
    path: "m/44'/60'/0'/0/0",
    assets: ['POL', 'USDC', 'USDT'],
    addressFromPrivateKey: evmAddressFromPrivateKey,
  },
  Tron: {
    path: "m/44'/195'/0'/0/0",
    assets: ['TRX', 'USDT'],
    addressFromPrivateKey: tronAddressFromPrivateKey,
  },
  Bitcoin: {
    path: "m/84'/0'/0'/0/0",
    assets: ['BTC'],
    addressFromPrivateKey: bitcoinNativeSegwitAddressFromPrivateKey,
  },
};

const knownVectors = [
  {
    name: 'BIP-39 128-bit zero entropy vector',
    type: 'entropy',
    entropy: `0x${'00'.repeat(16)}`,
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    hasPassphrase: false,
    addresses: {
      Ethereum: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      'BNB Chain': '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      Polygon: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      Tron: 'TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH',
      Bitcoin: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
    },
  },
  {
    name: 'BIP-39 256-bit zero entropy vector',
    type: 'entropy',
    entropy: `0x${'00'.repeat(32)}`,
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    hasPassphrase: false,
    addresses: {
      Ethereum: '0xF278cF59F82eDcf871d630F28EcC8056f25C1cdb',
      'BNB Chain': '0xF278cF59F82eDcf871d630F28EcC8056f25C1cdb',
      Polygon: '0xF278cF59F82eDcf871d630F28EcC8056f25C1cdb',
      Tron: 'TEfhiqsW1SdN44DeHrAWVmbyr8ZbvChrtS',
      Bitcoin: 'bc1qzmtrqsfuaf6l6kkcsseumq26ukaphfj9skkug6',
    },
  },
  {
    name: 'BIP-39 passphrase hidden wallet vector',
    type: 'mnemonic',
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    passphrase: 'TREZOR',
    hasPassphrase: true,
    addresses: {
      Ethereum: '0x9c32F71D4DB8Fb9e1A58B0a80dF79935e7256FA6',
      'BNB Chain': '0x9c32F71D4DB8Fb9e1A58B0a80dF79935e7256FA6',
      Polygon: '0x9c32F71D4DB8Fb9e1A58B0a80dF79935e7256FA6',
      Tron: 'TAyDUYP5rcf56xFwrg8cU1qQwvnWpkeapM',
      Bitcoin: 'bc1qv5rmq0kt9yz3pm36wvzct7p3x6mtgehjul0feu',
    },
  },
  {
    name: 'Hardhat default Ethereum mnemonic vector',
    type: 'mnemonic',
    mnemonic: 'test test test test test test test test test test test junk',
    hasPassphrase: false,
    addresses: {
      Ethereum: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      'BNB Chain': '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      Polygon: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      Tron: 'TWer2Ygk5TEheHp3TPuYeqxmB6SsGZmaL6',
      Bitcoin: 'bc1q4qw42stdzjqs59xvlrlxr8526e3nunw7mp73te',
    },
  },
];

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function stripHexPrefix(value) {
  return value.startsWith('0x') ? value.slice(2) : value;
}

function hexToBytesStrict(value) {
  const hex = stripHexPrefix(value);
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error(`Invalid hex value: ${value}`);
  }

  return hexToBytes(hex);
}

function sha256Bytes(data) {
  return sha256(data);
}

function eip55ChecksumAddress(addressBytes) {
  const lower = bytesToHex(addressBytes);
  const hash = bytesToHex(keccak_256(textEncoder.encode(lower)));
  let checksummed = '0x';

  for (let index = 0; index < lower.length; index += 1) {
    const character = lower[index];
    checksummed += Number.parseInt(hash[index], 16) >= 8 ? character.toUpperCase() : character;
  }

  return checksummed;
}

function uncompressedPublicKeyFromPrivateKey(privateKey) {
  return secp256k1.getPublicKey(privateKey, false).slice(1);
}

function evmAddressFromPrivateKey(privateKey) {
  const publicKey = uncompressedPublicKeyFromPrivateKey(privateKey);
  const addressBytes = keccak_256(publicKey).slice(-20);

  return eip55ChecksumAddress(addressBytes);
}

function tronAddressFromPrivateKey(privateKey) {
  const publicKey = uncompressedPublicKeyFromPrivateKey(privateKey);
  const addressBytes = keccak_256(publicKey).slice(-20);
  const payload = new Uint8Array(21);
  payload[0] = 0x41;
  payload.set(addressBytes, 1);

  return base58check(sha256Bytes).encode(payload);
}

function bitcoinNativeSegwitAddressFromPrivateKey(privateKey) {
  const publicKey = secp256k1.getPublicKey(privateKey, true);
  const publicKeyHash = ripemd160(sha256(publicKey));

  return bech32.encode('bc', [0, ...bech32.toWords(publicKeyHash)]);
}

function deriveOracleWallet(mnemonic, passphrase = '') {
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error(`Oracle rejected invalid mnemonic: ${mnemonic}`);
  }

  const seed = mnemonicToSeedSync(mnemonic, passphrase);
  const root = HDKey.fromMasterSeed(seed);
  const result = {};

  for (const [chain, spec] of Object.entries(chainSpecs)) {
    const child = root.derive(spec.path);
    if (!child.privateKey) {
      throw new Error(`Oracle could not derive private key for ${chain}`);
    }

    result[chain] = {
      address: spec.addressFromPrivateKey(child.privateKey),
      path: spec.path,
      assets: spec.assets,
      privateKeyHex: `0x${bytesToHex(child.privateKey)}`,
    };
  }

  return result;
}

function deterministicEntropy(label, byteLength) {
  const entropy = createHash('sha256').update(label).digest().subarray(0, byteLength);

  return `0x${entropy.toString('hex')}`;
}

function dynamicVectors() {
  const entropyByteLengths = [16, 20, 24, 28, 32];
  const passphrases = ['', 'TREZOR', 'correct horse battery staple'];
  const vectors = [];

  for (const byteLength of entropyByteLengths) {
    for (const passphrase of passphrases) {
      const label = `omnivault-dynamic-${byteLength}-${passphrase || 'empty-passphrase'}`;
      const entropy = deterministicEntropy(label, byteLength);
      const mnemonic = entropyToMnemonic(hexToBytesStrict(entropy), wordlist);

      vectors.push({
        name: `dynamic ${byteLength * 8}-bit entropy${passphrase ? ' with passphrase' : ''}`,
        type: 'entropy',
        entropy,
        mnemonic,
        passphrase,
        hasPassphrase: passphrase.length > 0,
        addresses: deriveOracleWallet(mnemonic, passphrase),
      });
    }
  }

  return vectors;
}

function assertEqual(actual, expected, context) {
  if (actual !== expected) {
    throw new Error(`${context}\nExpected: ${expected}\nActual:   ${actual}`);
  }
}

function assertArrayEqual(actual, expected, context) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), context);
}

function walletByChain(wallet, chain) {
  const chainWallet = wallet.wallets.find((candidate) => candidate.chain === chain);
  if (!chainWallet) {
    throw new Error(`Missing chain ${chain}`);
  }

  return chainWallet;
}

async function loadProductionCryptoModule() {
  const source = await readFile(cryptoSourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: cryptoSourcePath,
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      strict: true,
    },
  });

  await mkdir(cacheDir, { recursive: true });
  await writeFile(compiledPath, compiled.outputText, 'utf8');

  return import(`${pathToFileURL(compiledPath).href}?cacheBust=${Date.now()}`);
}

const cryptoModule = await loadProductionCryptoModule();
const { generateWalletFromEntropy, generateWalletFromMnemonic } = cryptoModule;

if (typeof generateWalletFromEntropy !== 'function' || typeof generateWalletFromMnemonic !== 'function') {
  throw new Error('Could not load wallet generation functions from utils/crypto.ts');
}

const allVectors = [
  ...knownVectors,
  ...dynamicVectors(),
];

let addressAssertions = 0;

for (const vector of allVectors) {
  const wallet = vector.type === 'entropy'
    ? generateWalletFromEntropy(vector.entropy, vector.passphrase ?? '')
    : generateWalletFromMnemonic(vector.mnemonic, vector.passphrase ?? '');
  const expectedAddresses = vector.addresses ?? deriveOracleWallet(vector.mnemonic, vector.passphrase ?? '');

  assertEqual(wallet.mnemonic, vector.mnemonic, `${vector.name}: mnemonic`);
  assertEqual(wallet.hasPassphrase, vector.hasPassphrase, `${vector.name}: passphrase flag`);
  assertEqual(wallet.wallets.length, Object.keys(chainSpecs).length, `${vector.name}: wallet count`);

  for (const chain of Object.keys(chainSpecs)) {
    const derived = walletByChain(wallet, chain);
    const expected = typeof expectedAddresses[chain] === 'string'
      ? {
        address: expectedAddresses[chain],
        path: chainSpecs[chain].path,
        assets: chainSpecs[chain].assets,
      }
      : expectedAddresses[chain];

    assertEqual(derived.address, expected.address, `${vector.name}: ${chain} address`);
    assertEqual(derived.path, expected.path, `${vector.name}: ${chain} derivation path`);
    assertArrayEqual(derived.assets, expected.assets, `${vector.name}: ${chain} assets`);
    addressAssertions += 1;
  }
}

console.log(
  `Verified ${allVectors.length} wallet mapping vectors and ${addressAssertions} chain addresses using independent scure/noble derivation.`,
);
