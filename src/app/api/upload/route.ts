import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { auth } from "@/auth";
import { compressUnder200KB } from "@/lib/compress-image";
import { getSupabase, SUPABASE_BUCKET, supabaseConfigured } from "@/lib/supabase-storage";

const useCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const original = Buffer.from(await file.arrayBuffer());

  // Compress every uploaded image down to ≤ 200KB before it ever hits storage.
  let compressed;
  try {
    compressed = await compressUnder200KB(original);
  } catch (e) {
    console.error("[upload:compress]", e);
    return NextResponse.json({ error: "Could not process image" }, { status: 400 });
  }
  const { buffer, contentType, ext } = compressed;
  const objectName = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  // ---- Supabase Storage (preferred when configured) ----------------------
  if (supabaseConfigured) {
    try {
      const sb = getSupabase()!;
      const { error: upErr } = await sb.storage
        .from(SUPABASE_BUCKET)
        .upload(`mzr-parts/${objectName}`, buffer, {
          contentType,
          upsert: false,
          cacheControl: "31536000",
        });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(`mzr-parts/${objectName}`);
      return NextResponse.json({ url: pub.publicUrl, bytes: buffer.length });
    } catch (e) {
      console.error("[upload:supabase]", e);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }

  // ---- Cloudinary (legacy production) ------------------------------------
  if (useCloudinary) {
    try {
      const { cloudinary } = await import("@/lib/cloudinary");
      const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "mzr-parts",
        // We've already compressed; skip Cloudinary's auto transformations.
      });
      return NextResponse.json({ url: result.secure_url, bytes: buffer.length });
    } catch (e) {
      console.error("[upload:cloudinary]", e);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }

  // ---- Local disk (dev fallback) -----------------------------------------
  try {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, objectName), buffer);
    return NextResponse.json({ url: `/uploads/${objectName}`, bytes: buffer.length });
  } catch (e) {
    console.error("[upload:local]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
