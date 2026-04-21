import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/api-auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB cap since bytes live in Postgres

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`
    SELECT id, title, category, mime_type, file_name, file_size, content, created_at
    FROM assets
    ORDER BY created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  let title = "";
  let category = "";
  let file: File | null = null;
  let linkUrl = "";
  let textContent = "";

  if (isMultipart) {
    const form = await request.formData();
    const rawTitle = form.get("title");
    const rawCategory = form.get("category");
    title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    category = typeof rawCategory === "string" ? rawCategory.trim() : "";
    const f = form.get("file");
    if (f instanceof File) file = f;
  } else {
    const body = (await request.json()) as {
      title?: string;
      category?: string;
      url?: string;
      text?: string;
    };
    title = (body.title ?? "").trim();
    category = (body.category ?? "").trim();
    linkUrl = (body.url ?? "").trim();
    textContent = body.text ?? "";
  }

  if (!title) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json(
      { message: "Category is required" },
      { status: 400 },
    );
  }

  const sql = getDb();

  if (category === "Images" || category === "Documents") {
    if (!file) {
      return NextResponse.json(
        { message: "File is required" },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ message: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          message: `File exceeds ${String(MAX_FILE_SIZE / 1024 / 1024)}MB limit`,
        },
        { status: 413 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const rows = await sql`
      INSERT INTO assets (title, category, mime_type, file_name, file_size, data, uploaded_by)
      VALUES (
        ${title},
        ${category},
        ${file.type || "application/octet-stream"},
        ${file.name},
        ${file.size},
        ${bytes},
        ${Number(auth.userId)}
      )
      RETURNING id, title, category, mime_type, file_name, file_size, content, created_at
    `;
    return NextResponse.json(rows[0], { status: 201 });
  }

  if (category === "Links") {
    if (!linkUrl) {
      return NextResponse.json(
        { message: "URL is required" },
        { status: 400 },
      );
    }
    const rows = await sql`
      INSERT INTO assets (title, category, content, uploaded_by)
      VALUES (${title}, ${category}, ${linkUrl}, ${Number(auth.userId)})
      RETURNING id, title, category, mime_type, file_name, file_size, content, created_at
    `;
    return NextResponse.json(rows[0], { status: 201 });
  }

  if (category === "Text Content") {
    if (!textContent.trim()) {
      return NextResponse.json(
        { message: "Text content is required" },
        { status: 400 },
      );
    }
    const rows = await sql`
      INSERT INTO assets (title, category, content, uploaded_by)
      VALUES (${title}, ${category}, ${textContent}, ${Number(auth.userId)})
      RETURNING id, title, category, mime_type, file_name, file_size, content, created_at
    `;
    return NextResponse.json(rows[0], { status: 201 });
  }

  return NextResponse.json(
    { message: "Unsupported category" },
    { status: 400 },
  );
}
