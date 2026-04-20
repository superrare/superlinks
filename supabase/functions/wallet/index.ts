// Supabase edge-function code uses 2-space indentation (Deno convention).
import { CdpClient } from "npm:@coinbase/cdp-sdk";
import { corsHeaders, json, getUser } from "../_shared/utils.ts";

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

function getAlchemyUrl() {
  const key = Deno.env.get("ALCHEMY_API_KEY");
  if (key) return `https://base-sepolia.g.alchemy.com/v2/${key}`;
  return "https://sepolia.base.org"; // fallback to public RPC
}

function getCdp() {
  return new CdpClient({
    apiKeyId: Deno.env.get("CDP_API_KEY_ID"),
    apiKeySecret: Deno.env.get("CDP_API_KEY_SECRET"),
    walletSecret: Deno.env.get("CDP_WALLET_SECRET"),
  });
}

// Call Base Sepolia JSON-RPC
async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(getAlchemyUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

// Get ETH balance
async function getEthBalance(address: string): Promise<string> {
  const hex = await rpcCall("eth_getBalance", [address, "latest"]);
  const wei = BigInt(hex);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

// Get ERC-20 balance (USDC has 6 decimals)
async function getUsdcBalance(address: string): Promise<string> {
  // balanceOf(address) selector = 0x70a08231
  const paddedAddress = address.slice(2).toLowerCase().padStart(64, "0");
  const data = `0x70a08231${paddedAddress}`;
  const hex = await rpcCall("eth_call", [{ to: USDC_ADDRESS, data }, "latest"]);
  const raw = BigInt(hex);
  const usdc = Number(raw) / 1e6;
  return usdc.toFixed(2);
}

// Get recent transfers via Alchemy Asset Transfers API
async function getAssetTransfers(address: string, category: string[]) {
  const alchemyUrl = getAlchemyUrl();

  // Fetch both sent and received
  const [sentRes, receivedRes] = await Promise.all([
    fetch(alchemyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{ fromAddress: address, category, order: "desc", maxCount: "0x14", withMetadata: true }],
      }),
    }),
    fetch(alchemyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 2,
        method: "alchemy_getAssetTransfers",
        params: [{ toAddress: address, category, order: "desc", maxCount: "0x14", withMetadata: true }],
      }),
    }),
  ]);

  const sentData = await sentRes.json();
  const receivedData = await receivedRes.json();

  const sent = (sentData.result?.transfers ?? []).map((tx: any) => ({ ...tx, direction: "sent" }));
  const received = (receivedData.result?.transfers ?? []).map((tx: any) => ({ ...tx, direction: "received" }));

  return [...sent, ...received];
}

async function getTransactions(address: string) {
  const transfers = await getAssetTransfers(address, ["external"]);
  return transfers.map((tx: any) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: String(Math.floor((tx.value ?? 0) * 1e18)),
    timestamp: tx.metadata?.blockTimestamp ?? new Date().toISOString(),
    status: "ok",
    method: null,
    fee: null,
  }));
}

