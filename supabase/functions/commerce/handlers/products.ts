// Supabase edge-function code uses 2-space indentation (Deno convention).
import { json, publicUrl, decodeJwtPayload } from "../../_shared/utils.ts";
import type { GetHandlerCtx, PostHandlerCtx } from "../../_shared/types.ts";
import { svcSupabase } from "../../_shared/supabase.ts";

// Lazy-loaded CDP client — the @coinbase/cdp-sdk is large, so we only pull it in
// when the first `buy` request arrives, then reuse the client across subsequent
// requests in the same isolate.
// deno-lint-ignore no-explicit-any
let _cdpClient: any = null;
async function getCdpClient() {
  if (_cdpClient) return _cdpClient;
  const { CdpClient } = await import("npm:@coinbase/cdp-sdk@1.47.0");
  _cdpClient = new CdpClient({
    apiKeyId: Deno.env.get("CDP_API_KEY_ID"),
    apiKeySecret: Deno.env.get("CDP_API_KEY_SECRET"),
    walletSecret: Deno.env.get("CDP_WALLET_SECRET"),
  });
  return _cdpClient;
}

// GET /commerce/preview/:productId
export async function handlePreview(ctx: GetHandlerCtx): Promise<Response> {
  const productId = ctx.resourceId;
  const supabase = svcSupabase;

  const { data: product } = await supabase
    .from("products")
    .select("preview_path")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (!product?.preview_path) return json({ error: "No preview available" }, 404);

  const { data: signed } = await supabase.storage
    .from("commerce-previews")
    .createSignedUrl(product.preview_path, 300);

  if (!signed) return json({ error: "Failed to generate preview URL" }, 500);
  return Response.redirect(signed.signedUrl, 302);
}

// GET /commerce/content/:productId
export async function handleContent(ctx: GetHandlerCtx): Promise<Response> {
  const productId = ctx.resourceId;
  const userToken = ctx.req.headers.get("x-user-token");
  const supabase = svcSupabase;

  if (!userToken) {
    const { data: product } = await supabase
      .from("products")
      .select("*, storefronts!inner(owner_id)")
      .eq("id", productId)
      .eq("status", "active")
      .maybeSingle();

    if (!product) return json({ error: "Product not found" }, 404);

    const { data: sellerWallet } = await supabase
      .from("wallets")
      .select("address")
      .eq("user_id", product.creator_id)
      .maybeSingle();

    return json(
      {
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: "base-sepolia",
            maxAmountRequired: String(Math.floor(parseFloat(product.price) * 1e6)),
            resource: `${Deno.env.get("SUPABASE_URL")}/functions/v1/commerce/content/${productId}`,
            description: `Purchase: ${product.title}`,
            payTo: sellerWallet?.address ?? "",
            maxTimeoutSeconds: 60,
            extra: {
              productId: product.id,
              title: product.title,
              price: product.price,
              currency: "USDC",
            },
          },
        ],
      },
      402,
    );
  }

  // Authenticated download — verify purchase.
  // We decode (without signature verification) only to extract `sub` for a
  // cookie-style content-gate lookup. Any action that mutates data goes through
  // the POST path, which uses the signature-verifying getUser().
  const payload = decodeJwtPayload(userToken);
  if (!payload.sub) return json({ error: "Invalid token" }, 401);
  const userId = payload.sub as string;

  const { data: purchase } = await supabase
    .from("purchases")
    .select("*")
    .eq("product_id", productId)
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return json({ error: "Product not found" }, 404);

  if (!purchase && product.creator_id !== userId) {
    return json({ error: "Purchase required" }, 403);
  }

  const { data: signed } = await supabase.storage
    .from("commerce-content")
    .createSignedUrl(product.file_path, 300);

  if (!signed) return json({ error: "Failed to generate download URL" }, 500);

  return json({
    downloadUrl: signed.signedUrl,
    title: product.title,
    mimeType: product.mime_type,
    fileSize: product.file_size_bytes,
  });
}

