import { isVkConfigured, useVkStub } from "@/lib/vk/config";

export async function GET() {
  return Response.json({
    configured: isVkConfigured(),
    stubMode: useVkStub(),
  });
}
