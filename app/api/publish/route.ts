/** Legacy — use /api/projects/:id/publish */
export async function GET() {
  return Response.json({
    deprecated: true,
    message: "Используйте /api/projects/:id/publish",
  });
}

export async function POST() {
  return Response.json(
    {
      error:
        "Глобальная публикация отключена. Подключите канал в проекте.",
    },
    { status: 410 }
  );
}
