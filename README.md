# OmniVault Cold Wallet

OmniVault 是一个前端本地运行的多资产冷钱包生成工具。它用于在可信浏览器中离线生成 BIP-39 助记词，并从同一助记词派生多条公链地址。

> 安全边界很清楚：本项目不托管、不保存、不恢复用户资产。助记词一旦丢失无法找回；助记词或 BIP-39 passphrase 泄露则资产可能被转走。

## 当前支持的功能

- 生成 24 个 BIP-39 助记词，默认使用 256-bit 熵。
- 支持导入已有 12/15/18/21/24 个 BIP-39 助记词。
- 支持 BIP-39 passphrase，也就是常见的“隐藏钱包”模式。
- 支持多链地址派生：
  - Ethereum / ERC20: ETH、USDC、USDT
  - BNB Chain / BEP20: BNB、USDT
  - Polygon PoS: POL、USDC、USDT
  - Tron / TRC20: TRX、USDT
  - Bitcoin Native SegWit: BTC
- 支持多种熵模式：
  - 系统 CSPRNG: `window.crypto.getRandomValues`
  - 骰子序列 + 系统 CSPRNG
  - 硬币正反面序列 + 系统 CSPRNG
  - 可选鼠标移动熵 + 系统 CSPRNG
- 支持生成纯静态单文件离线版本：`offline/omnivault-offline.html`。
- 助记词默认隐藏，支持打印纸钱包和复制公开地址。
- 生成后 5 分钟自动清理页面内钱包状态。

## 基本原理

### 1. 随机熵来源

默认模式直接从浏览器安全随机数发生器读取 32 字节：

```text
entropy = window.crypto.getRandomValues(32 bytes)
```

这相当于 256-bit 熵，并用于生成 24 个 BIP-39 助记词。

### 2. 骰子和硬币模式

骰子和硬币输入只作为补充熵，不是主安全来源。即使用户输入的是弱序列，比如全是 `111111...` 或 `HHHH...`，系统仍然会强制混入新的 256-bit CSPRNG。

当前混合模型是：

```text
final_entropy = CSPRNG_256 XOR SHA256(人工输入序列)
```

如果人工输入弱、可预测、甚至攻击者完全知道，那么 `SHA256(人工输入序列)` 只是一个已知 256-bit 掩码。均匀随机的 `CSPRNG_256 XOR 已知掩码` 仍然是均匀的 256-bit 随机数，因此弱人工序列不会降低系统 CSPRNG 的安全性。

公平情况下的人工熵估算：

- 每个 6 面骰结果约 `log2(6) = 2.585` bits。
- 50 个骰子数字约 129 bits；100 个约 258 bits。
- 每次公平硬币正反面约 1 bit。
- 128 次硬币约 128 bits；256 次约 256 bits。

这些人工熵是增强项；钱包安全性不依赖它们必须足够强。

### 3. 助记词和隐藏钱包

程序使用 `ethers` 的 BIP-39/HD 钱包实现：

```text
entropy -> BIP-39 mnemonic -> seed -> HD wallet -> chain addresses
```

开启 BIP-39 passphrase 后，同一组助记词会派生到另一套隐藏钱包地址。恢复时必须输入完全相同的助记词和完全相同的 passphrase；passphrase 的大小写、空格、符号都会影响结果。

### 4. 多链地址派生路径

- EVM / ETH / BNB Chain / Polygon: `m/44'/60'/0'/0/0`
- Tron: `m/44'/195'/0'/0/0`
- Bitcoin Native SegWit: `m/84'/0'/0'/0/0`

USDC、USDT 这类代币本身没有独立私钥。它们使用所在链地址的同一套私钥，例如 Ethereum USDC 使用 Ethereum 地址，Polygon USDC 使用 Polygon 地址。

## 离线使用方式

推荐冷钱包使用纯静态单文件版本：

```text
offline/omnivault-offline.html
```

建议流程：

1. 在联网机器上拉取代码并确认 commit。
2. 安装依赖并构建静态文件。
3. 将 `offline/omnivault-offline.html` 拷贝到物理隔离设备。
4. 在隔离设备浏览器中直接打开该 HTML 文件。
5. 生成助记词后手写备份，确认地址，再清理设备环境。

重新生成单文件：

```bash
pnpm install
pnpm run build:static
```

普通开发运行：

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
```

## 安全注意事项

- 使用物理隔离设备时，不要连接网络、蓝牙或未知 USB 设备。
- 使用可信浏览器和干净系统；如果操作系统或浏览器已被入侵，前端代码无法防止助记词被窃取。
- 推荐使用 `offline/omnivault-offline.html`，不要在冷钱包操作中使用 Vite dev server。
- 不要截图、拍照、云同步或保存助记词到电子文档。
- 谨慎使用剪贴板，系统剪贴板可能被其他程序读取。
- 打印纸钱包前确认打印机没有联网、缓存或云打印功能。
- BIP-39 passphrase 一旦遗忘，隐藏钱包无法恢复。
- 12 词和 24 词不能互相“转换”。如果钱包生成的是 24 词，就必须按 24 词备份和恢复。
- 生成后应使用其他经过审计的钱包或离线工具交叉验证助记词、地址和派生路径。
- 大额资产仍建议优先使用成熟硬件钱包或经过长期审计的钱包方案。

## 本地校验建议

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm run test:vectors
pnpm run build
pnpm run build:static
pnpm audit
npm audit
```

检查单文件是否还有外部资源或主动网络调用：

```bash
rg -n "<script[^>]+src=|<link[^>]+href=|fetch\\(|XMLHttpRequest|WebSocket|sendBeacon|axios" offline/omnivault-offline.html
```

正常情况下这条扫描不应输出结果。

`pnpm run test:vectors` 会校验助记词、BIP-39 passphrase、派生路径、ETH/EVM、Tron 和 BTC Native SegWit 地址映射。门禁包含固定公开向量，以及由 `@scure/bip39`、`@scure/bip32`、`@noble/curves`、`@noble/hashes` 独立推导的动态向量；测试会从助记词推导私钥、公钥和地址，再与生产代码输出比较。任何地址、路径或资产列表不匹配都会让命令失败，避免助记词与钱包地址映射错误被带入发布版本。

## 已知边界

- JavaScript 无法保证字符串内存被彻底清零，助记词在显示期间会存在于浏览器内存和页面状态中。
- 页面隐藏助记词只是视觉保护，不是内存级保护。
- 本项目不查询链上余额，不广播交易，也不连接节点。
- 依赖安全取决于 lockfile、构建环境和供应链完整性。
- 前端静态工具无法抵御已被控制的浏览器扩展、恶意输入法、键盘记录器、屏幕录制或系统级恶意软件。
