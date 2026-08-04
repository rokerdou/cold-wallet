import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const projectRoot = process.cwd();
const cryptoSourcePath = path.join(projectRoot, 'utils', 'crypto.ts');
const cacheDir = path.join(projectRoot, 'node_modules', '.cache', 'omnivault-vector-test');
const compiledPath = path.join(cacheDir, 'crypto-under-test.mjs');

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

const cryptoModule = await import(`${pathToFileURL(compiledPath).href}?cacheBust=${Date.now()}`);
const { generateWalletFromEntropy, generateWalletFromMnemonic } = cryptoModule;

if (typeof generateWalletFromEntropy !== 'function' || typeof generateWalletFromMnemonic !== 'function') {
  throw new Error('Could not load wallet generation functions from utils/crypto.ts');
}

const vectors = [
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

const expectedPaths = {
  Ethereum: "m/44'/60'/0'/0/0",
  'BNB Chain': "m/44'/60'/0'/0/0",
  Polygon: "m/44'/60'/0'/0/0",
  Tron: "m/44'/195'/0'/0/0",
  Bitcoin: "m/84'/0'/0'/0/0",
};

const expectedAssets = {
  Ethereum: ['ETH', 'USDC', 'USDT'],
  'BNB Chain': ['BNB', 'USDT'],
  Polygon: ['POL', 'USDC', 'USDT'],
  Tron: ['TRX', 'USDT'],
  Bitcoin: ['BTC'],
};

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

for (const vector of vectors) {
  const wallet = vector.type === 'entropy'
    ? generateWalletFromEntropy(vector.entropy, vector.passphrase ?? '')
    : generateWalletFromMnemonic(vector.mnemonic, vector.passphrase ?? '');

  assertEqual(wallet.mnemonic, vector.mnemonic, `${vector.name}: mnemonic`);
  assertEqual(wallet.hasPassphrase, vector.hasPassphrase, `${vector.name}: passphrase flag`);
  assertEqual(wallet.wallets.length, Object.keys(vector.addresses).length, `${vector.name}: wallet count`);

  for (const [chain, expectedAddress] of Object.entries(vector.addresses)) {
    const derived = walletByChain(wallet, chain);

    assertEqual(derived.address, expectedAddress, `${vector.name}: ${chain} address`);
    assertEqual(derived.path, expectedPaths[chain], `${vector.name}: ${chain} derivation path`);
    assertArrayEqual(derived.assets, expectedAssets[chain], `${vector.name}: ${chain} assets`);
  }
}

console.log(`Verified ${vectors.length} wallet mapping vectors across ${Object.keys(expectedPaths).length} chains.`);
