import { isMetaConfigured, useMetaStub } from "@/lib/meta/config";

/** Статус Meta: настроены ли ключи и включён ли режим заглушки */
export async function GET() {
  return Response.json({
    configured: isMetaConfigured(),
    stubMode: useMetaStub(),
  });
}