// POST add-product
export async function addProduct(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const storefrontId = body.storefrontId as string;
  const title = body.title as string;
  const description = (body.description as string) ?? null;
  const price = body.price as string;
  const contentType = body.contentType as string;
  const isFundraiser = contentType === "fundraiser";

  if (!storefrontId || !title || !price || !contentType) {
    return json({ error: "Missing required fields" }, 400);
  }

  if (isFundraiser) {
    const metadata = (body.metadata as Record<string, unknown>) ?? {};
    if (!metadata.goal_amount || parseFloat(String(metadata.goal_amount)) <= 0) {
      return json({ error: "Fundraisers require a goal_amount in metadata" }, 400);
    }
  }

  const fileContent = body.fileContent as string;
  const fileName = body.fileName as string;

  if (!isFundraiser && (!fileContent || !fileName)) {
    return json({ error: "Missing required fields" }, 400);
  }

  let mimeType = (body.mimeType as string) ?? "application/octet-stream";
  if (mimeType === "application/octet-stream" && fileName) {
    const extMatch = fileName.match(/\.([^.]+)$/);
    if (extMatch) {
      const extMimes: Record<string, string> = {
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        pdf: "application/pdf",
        mp4: "video/mp4",
        webm: "video/webm",
      };
      mimeType = extMimes[extMatch[1].toLowerCase()] ?? mimeType;
    }
  }

  const { data: storefront } = await supabase
    .from("storefronts")
    .select("id")
    .eq("id", storefrontId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!storefront) return json({ error: "Storefront not found or not yours" }, 404);

  let filePath: string | null = null;
  let fileSizeBytes: number | null = null;
  let previewPath: string | null = null;

  if (!isFundraiser) {
    const fileBytes = Uint8Array.from(atob(fileContent), (c) => c.charCodeAt(0));
    const safeFileName = fileName.replace(/\s+/g, "_");
    filePath = `${user.id}/${crypto.randomUUID()}/${safeFileName}`;
    fileSizeBytes = fileBytes.length;

    const { error: uploadErr } = await supabase.storage
      .from("commerce-content")
      .upload(filePath, fileBytes, { contentType: mimeType });

    if (uploadErr) return json({ error: `Upload failed: ${uploadErr.message}` }, 500);

    const isImage = mimeType.startsWith("image/") || contentType === "image";
    if (isImage) {
      previewPath = `${user.id}/${crypto.randomUUID()}/preview_${fileName.replace(/\s+/g, "_")}`;
      await supabase.storage
        .from("commerce-previews")
        .upload(previewPath, fileBytes, { contentType: mimeType });
    }
  }

  const { data: product, error: insertErr } = await supabase
    .from("products")
    .insert({
      storefront_id: storefrontId,
      creator_id: user.id,
      title,
      description,
      price,
      content_type: contentType,
      file_path: filePath,
      file_size_bytes: fileSizeBytes,
      mime_type: isFundraiser ? null : mimeType,
      preview_path: previewPath,
      metadata: body.metadata ?? {},
    })
    .select()
    .single();

  if (insertErr) return json({ error: insertErr.message }, 500);

  const { data: followers } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", user.id);

  if (followers && followers.length > 0) {
    const eventRows = followers.map((f: { follower_id: string }) => ({
      user_id: f.follower_id,
      actor_id: user.id,
      type: "new_product",
      payload: { productId: product.id, title, price, contentType },
    }));
    await supabase.from("events").insert(eventRows);
  }

  return json(product);
}

// POST browse
export async function browse(ctx: PostHandlerCtx): Promise<Response> {
  const { supabase, body } = ctx;
  const filter = body.filter as string | undefined;
  const contentType = body.contentType as string | undefined;

  let query = supabase
    .from("products")
    .select("*, storefronts!inner(name, slug, owner_id)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (filter) query = query.ilike("title", `%${filter}%`);
  if (contentType) query = query.eq("content_type", contentType);

  const { data: products, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const productsWithPreviews = (products ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    preview_url: p.preview_path
      ? publicUrl("commerce-previews", p.preview_path as string)
      : null,
  }));

  return json({ products: productsWithPreviews });
}

// POST my-products
export async function myProducts(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase } = ctx;
  const { data: products, error } = await supabase
    .from("products")
    .select("*, storefronts!inner(name, slug)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ products: products ?? [] });
}

