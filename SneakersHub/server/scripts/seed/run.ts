// Seeds SneakersHub with ~100 curated real Ghanaian-market products.
// Usage (from server/): npx tsx scripts/seed/run.ts
// Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from server/.env (bypasses RLS).
// Images: fetched per-product keyword from Wikimedia Commons, uploaded to the `listings` bucket.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PRODUCTS, type SeedProduct } from "./products.js";

const execFileAsync = promisify(execFile);

dotenv.config();

const DRY_RUN = process.env.SEED_DRY_RUN === "1";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in server/.env");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const SELLERS = [
  { email: "demo.accra.electronics@example.com", name: "Accra Electronics Hub", city: "Accra", region: "Greater Accra", official: true },
  { email: "demo.kumasi.fashion@example.com", name: "Kumasi Fashion House", city: "Kumasi", region: "Ashanti", official: false },
];

const ACCRA_MAINS = new Set(["Phones & Tablets", "Electronics", "Vehicles", "Books, Movies & Music", "Services"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensureSellers(): Promise<{ accraId: string; kumasiId: string }> {
  const { data: users } = await sb.auth.admin.listUsers();
  const idByEmail = new Map(users.users.map((u) => [u.email, u.id]));
  const ids: Record<string, string> = {};
  for (const s of SELLERS) {
    if (!idByEmail.has(s.email)) {
      const { data, error } = await sb.auth.admin.createUser({
        email: s.email,
        password: `demo-${Math.random().toString(36).slice(2, 10)}`,
        email_confirm: true,
        user_metadata: { name: s.name },
      });
      if (error) throw error;
      ids[s.email] = data.user.id;
    } else {
      ids[s.email] = idByEmail.get(s.email)!;
    }
  }
  for (const s of SELLERS) {
    await sb
      .from("profiles")
      .update({
        name: s.name,
        role: "seller",
        is_seller: true,
        verified: true,
        is_official: s.official,
        city: s.city,
        region: s.region,
      })
      .eq("id", ids[s.email]);
  }
  return { accraId: ids[SELLERS[0].email], kumasiId: ids[SELLERS[1].email] };
}

async function clearPreviousSeed(accraId: string, kumasiId: string) {
  const { error: delRows } = await sb
    .from("listings")
    .delete()
    .in("seller_id", [accraId, kumasiId]);
  if (delRows) throw delRows;

  let cursor = undefined as string | undefined;
  let removed = 0;
  while (true) {
    const { data: objects, error } = await sb.storage.from("listings").list("seed", { limit: 100, startAfter: cursor });
    if (error) break;
    if (!objects || objects.length === 0) break;
    const names = objects.map((o) => `seed/${o.name}`);
    const { error: delErr } = await sb.storage.from("listings").remove(names);
    if (delErr) break;
    removed += names.length;
    cursor = objects[objects.length - 1].name;
    if (objects.length < 100) break;
  }
  console.log(`cleared previous seed: rows deleted, ${removed} storage objects removed`);
}

// ── images (Wikimedia Commons) ──────────────────────────────
const WIKI = "https://commons.wikimedia.org/w/api.php";
const poolCache = new Map<string, string[]>();

async function wikiUrlsFor(keyword: string): Promise<string[]> {
  if (!poolCache.has(keyword)) {
    const pool: string[] = [];
    for (let attempt = 0; attempt < 4 && pool.length === 0; attempt++) {
      try {
        const res = await fetch(
          WIKI +
            `?action=query&generator=search&gsrsearch=${encodeURIComponent(keyword)}&gsrnamespace=6&gsrlimit=20` +
            `&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=800&format=json`,
          { headers: { "User-Agent": "sneakershub-seed/1.0 (demo seed; contact: dev@example.com)" } },
        );
        if (!res.ok) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        const j = (await res.json()) as { query?: { pages?: Record<string, { imageinfo?: { url: string; thumburl?: string; mime?: string }[] }> } };
        const pages = j.query?.pages ? Object.values(j.query.pages) : [];
        for (const p of pages) {
          const info = p.imageinfo?.[0];
          if (!info) continue;
          const mime = info.mime ?? "";
          if (!mime.startsWith("image/") || mime.includes("svg") || mime.includes("tiff")) continue;
          const raw = info.thumburl ?? info.url;
          if (!raw) continue;
          pool.push(raw.split("?")[0]);
        }
      } catch {
        await sleep(1500 * (attempt + 1));
      }
    }
    poolCache.set(keyword, pool);
  }
  return poolCache.get(keyword)!;
}

async function downloadImage(u: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const tmp = `/tmp/seedimg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-sS", "-L", "--max-time", "30",
        "-A", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "-o", tmp,
        "-w", "%{http_code} %{content_type} %{size_download}",
        u,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    const [code, ct, size] = stdout.trim().split(" ");
    if (code !== "200" || !ct.startsWith("image/") || Number(size) < 5000) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      return null;
    }
    const buffer = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
    return { buffer, contentType: ct };
  } catch {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    return null;
  }
}

// ── main ───────────────────────────────────────────────────
async function main() {
  console.log(`products to seed: ${PRODUCTS.length}`);
  const { accraId, kumasiId } = DRY_RUN ? { accraId: "", kumasiId: "" } : await ensureSellers();
  console.log("sellers ready:", DRY_RUN ? "dry-run" : "Accra Electronics Hub + Kumasi Fashion House");

  if (DRY_RUN) {
    console.log("DRY RUN — no rows inserted, no images downloaded.");
    const byMain = new Map<string, number>();
    for (const p of PRODUCTS) byMain.set(p.main, (byMain.get(p.main) ?? 0) + 1);
    console.log("distribution:", Object.fromEntries(byMain));
    console.log("sample:");
    PRODUCTS.slice(0, 8).forEach((p) => console.log("  -", p.name, "| GHS", p.price.toLocaleString(), "|", p.main, ">", p.sub, ">", p.sub2));
    return;
  }

  await clearPreviousSeed(accraId, kumasiId);

  // per-product image: pick from the keyword pool, substitute until one downloads
  const urlToStorage = new Map<string, string>(); // source url -> public url
  let noImage = 0;

  const rows = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p: SeedProduct = PRODUCTS[i];
    const pool = await wikiUrlsFor(p.keyword);
    await sleep(150 + Math.random() * 200);

    let imageUrl: string | null = null;
    for (const candidate of pool) {
      if (urlToStorage.has(candidate)) {
        imageUrl = urlToStorage.get(candidate)!;
        break;
      }
      let img = await downloadImage(candidate);
      if (!img) {
        await sleep(1200);
        img = await downloadImage(candidate);
      }
      if (!img) continue;
      const ext = img.contentType.includes("png") ? "png" : "jpg";
      const name = `seed/${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await sb.storage.from("listings").upload(name, img.buffer, {
        contentType: img.contentType,
        upsert: true,
      });
      if (error) continue;
      const publicUrl = `${url}/storage/v1/object/public/listings/${name}`;
      urlToStorage.set(candidate, publicUrl);
      imageUrl = publicUrl;
      break;
    }
    if (!imageUrl) noImage++;

    const sellerId = ACCRA_MAINS.has(p.main) ? accraId : kumasiId;
    rows.push({
      seller_id: sellerId,
      name: p.name,
      brand: p.brand,
      price: p.price,
      category: p.main,
      subcategory: p.sub,
      subcategory2: p.sub2,
      sizes: p.sizes ?? [],
      description: p.desc,
      image_url: imageUrl,
      images: imageUrl ? [imageUrl] : [],
      status: "active",
      boosted: false,
      boost_expires_at: null,
      views: Math.floor(Math.random() * 400),
      city: p.city,
      region: p.region,
      condition: p.condition ?? null,
      negotiable: p.negotiable,
      delivery_available: p.delivery,
      whatsapp: null,
      phone: null,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 3600 * 1000)).toISOString(),
    });
    if ((i + 1) % 20 === 0) console.log(`planned ${i + 1}/${PRODUCTS.length} (images so far: ${urlToStorage.size})`);
  }

  const BATCH = 25;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await sb.from("listings").insert(rows.slice(i, i + BATCH));
    if (error) throw error;
    inserted += Math.min(BATCH, rows.length - i);
    console.log(`inserted ${inserted}/${rows.length}`);
  }
  console.log(`products without image: ${noImage}/${PRODUCTS.length}`);

  // verify
  const { count } = await sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "active");
  const { count: withImg } = await sb
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .not("image_url", "is", null);
  console.log(`\nactive listings: ${count} | with images: ${withImg} (${count ? Math.round((withImg / count) * 100) : 0}%)`);

  const { data: sample } = await sb
    .from("listings")
    .select("name, price, category, subcategory, subcategory2, image_url, profiles(name, verified, is_official)")
    .eq("status", "active")
    .not("image_url", "is", null)
    .limit(8)
    .order("created_at", { ascending: false });
  (sample ?? []).forEach((r) =>
    console.log("  -", r.name, "| GHS", r.price.toLocaleString(), "|", r.category, ">", r.subcategory, ">", r.subcategory2, "| seller:", r.profiles?.[0]?.name ?? r.profiles?.name ?? "?"),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});