import type { BrandBrief, ContentPlan } from "./types";
import { createWeeklyPlan } from "./planner";

export type { BrandBrief, ContentPlan, PlannedPost, Channel } from "./types";
export { createWeeklyPlan, createWeeklyPlanFromTopics } from "./planner";

/** Marketer agent — local planner; AI path goes via /api/plan + DeepSeek. */
export class MarketerAgent {
  constructor(private readonly brief: BrandBrief) {}

  planWeek(): ContentPlan {
    return createWeeklyPlan(this.brief);
  }

  explainStrategy(): string {
    const plan = this.planWeek();
    const lines = [
      `# Стратегия маркетолога — ${plan.brandName}`,
      ``,
      `Период: ${plan.period.from} → ${plan.period.to} (${plan.timezone})`,
      `Всего постов: ${plan.summary.totalPosts}`,
      ``,
      `## Почему так`,
      ...plan.strategyNotes.map((n) => `- ${n}`),
      ``,
      `## Правила публикации`,
      ...plan.postingRules.map((n) => `- ${n}`),
      ``,
      `## Микс`,
      `- По каналам: ${JSON.stringify(plan.summary.byChannel)}`,
      `- По целям: ${JSON.stringify(plan.summary.byGoal)}`,
      `- По рубрикам: ${JSON.stringify(plan.summary.byRubric)}`,
    ];
    return lines.join("\n");
  }
}

export function renderPlanMarkdown(plan: ContentPlan): string {
  const lines: string[] = [
    `# Контент-план: ${plan.brandName}`,
    ``,
    `Ниша: **${plan.niche}** · ${plan.period.from} — ${plan.period.to} · TZ **${plan.timezone}**`,
    ``,
    `Всего: **${plan.summary.totalPosts}** постов`,
    ``,
    `### Стратегия`,
    ...plan.strategyNotes.map((n) => `- ${n}`),
    ``,
    `### Правила`,
    ...plan.postingRules.map((n) => `- ${n}`),
    ``,
    `---`,
    ``,
  ];

  let currentDay = "";
  for (const p of plan.posts) {
    if (p.day !== currentDay) {
      currentDay = p.day;
      lines.push(`## ${p.weekday}, ${p.day}`, ``);
    }
    lines.push(
      `### ${p.timeLocal} · ${p.channel.toUpperCase()} · ${p.goal}`,
      ``,
      `- **Тема:** ${p.topic}`,
      `- **Угол:** ${p.angle}`,
      `- **Хук:** ${p.hook}`,
      `- **Формат:** ${p.format}`,
      `- **Рубрика:** ${p.rubric}`,
      `- **CTA:** ${p.cta}`,
      `- **Почему это время:** ${p.whyThisTime}`,
      `- **Почему зайдёт:** ${p.whyInteresting}`,
      `- **Обязательно:** ${p.mustInclude.join("; ")}`,
      p.mustAvoid.length ? `- **Нельзя:** ${p.mustAvoid.join("; ")}` : "",
      ``
    );
  }

  return lines.filter((l) => l !== undefined).join("\n");
}
