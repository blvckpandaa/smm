/** Supported crypto top-up options (Cryptomus to_currency + network). */

export type CryptoWalletHint = "trust" | "ton" | "any";

export type CryptoAssetId =
  | "btc"
  | "usdt_trc20"
  | "usdt_ton"
  | "ton"
  | "eth"
  | "usdt_bsc";

export type CryptoAsset = {
  id: CryptoAssetId;
  toCurrency: string;
  network: string;
  label: string;
  labelEn: string;
  symbol: string;
  networkLabel: string;
  /** Wallets this asset is meant for in UI */
  wallets: CryptoWalletHint[];
  hintRu: string;
  hintEn: string;
};

export const CRYPTO_ASSETS: readonly CryptoAsset[] = [
  {
    id: "btc",
    toCurrency: "BTC",
    network: "BTC",
    label: "Bitcoin",
    labelEn: "Bitcoin",
    symbol: "BTC",
    networkLabel: "Bitcoin",
    wallets: ["trust", "any"],
    hintRu: "Trust Wallet → Bitcoin → отправьте на адрес из Cryptomus.",
    hintEn: "Trust Wallet → Bitcoin → send to the Cryptomus address.",
  },
  {
    id: "usdt_trc20",
    toCurrency: "USDT",
    network: "TRON",
    label: "USDT TRC-20",
    labelEn: "USDT TRC-20",
    symbol: "USDT",
    networkLabel: "TRON",
    wallets: ["trust", "any"],
    hintRu: "Trust Wallet → USDT → сеть TRC20 (TRON). Низкая комиссия.",
    hintEn: "Trust Wallet → USDT → TRC20 (TRON). Low fees.",
  },
  {
    id: "usdt_ton",
    toCurrency: "USDT",
    network: "TON",
    label: "USDT TON",
    labelEn: "USDT TON",
    symbol: "USDT",
    networkLabel: "TON",
    wallets: ["ton", "trust", "any"],
    hintRu: "TON Wallet или Trust → USDT в сети TON.",
    hintEn: "TON Wallet or Trust → USDT on TON.",
  },
  {
    id: "ton",
    toCurrency: "TON",
    network: "TON",
    label: "Toncoin",
    labelEn: "Toncoin",
    symbol: "TON",
    networkLabel: "TON",
    wallets: ["ton", "trust", "any"],
    hintRu: "TON Wallet / Trust → отправьте TON на адрес Cryptomus.",
    hintEn: "TON Wallet / Trust → send TON to the Cryptomus address.",
  },
  {
    id: "eth",
    toCurrency: "ETH",
    network: "ETH",
    label: "Ethereum",
    labelEn: "Ethereum",
    symbol: "ETH",
    networkLabel: "Ethereum",
    wallets: ["trust", "any"],
    hintRu: "Trust Wallet → Ethereum. Учтите комиссию сети (gas).",
    hintEn: "Trust Wallet → Ethereum. Watch network gas fees.",
  },
  {
    id: "usdt_bsc",
    toCurrency: "USDT",
    network: "BSC",
    label: "USDT BEP-20",
    labelEn: "USDT BEP-20",
    symbol: "USDT",
    networkLabel: "BSC",
    wallets: ["trust", "any"],
    hintRu: "Trust Wallet → USDT → сеть BEP20 (BNB Smart Chain).",
    hintEn: "Trust Wallet → USDT → BEP20 (BNB Smart Chain).",
  },
] as const;

export function getCryptoAsset(id: string | undefined | null): CryptoAsset | null {
  if (!id) return null;
  return CRYPTO_ASSETS.find((a) => a.id === id) ?? null;
}

export function cryptoAssetsForWallet(
  wallet: CryptoWalletHint
): readonly CryptoAsset[] {
  if (wallet === "any") return CRYPTO_ASSETS;
  return CRYPTO_ASSETS.filter((a) => a.wallets.includes(wallet));
}

export const CRYPTO_WALLET_OPTIONS: {
  id: CryptoWalletHint;
  labelRu: string;
  labelEn: string;
  descRu: string;
  descEn: string;
}[] = [
  {
    id: "trust",
    labelRu: "Trust Wallet",
    labelEn: "Trust Wallet",
    descRu: "BTC, USDT, ETH",
    descEn: "BTC, USDT, ETH",
  },
  {
    id: "ton",
    labelRu: "TON Wallet",
    labelEn: "TON Wallet",
    descRu: "TON и USDT TON",
    descEn: "TON & USDT on TON",
  },
  {
    id: "any",
    labelRu: "Любой кошелёк",
    labelEn: "Any wallet",
    descRu: "Все монеты",
    descEn: "All coins",
  },
];
