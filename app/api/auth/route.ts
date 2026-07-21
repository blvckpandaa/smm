import { cookies } from "next/headers";
import {
  clearSessionCookieOptions,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getSession } from "@/lib/auth/request";
import { getUserById, loginUser, registerUser } from "@/lib/store/projects";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ user: null });
  }
  const user = getUserById(session.userId);
  return Response.json({
    user: user || {
      id: session.userId,
      email: session.email,
      name: session.name,
      balanceRub: 0,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: "register" | "login" | "logout";
      email?: string;
      password?: string;
      name?: string;
    };

    if (body.action === "logout") {
      const jar = await cookies();
      const opts = clearSessionCookieOptions();
      jar.set(opts.name, opts.value, opts);
      return Response.json({ ok: true });
    }

    if (body.action === "register") {
      const result = registerUser({
        email: body.email || "",
        password: body.password || "",
        name: body.name || "",
      });
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 });
      }
      const token = createSessionToken({
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
      });
      const jar = await cookies();
      const opts = sessionCookieOptions(token);
      jar.set(opts.name, opts.value, opts);
      return Response.json({ user: result.user }, { status: 201 });
    }

    if (body.action === "login") {
      const result = loginUser({
        email: body.email || "",
        password: body.password || "",
      });
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 });
      }
      const token = createSessionToken({
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
      });
      const jar = await cookies();
      const opts = sessionCookieOptions(token);
      jar.set(opts.name, opts.value, opts);
      return Response.json({ user: result.user });
    }

    return Response.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
