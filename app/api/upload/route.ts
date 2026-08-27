import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ success: false, error: "No file provided" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return Response.json(
      { success: false, error: "Only JPEG, PNG, and WEBP images are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ success: false, error: "File must be 2MB or smaller" }, { status: 400 });
  }

  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return Response.json({ success: true, data: { url: `/uploads/products/${filename}` } });
}
