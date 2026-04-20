// Supabase edge-function code uses 2-space indentation (Deno convention).
import { unzipSync } from "https://esm.sh/fflate@0.8.2";
import {
  json,
  hmacSign,
  hmacVerify,
  slugify,
  decodeJwtPayload,
  escapeHtml,
  corsHeaders,
} from "../../_shared/utils.ts";
import type { GetHandlerCtx, PostHandlerCtx } from "../../_shared/types.ts";
import { svcSupabase } from "../../_shared/supabase.ts";

const APP_MIME_MAP: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wasm": "application/wasm",
  ".map": "application/json",
  ".txt": "text/plain",
};

function mimeFromPath(path: string): string {
  const dot = path.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  return APP_MIME_MAP[path.slice(dot).toLowerCase()] ?? "application/octet-stream";
}

// GET /commerce/app/:productId/*
export async function handleAppServing(ctx: GetHandlerCtx): Promise<Response> {
  const productId = ctx.resourceId;
  const supabase = svcSupabase;

  const { data: product } = await supabase
    .from("products")
    .select("*, storefronts!inner(name, slug, owner_id)")
    .eq("id", productId)
    .eq("content_type", "app")
    .eq("status", "active")
    .maybeSingle();

  if (!product) return json({ error: "App not found" }, 404);

  const cookieName = `app_token_${productId}`;
  const cookies = Object.fromEntries(
    (ctx.req.headers.get("cookie") ?? "").split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const tokenCookie = cookies[cookieName];
  const serverSecret =
    Deno.env.get("APP_TOKEN_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  let hasAccess = false;

  if (tokenCookie) {
    // Token format (emitted by grantAppToken): `<base64(payload)>.<hmac>`
    // where payload is JSON `{ pid, uid, exp }`.
    const [payloadB64, hmac] = tokenCookie.split(".");
    if (payloadB64 && hmac) {
      try {
        const valid = await hmacVerify(payloadB64, hmac, serverSecret);
        if (valid) {
          const payload = JSON.parse(atob(payloadB64)) as {
            pid?: string;
            uid?: string;
            exp?: number;
          };
          if (
            payload.pid === productId &&
            typeof payload.exp === "number" &&
            payload.exp > Date.now() / 1000
          ) {
            hasAccess = true;
          }
        }
      } catch {
        /* malformed token, fall through to paywall */
      }
    }
  }

  if (!hasAccess) {
    const userToken = ctx.req.headers.get("x-user-token");
    if (userToken) {
      try {
        const payload = decodeJwtPayload(userToken);
        const userId = payload.sub as string;
        const { data: purchase } = await supabase
          .from("purchases")
          .select("id")
          .eq("product_id", productId)
          .eq("buyer_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (purchase || product.creator_id === userId) {
          hasAccess = true;
        }
      } catch {
        /* invalid token, fall through to paywall */
      }
    }
  }

  if (!hasAccess && parseFloat(product.price) === 0) {
    hasAccess = true;
  }

  if (!hasAccess) {
    const displayName = (product as any).storefronts?.name ?? "Store";
    const { data: sellerWallet } = await supabase
      .from("wallets")
      .select("address")
      .eq("user_id", product.creator_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const safeTitle = escapeHtml(String(product.title ?? ""));
    const safeCreator = escapeHtml(String(displayName));
    const safeDesc = product.description ? escapeHtml(String(product.description)) : "";
    const safePrice = escapeHtml(String(product.price ?? "0"));
    const safeProductId = escapeHtml(String(productId));

    const paywallHtml = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle} — Pay to Access</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e5e5e5;min-height:100vh;display:flex;align-items:center;justify-content:center}
.paywall{max-width:420px;width:90%;text-align:center;padding:48px 32px;background:#141414;border-radius:20px;border:1px solid #2a2a2a}
.paywall h1{font-size:24px;margin-bottom:8px}
.paywall .creator{color:#a3a3a3;margin-bottom:24px;font-size:14px}
.paywall .desc{color:#d4d4d4;margin-bottom:32px;font-size:15px;line-height:1.5}
.paywall .price{font-size:40px;font-weight:800;color:#10b981;margin-bottom:8px}
.paywall .currency{color:#a3a3a3;font-size:14px;margin-bottom:32px}
.paywall .btn{display:inline-block;padding:14px 40px;background:#10b981;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;text-decoration:none}
.paywall .btn:hover{background:#059669}
.paywall .footer{margin-top:32px;color:#525252;font-size:12px}
</style></head><body>
<div class="paywall">
<h1>${safeTitle}</h1>
<div class="creator">by ${safeCreator}</div>
${safeDesc ? `<div class="desc">${safeDesc}</div>` : ""}
<div class="price">${safePrice} USDC</div>
<div class="currency">on Base</div>
<p class="footer">Purchase via CLI: juice store buy ${safeProductId}</p>
</div>
</body></html>`;

    return new Response(paywallHtml, {
      status: 402,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "X-X402-Version": "1",
        "X-X402-PayTo": sellerWallet?.address ?? "",
        "X-X402-Amount": String(Math.floor(parseFloat(product.price) * 1e6)),
        "X-X402-Network": "base-sepolia",
        "X-X402-Asset": "USDC",
      },
    });
  }

  const actionIdx = ctx.segments.indexOf("commerce");
  const remainingPath = ctx.segments.slice(actionIdx + 3).join("/");
  const filePath = remainingPath || product.entry_point || "index.html";

  if (filePath.includes("..") || filePath.startsWith("/")) {
    return json({ error: "Invalid path" }, 400);
  }

  const storagePath = `${product.creator_id}/${productId}/${filePath}`;
  const contentType = mimeFromPath(filePath);
  const isHtml = contentType === "text/html";

  if (isHtml) {
    const { data: signed } = await supabase.storage
      .from("commerce-apps")
      .createSignedUrl(storagePath, 60);
    if (!signed?.signedUrl) return json({ error: "File not found" }, 404);

    const fileRes = await fetch(signed.signedUrl);
    if (!fileRes.ok) return json({ error: "File not found" }, 404);
    let html = await fileRes.text();

    const manifest: Array<{ path: string }> = (product.metadata as any)?.files ?? [];
    const entryDir = filePath.includes("/")
      ? filePath.slice(0, filePath.lastIndexOf("/") + 1)
      : "";
    const signedMap = new Map<string, string>();

    await Promise.all(
      manifest.map(async (f) => {
        const sp = `${product.creator_id}/${productId}/${f.path}`;
        const { data } = await supabase.storage
          .from("commerce-apps")
          .createSignedUrl(sp, 3600);
        if (data?.signedUrl) {
          signedMap.set(f.path, data.signedUrl);
          if (entryDir && f.path.startsWith(entryDir)) {
            signedMap.set(f.path.slice(entryDir.length), data.signedUrl);
          }
        }
      }),
    );

    html = html.replace(
      /(href|src)="(?!https?:\/\/|data:|\/\/|#)([^"]+)"/g,
      (_match: string, attr: string, path: string) => {
        const url = signedMap.get(path);
        return url ? `${attr}="${url}"` : _match;
      },
    );

    return json({ html, title: product.title });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("commerce-apps")
    .createSignedUrl(storagePath, 300);

  if (signErr || !signed?.signedUrl) return json({ error: "File not found" }, 404);
  return Response.redirect(signed.signedUrl, 302);
}

// POST add-app
export async function addApp(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const storefrontId = body.storefrontId as string;
  const title = body.title as string;
  const description = (body.description as string) ?? null;
  const price = body.price as string;
  const entryPoint = (body.entryPoint as string) ?? "index.html";
  const fileContent = body.fileContent as string;

  if (!storefrontId || !title || !price || !fileContent) {
    return json({ error: "Missing required fields" }, 400);
  }

  const { data: appStorefront } = await supabase
    .from("storefronts")
    .select("id")
    .eq("id", storefrontId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!appStorefront) return json({ error: "Storefront not found or not yours" }, 404);

  const zipBytes = Uint8Array.from(atob(fileContent), (c) => c.charCodeAt(0));

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zipBytes);
  } catch (e) {
    return json({ error: `Invalid zip file: ${(e as Error).message}` }, 400);
  }

  const fileEntries = Object.entries(files);
  if (fileEntries.length === 0) return json({ error: "Zip file is empty" }, 400);
  if (fileEntries.length > 500) {
    return json({ error: `Too many files (${fileEntries.length}). Maximum 500.` }, 400);
  }

  let totalSize = 0;
  const MAX_UNCOMPRESSED = 50 * 1024 * 1024;
  const fileManifest: Array<{ path: string; size: number; mime: string }> = [];

  for (const [path, data] of fileEntries) {
    if (path.includes("..") || path.startsWith("/") || path.startsWith("\\")) {
      return json({ error: `Invalid file path in zip: ${path}` }, 400);
    }
    if (path.endsWith("/")) continue;

    totalSize += data.length;
    if (totalSize > MAX_UNCOMPRESSED) {
      return json({ error: "Uncompressed size exceeds 50MB limit" }, 400);
    }
    fileManifest.push({ path, size: data.length, mime: mimeFromPath(path) });
  }

  const entryExists = fileManifest.some((f) => f.path === entryPoint);
  if (!entryExists) {
    return json({ error: `Entry point '${entryPoint}' not found in zip` }, 400);
  }

  let productSlug = slugify(title);
  const { data: existingSlug } = await supabase
    .from("products")
    .select("id")
    .eq("slug", productSlug)
    .maybeSingle();
  if (existingSlug) {
    productSlug = `${productSlug}-${crypto.randomUUID().slice(0, 6)}`;
  }

  const productId = crypto.randomUUID();
  const r2BasePath = `apps/${productSlug}/v1`;
  const workerUrl = Deno.env.get("WORKER_URL") ?? "https://superlinks.me";
  const r2UploadSecret = Deno.env.get("R2_UPLOAD_SECRET")!;

  const uploadErrors: string[] = [];
  for (const [path, data] of fileEntries) {
    if (path.endsWith("/")) continue;
    const r2Key = `${r2BasePath}/${path}`;
    try {
      const res = await fetch(`${workerUrl}/api/r2-upload`, {
        method: "PUT",
        body: data,
        headers: {
          "Content-Type": mimeFromPath(path),
          "x-r2-key": r2Key,
          "x-upload-secret": r2UploadSecret,
        },
      });
      if (!res.ok) uploadErrors.push(`${path}: ${res.status}`);
    } catch (e) {
      uploadErrors.push(`${path}: ${(e as Error).message}`);
    }
  }

  if (uploadErrors.length > 0) {
    return json(
      { error: `R2 upload failed for: ${uploadErrors.slice(0, 3).join(", ")}` },
      500,
    );
  }

  const { data: appProduct, error: insertErr } = await supabase
    .from("products")
    .insert({
      id: productId,
      storefront_id: storefrontId,
      creator_id: user.id,
      title,
      description,
      price,
      slug: productSlug,
      content_type: "app",
      file_path: r2BasePath,
      file_size_bytes: totalSize,
      mime_type: "application/zip",
      entry_point: entryPoint,
      metadata: { files: fileManifest },
    })
    .select()
    .single();

  if (insertErr) return json({ error: insertErr.message }, 500);

  const { data: deployment, error: deployErr } = await supabase
    .from("app_deployments")
    .insert({
      product_id: productId,
      version: 1,
      r2_base_path: r2BasePath,
      entry_point: entryPoint,
      file_count: fileManifest.length,
      total_size_bytes: totalSize,
      file_manifest: fileManifest,
    })
    .select()
    .single();

  if (deployErr) return json({ error: deployErr.message }, 500);

  await supabase
    .from("products")
    .update({ current_deployment_id: deployment.id })
    .eq("id", productId);

  const { data: appFollowers } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", user.id);

  if (appFollowers && appFollowers.length > 0) {
    const eventRows = appFollowers.map((f: { follower_id: string }) => ({
      user_id: f.follower_id,
      actor_id: user.id,
      type: "new_product",
      payload: { productId, title, price, contentType: "app" },
    }));
    await supabase.from("events").insert(eventRows);
  }

  const appUrl = `https://superlinks.me/app/${productSlug}/`;
  return json({ ...appProduct, app_url: appUrl });
}

// POST update-app
export async function updateApp(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const updateProductId = body.productId as string;
  const updateFileContent = body.fileContent as string;
  const updateEntryPoint = (body.entryPoint as string) ?? undefined;

  if (!updateProductId || !updateFileContent) {
    return json({ error: "Missing productId or fileContent" }, 400);
  }

  const { data: existingProduct } = await supabase
    .from("products")
    .select("id, slug, title, creator_id, entry_point, current_deployment_id")
    .eq("id", updateProductId)
    .eq("creator_id", user.id)
    .eq("content_type", "app")
    .maybeSingle();

  if (!existingProduct) return json({ error: "App product not found or not yours" }, 404);

  if (!existingProduct.slug) {
    let genSlug = slugify(existingProduct.title);
    const { data: slugConflict } = await supabase
      .from("products")
      .select("id")
      .eq("slug", genSlug)
      .maybeSingle();
    if (slugConflict) {
      genSlug = `${genSlug}-${crypto.randomUUID().slice(0, 6)}`;
    }
    await supabase.from("products").update({ slug: genSlug }).eq("id", updateProductId);
    existingProduct.slug = genSlug;
  }

  let nextVersion = 1;
  if (existingProduct.current_deployment_id) {
    const { data: currentDeploy } = await supabase
      .from("app_deployments")
      .select("version")
      .eq("id", existingProduct.current_deployment_id)
      .maybeSingle();
    if (currentDeploy) nextVersion = currentDeploy.version + 1;
  }

  const entryPt = updateEntryPoint ?? existingProduct.entry_point ?? "index.html";
  const updateZipBytes = Uint8Array.from(atob(updateFileContent), (c) => c.charCodeAt(0));

  let updateFiles: Record<string, Uint8Array>;
  try {
    updateFiles = unzipSync(updateZipBytes);
  } catch (e) {
    return json({ error: `Invalid zip file: ${(e as Error).message}` }, 400);
  }

  const updateEntries = Object.entries(updateFiles);
  if (updateEntries.length === 0) return json({ error: "Zip file is empty" }, 400);
  if (updateEntries.length > 500) {
    return json({ error: `Too many files (${updateEntries.length}). Maximum 500.` }, 400);
  }

  let updateTotalSize = 0;
  const UPDATE_MAX = 50 * 1024 * 1024;
  const updateManifest: Array<{ path: string; size: number; mime: string }> = [];

  for (const [path, data] of updateEntries) {
    if (path.includes("..") || path.startsWith("/") || path.startsWith("\\")) {
      return json({ error: `Invalid file path in zip: ${path}` }, 400);
    }
    if (path.endsWith("/")) continue;
    updateTotalSize += data.length;
    if (updateTotalSize > UPDATE_MAX) return json({ error: "Uncompressed size exceeds 50MB limit" }, 400);
    updateManifest.push({ path, size: data.length, mime: mimeFromPath(path) });
  }

  const updateEntryExists = updateManifest.some((f) => f.path === entryPt);
  if (!updateEntryExists) {
    return json({ error: `Entry point '${entryPt}' not found in zip` }, 400);
  }

  const updateR2BasePath = `apps/${existingProduct.slug}/v${nextVersion}`;
  const updateWorkerUrl = Deno.env.get("WORKER_URL") ?? "https://superlinks.me";
  const updateR2Secret = Deno.env.get("R2_UPLOAD_SECRET")!;

  const updateUploadErrors: string[] = [];
  for (const [path, data] of updateEntries) {
    if (path.endsWith("/")) continue;
    const r2Key = `${updateR2BasePath}/${path}`;
    try {
      const res = await fetch(`${updateWorkerUrl}/api/r2-upload`, {
        method: "PUT",
        body: data,
        headers: {
          "Content-Type": mimeFromPath(path),
          "x-r2-key": r2Key,
          "x-upload-secret": updateR2Secret,
        },
      });
      if (!res.ok) updateUploadErrors.push(`${path}: ${res.status}`);
    } catch (e) {
      updateUploadErrors.push(`${path}: ${(e as Error).message}`);
    }
  }

  if (updateUploadErrors.length > 0) {
    return json(
      { error: `R2 upload failed for: ${updateUploadErrors.slice(0, 3).join(", ")}` },
      500,
    );
  }

  if (existingProduct.current_deployment_id) {
    await supabase
      .from("app_deployments")
      .update({ status: "superseded" })
      .eq("id", existingProduct.current_deployment_id);
  }

  const { data: newDeploy, error: newDeployErr } = await supabase
    .from("app_deployments")
    .insert({
      product_id: updateProductId,
      version: nextVersion,
      r2_base_path: updateR2BasePath,
      entry_point: entryPt,
      file_count: updateManifest.length,
      total_size_bytes: updateTotalSize,
      file_manifest: updateManifest,
    })
    .select()
    .single();

  if (newDeployErr) return json({ error: newDeployErr.message }, 500);

  await supabase
    .from("products")
    .update({
      current_deployment_id: newDeploy.id,
      file_path: updateR2BasePath,
      file_size_bytes: updateTotalSize,
      entry_point: entryPt,
      metadata: { files: updateManifest },
    })
    .eq("id", updateProductId);

  const updateAppUrl = `https://superlinks.me/app/${existingProduct.slug}/`;
  return json({ product_id: updateProductId, version: nextVersion, app_url: updateAppUrl });
}

// POST grant-app-token
export async function grantAppToken(ctx: PostHandlerCtx): Promise<Response> {
  const { user, supabase, body } = ctx;
  const grantProductId = body.productId as string;
  if (!grantProductId) return json({ error: "Missing productId" }, 400);

  const { data: grantProduct } = await supabase
    .from("products")
    .select("id, slug, creator_id, price")
    .eq("id", grantProductId)
    .eq("content_type", "app")
    .maybeSingle();

  if (!grantProduct) return json({ error: "App product not found" }, 404);

  let grantAccess = false;
  if (grantProduct.creator_id === user.id) {
    grantAccess = true;
  } else if (parseFloat(grantProduct.price) === 0) {
    grantAccess = true;
  } else {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("product_id", grantProductId)
      .eq("buyer_id", user.id)
      .limit(1)
      .maybeSingle();
    if (purchase) grantAccess = true;
  }

  if (!grantAccess) return json({ error: "Purchase required" }, 402);

  const serverSecret =
    Deno.env.get("APP_TOKEN_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const payload = JSON.stringify({ pid: grantProductId, uid: user.id, exp: expiry });
  const payloadB64 = btoa(payload);
  const sig = await hmacSign(payloadB64, serverSecret);
  const token = `${payloadB64}.${sig}`;

  const appUrl = `https://superlinks.me/app/${grantProduct.slug}/`;
  const tokenUrl = `https://superlinks.me/app/${grantProduct.slug}/.auth/token?t=${encodeURIComponent(token)}&redirect=${encodeURIComponent(appUrl)}`;

  return json({ token_url: tokenUrl, app_url: appUrl });
}
