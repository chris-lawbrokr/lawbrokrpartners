import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/api-auth";

// GET: Download the file bytes. ?thumb=1 is a hint but currently returns the
// same bytes — small enough that client-side sizing is fine.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const sql = getDb();
  const rows = await sql`
    SELECT mime_type, file_name, data
    FROM assets WHERE id = ${id}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const row = rows[0] as {
    mime_type: string;
    file_name: string;
    data: Buffer | Uint8Array | null;
  };
  if (!row.data) {
    return NextResponse.json(
      { message: "Asset has no downloadable file" },
      { status: 404 },
    );
  }
  const bytes =
    row.data instanceof Buffer ? row.data : Buffer.from(row.data);

  const disposition = new URL(request.url).searchParams.get("download")
    ? "attachment"
    : "inline";

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": row.mime_type || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${row.file_name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const sql = getDb();

  const rows = await sql`SELECT id FROM assets WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  await sql`DELETE FROM assets WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
