import { VK_COMMUNITY_CALLBACK_HTML } from "@/lib/vk/community-callback-html";

/** Редirect для старого URI → тот же HTML-обработчик. */
export async function GET() {
  return new Response(VK_COMMUNITY_CALLBACK_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
