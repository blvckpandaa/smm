import { readProjectImage } from "@/lib/media/store";
import { verifyPublicMediaParams } from "@/lib/media/public-url";

/** Публичная раздача фото для Meta (подписанный URL). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("p") || "";
  const filename = url.searchParams.get("f") || "";
  const exp = url.searchParams.get("exp") || "";
  const sig = url.searchParams.get("sig") || "";

  if (
    !verifyPublicMediaParams({ projectId, filename, exp, sig })
  ) {
    return Response.json({ error: "Ссылка недействительна" }, { status: 403 });
  }

  const image = readProjectImage(projectId, filename);
  if (!image) {
    return Response.json({ error: "Файл не найден" }, { status: 404 });
  }

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=600",
    },
  });
}
