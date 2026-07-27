import { deepseekChat, isDeepSeekConfigured } from "@/lib/ai/client";
import type { BrandBrief } from "@/lib/marketer/types";
import type { FaqItem } from "@/lib/bots/types";
import { plainSocialText } from "@/lib/text/plain-social";

const SYSTEM = `Ты SMM-ассистент бренда. Отвечаешь на комментарии под постами кратко и по делу.
Правила:
- 1–3 коротких предложения, язык как у комментария (или язык бренда)
- Тон из брифа, без воды и канцелярита
- Не выдумывай цены, акции, сроки — только факты из брифа/FAQ
- Не обещай то, чего нет в данных
- Можно мягко предложить написать в ЛС / перейти на сайт, если сайт есть в брифе
- Без markdown: ссылки только голым URL (https://...), не [текст](url)
- Без хештегов
- Ответь ТОЛЬКО текстом ответа, без кавычек и пояснений`;

export async function generateAiCommentReply(input: {
  brief: BrandBrief;
  comment: string;
  postText?: string;
  faq: FaqItem[];
}): Promise<string> {
  if (!isDeepSeekConfigured()) {
    throw new Error("DeepSeek не настроен — включите FAQ или задайте DEEPSEEK_API_KEY");
  }

  const faqBlock = (input.faq ?? [])
    .slice(0, 20)
    .map((f, i) => `${i + 1}. Q: ${f.q}\n   A: ${f.a}`)
    .join("\n");

  const user = JSON.stringify({
    brand: {
      name: input.brief.brandName,
      niche: input.brief.niche,
      offer: input.brief.offer,
      tone: input.brief.toneOfVoice,
      websiteUrl: input.brief.websiteUrl || "",
      language: input.brief.language,
      taboos: input.brief.taboos ?? [],
    },
    postText: input.postText?.slice(0, 800) || "",
    faq: faqBlock || null,
    comment: input.comment.slice(0, 600),
  });

  const text = await deepseekChat({
    system: SYSTEM,
    user,
    temperature: 0.55,
  });

  return plainSocialText(text).slice(0, 900);
}
