/** Legacy — use /api/projects/:id/publish */
export async function GET() {
  return Response.json({ deprecated: true });
}

export async function POST() {
  return Response.json(
    { error: "Используйте /api/projects/:id/publish" },
    { status: 410 }
  );
}
