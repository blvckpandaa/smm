import { requireAdmin } from "@/lib/auth/admin";
import { adminAdjustBalance, getUserById } from "@/lib/store/projects";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as {
      amountRub?: number;
      description?: string;
    };
    const amountRub = Number(body.amountRub);
    if (!Number.isFinite(amountRub) || amountRub === 0) {
      return Response.json(
        { error: "Укажите amountRub (не 0)" },
        { status: 400 }
      );
    }
    if (!getUserById(id)) {
      return Response.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    const result = adminAdjustBalance({
      userId: id,
      amountRub,
      description: body.description,
    });
    if (!result.ok) {
      return Response.json(
        { error: result.error, balanceRub: result.balanceRub },
        { status: 400 }
      );
    }
    return Response.json({
      ok: true,
      balanceRub: result.balanceRub,
      entry: result.entry,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