// POST buy
export async function buy(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const productId = body.productId as string;
  if (!productId) return json({ error: "Missing 'productId'" }, 400);

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (!product) return json({ error: "Product not found" }, 404);

  const isFundraiserProduct = product.content_type === "fundraiser";
  let payPrice: string;

  if (isFundraiserProduct) {
    const amount = parseFloat(String(body.amount));
    if (!amount || amount <= 0) return json({ error: "Invalid donation amount" }, 400);
    payPrice = amount.toFixed(2);
  } else {
    payPrice = product.price;
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("product_id", productId)
      .eq("buyer_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingPurchase) {
      return json({ error: "Already purchased", purchaseId: existingPurchase.id }, 409);
    }
  }

  const { data: buyerWallet } = await supabase
    .from("wallets")
    .select("provider_wallet_id, address")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!buyerWallet) return json({ error: "No wallet found" }, 404);

  const { data: sellerWallet } = await supabase
    .from("wallets")
    .select("address")
    .eq("user_id", product.creator_id)
    .maybeSingle();

  if (!sellerWallet) return json({ error: "Seller has no wallet" }, 404);

  let cdp;
  try {
    cdp = await getCdpClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: "cdp_init_failed", error: msg }));
    return json({ error: `Payment service unavailable: ${msg}` }, 502);
  }

  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const decimals = 6;
  const rawAmount = BigInt(Math.floor(parseFloat(payPrice) * 10 ** decimals));
  const selector = "0xa9059cbb";
  const paddedTo = sellerWallet.address.slice(2).toLowerCase().padStart(64, "0");
  const paddedAmount = rawAmount.toString(16).padStart(64, "0");
  const calldata = `${selector}${paddedTo}${paddedAmount}`;

  let txHash;
  try {
    txHash = await cdp.evm.sendTransaction({
      address: buyerWallet.provider_wallet_id as `0x${string}`,
      network: "base-sepolia",
      transaction: {
        to: usdcAddress as `0x${string}`,
        data: calldata as `0x${string}`,
        value: 0n,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({
        event: "cdp_send_tx_failed",
        productId,
        buyerUserId: user.id,
        buyerWalletId: buyerWallet.provider_wallet_id,
        buyerAddress: buyerWallet.address,
        sellerAddress: sellerWallet.address,
        rawAmount: rawAmount.toString(),
        error: msg,
      }),
    );
    return json({ error: `Payment failed: ${msg}` }, 502);
  }

  const txHashStr =
    typeof txHash === "string"
      ? txHash
      : (txHash as any)?.transactionHash ??
        (txHash as any)?.hash ??
        (txHash as any)?.tx_hash ??
        JSON.stringify(txHash);

  const { data: purchase, error: purchaseErr } = await supabase
    .from("purchases")
    .insert({
      product_id: productId,
      buyer_id: user.id,
      seller_id: product.creator_id,
      price_paid: payPrice,
      tx_hash: txHashStr,
    })
    .select()
    .single();

  if (purchaseErr) {
    return json(
      { error: `Purchase recorded but DB error: ${purchaseErr.message}`, txHash: txHashStr },
      500,
    );
  }

  return json({ purchase, txHash: txHashStr });
}

// POST my-purchases
export async function myPurchases(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase } = ctx;
  const { data: purchases, error } = await supabase
    .from("purchases")
    .select("*, products!inner(title, content_type, price, creator_id)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ purchases: purchases ?? [] });
}

// POST unlist
export async function unlist(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const productId = body.productId as string;
  if (!productId) return json({ error: "Missing 'productId'" }, 400);

  const { error } = await supabase
    .from("products")
    .update({ status: "unlisted", updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("creator_id", user.id);

  if (error) return json({ error: error.message }, 500);
  return json({ unlisted: true });
}

// POST delete-product
export async function deleteProduct(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const delProductId = body.productId as string;
  if (!delProductId) return json({ error: "Missing 'productId'" }, 400);

  const { count: purchaseCount } = await supabase
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .eq("product_id", delProductId);

  if (purchaseCount && purchaseCount > 0) {
    return json(
      { error: "Cannot delete a product with existing purchases. Unlist it instead." },
      400,
    );
  }

  const { data: product } = await supabase
    .from("products")
    .select("file_path")
    .eq("id", delProductId)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!product) return json({ error: "Product not found or not owned by you" }, 404);

  if (product.file_path) {
    await supabase.storage.from("products").remove([product.file_path]);
  }

  const { error: delErr } = await supabase
    .from("products")
    .delete()
    .eq("id", delProductId)
    .eq("creator_id", user.id);

  if (delErr) return json({ error: delErr.message }, 500);
  return json({ deleted: true });
}

// POST edit-product
export async function editProduct(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const editProductId = body.productId as string;
  if (!editProductId) return json({ error: "Missing 'productId'" }, 400);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.price) updates.price = body.price;
  if (body.status && ["active", "unlisted"].includes(body.status as string)) {
    updates.status = body.status;
  }

  const { data: editedProduct, error: editErr } = await supabase
    .from("products")
    .update(updates)
    .eq("id", editProductId)
    .eq("creator_id", user.id)
    .select()
    .single();

  if (editErr) return json({ error: editErr.message }, 500);
  if (!editedProduct) return json({ error: "Product not found or not owned by you" }, 404);
  return json(editedProduct);
}
