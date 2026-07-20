import { requireSession } from "@/lib/auth/request";
import { readProjectImage } from "@/lib/media/store";
import { getProjectForUser } from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string; file: string }> };

/** Отдать сгенерированное фото проекта */
export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { id, file } = await ctx.params;

  const project = getProjectForUser(id, auth.session.userId);
  if (!project) {
    return Response.json({ error: "Проект не найден" }, { status: 404 });
  }

  const image = readProjectImage(id, file);
  if (!image) {
    return Response.json({ error: "Файл не найден" }, { status: 404 });
  }

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