async function getTokenTransfers(address: string) {
  const transfers = await getAssetTransfers(address, ["erc20"]);
  return transfers.map((tx: any) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: String(Math.floor((tx.value ?? 0) * 1e6)),
    decimals: "6",
    tokenSymbol: tx.asset ?? "USDC",
    tokenName: tx.rawContract?.address === USDC_ADDRESS.toLowerCase() ? "USD Coin" : (tx.asset ?? "Token"),
    timestamp: tx.metadata?.blockTimestamp ?? new Date().toISOString(),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const userToken = req.headers.get("x-user-token");
    if (!userToken) return json({ error: "Missing x-user-token header" }, 401);

    const { user, supabase } = await getUser(userToken);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = (body.action as string) ?? new URL(req.url).pathname.split("/").pop();

    switch (action) {
      case "create": {
        const { data: existing } = await supabase
          .from("wallets")
          .select("id, address")
          .eq("user_id", user.id)
          .single();

        if (existing) {
          return json({ address: existing.address, existing: true });
        }

        const cdp = getCdp();
        const account = await cdp.evm.createAccount();

        await supabase.from("wallets").insert({
          user_id: user.id,
          provider: "cdp",
          provider_wallet_id: account.address,
          address: account.address,
          network: (body.network as string) ?? "base-sepolia",
        });

        return json({ address: account.address, existing: false });
      }

      case "balance": {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("provider_wallet_id")
          .eq("user_id", user.id)
          .single();

        if (!wallet) return json({ error: "No wallet found" }, 404);

        const address = wallet.provider_wallet_id;
        const [eth, usdc] = await Promise.all([
          getEthBalance(address),
          getUsdcBalance(address),
        ]);

        return json({ eth, usdc, address });
      }

      case "transactions": {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("provider_wallet_id, address")
          .eq("user_id", user.id)
          .single();

        if (!wallet) return json({ error: "No wallet found" }, 404);

        // Try Blockscout, but don't fail if it's down
        let txs: any[] = [];
        let tokenTransfers: any[] = [];
        try {
          [txs, tokenTransfers] = await Promise.all([
            getTransactions(wallet.address),
            getTokenTransfers(wallet.address),
          ]);
        } catch (e) {
          console.error("Blockscout fetch failed:", e);
        }

        // Also include purchase transactions from our own DB
        const { data: purchases } = await supabase
          .from("purchases")
          .select("tx_hash, price_paid, created_at, product_id, buyer_id, seller_id, products!inner(title, preview_path)")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(20);

        // Build purchase lookup by tx hash for enrichment
        const purchaseByHash = new Map<string, any>();
        for (const p of purchases ?? []) {
          const isBuyer = p.buyer_id === user.id;
          let previewUrl: string | null = null;
          if (p.products?.preview_path) {
            const { data: urlData } = supabase.storage
              .from("commerce-previews")
              .getPublicUrl(p.products.preview_path);
            previewUrl = urlData?.publicUrl ?? null;
          }
          purchaseByHash.set(p.tx_hash, {
            hash: p.tx_hash,
            from: isBuyer ? wallet.address : "seller",
            to: isBuyer ? "seller" : wallet.address,
            value: String(Math.floor(parseFloat(p.price_paid) * 1e6)),
            decimals: "6",
            tokenSymbol: "USDC",
            tokenName: "USD Coin",
            timestamp: p.created_at,
            label: isBuyer
              ? `Purchased: ${p.products?.title ?? "product"}`
              : `Sold: ${p.products?.title ?? "product"}`,
            previewUrl,
            productId: p.product_id,
          });
        }

        // Replace raw Alchemy transfers with enriched purchase data where hashes match
        const enrichedTokenTransfers = tokenTransfers.map((tx: any) => {
          const purchase = purchaseByHash.get(tx.hash);
          if (purchase) {
            purchaseByHash.delete(tx.hash); // consumed
            return purchase;
          }
          return tx;
        });

        // Add any remaining purchase txs not found in Alchemy (e.g. too recent)
        const remainingPurchases = Array.from(purchaseByHash.values());

        return json({ transactions: txs, tokenTransfers: [...enrichedTokenTransfers, ...remainingPurchases] });
      }

      case "send": {
        const { to, amount, token } = body as { to: string; amount: string; token?: string };
        if (!to || !amount) return json({ error: "Missing 'to' or 'amount'" }, 400);

        const { data: wallet } = await supabase
          .from("wallets")
          .select("provider_wallet_id")
          .eq("user_id", user.id)
          .single();

        if (!wallet) return json({ error: "No wallet found" }, 404);

        let toAddress = to;
        if (!to.startsWith("0x")) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", to)
            .single();

          if (!profile) return json({ error: `User '${to}' not found` }, 404);

          const { data: recipientWallet } = await supabase
            .from("wallets")
            .select("address")
            .eq("user_id", profile.id)
            .single();

          if (!recipientWallet) return json({ error: `User '${to}' has no wallet` }, 404);
          toAddress = recipientWallet.address;
        }

        const cdp = getCdp();
        let txHash;

        if (token === "usdc") {
          // ERC-20 transfer: transfer(address,uint256)
          const decimals = 6;
          const rawAmount = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));
          const selector = "0xa9059cbb"; // transfer(address,uint256)
          const paddedTo = toAddress.slice(2).toLowerCase().padStart(64, "0");
          const paddedAmount = rawAmount.toString(16).padStart(64, "0");
          const data = `${selector}${paddedTo}${paddedAmount}`;

          txHash = await cdp.evm.sendTransaction({
            address: wallet.provider_wallet_id as `0x${string}`,
            network: "base-sepolia",
            transaction: {
              to: USDC_ADDRESS as `0x${string}`,
              data: data as `0x${string}`,
              value: 0n,
            },
          });
        } else {
          // Native ETH transfer
          txHash = await cdp.evm.sendTransaction({
            address: wallet.provider_wallet_id as `0x${string}`,
            network: "base-sepolia",
            transaction: {
              to: toAddress as `0x${string}`,
              value: BigInt(Math.floor(parseFloat(amount) * 1e18)),
            },
          });
        }

        return json({ txHash });
      }

      case "faucet": {
        const token = (body.token as string) ?? "usdc";
        const { data: wallet } = await supabase
          .from("wallets")
          .select("provider_wallet_id")
          .eq("user_id", user.id)
          .single();

        if (!wallet) return json({ error: "No wallet found" }, 404);

        const cdp = getCdp();
        const faucetTx = await cdp.evm.requestFaucet({
          address: wallet.provider_wallet_id as `0x${string}`,
          network: "base-sepolia",
          token: token as "eth" | "usdc",
        });

        return json({ txHash: faucetTx, token, address: wallet.provider_wallet_id });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
