import type { PostGoal, RubricId } from "./types";

export interface TopicIdea {
  rubric: RubricId;
  goal: PostGoal;
  topic: string;
  angle: string;
  hook: string;
  format: "text" | "text_image" | "poll" | "carousel" | "short_video";
  whyInteresting: string;
}

const CASINO_TOPICS: TopicIdea[] = [
  {
    rubric: "brand_atmosphere",
    goal: "awareness",
    topic: "Атмосфера бренда: почему канал стоит читать не только ради бонусов",
    angle: "Премиальный вайб без токсичного хайпа",
    hook: "Казино-канал может быть или спамом, или местом с характером. Мы выбираем второе.",
    format: "text_image",
    whyInteresting: "Люди устали от однотипных «забери бонус» — характер выделяет бренд",
  },
  {
    rubric: "game_spotlight",
    goal: "education",
    topic: "Обзор механики одной игры недели (без обещаний выигрыша)",
    angle: "Как устроен слот/live-стол: символы, раунды, темп",
    hook: "Разберём игру недели: что происходит на экране и зачем это знать до ставки.",
    format: "text_image",
    whyInteresting: "Польза > реклама: снижает тревогу новичка и повышает доверие",
  },
  {
    rubric: "promo_factual",
    goal: "offer",
    topic: "Промо недели — только подтверждённые условия",
    angle: "Факты: срок, лимиты, что нужно сделать",
    hook: "Коротко и по делу: что действует на этой неделе и до какого числа.",
    format: "text_image",
    whyInteresting: "Чёткость условий повышает клики и снижает негатив в комментариях",
  },
  {
    rubric: "education",
    goal: "trust",
    topic: "Мини-ликбез: банкролл и лимиты для себя",
    angle: "Ответственная игра как экспертность бренда",
    hook: "3 правила, которые спасают настроение чаще, чем «сигналы» из чатов.",
    format: "text",
    whyInteresting: "Редкость в нише = доверие и удержание аудитории",
  },
  {
    rubric: "community_hook",
    goal: "engagement",
    topic: "Опрос: какая механика нравится больше",
    angle: "Выбор аудитории → следующий контент",
    hook: "Голосуем: слоты на скорость или live с дилером? Пишите почему.",
    format: "poll",
    whyInteresting: "Низкий порог участия → комментарии → больше видимости",
  },
  {
    rubric: "social_proof",
    goal: "trust",
    topic: "Вайб коммьюнити / турнира (только реальные события)",
    angle: "Живой соцдок без фейковых скринов",
    hook: "Что интересного происходило у коммьюнити на этой неделе.",
    format: "text_image",
    whyInteresting: "Социальное доказательство сильнее лозунгов",
  },
  {
    rubric: "responsible_play",
    goal: "trust",
    topic: "Напоминание 18+ и ответственная игра",
    angle: "Коротко, без морализаторства",
    hook: "Игра — досуг. Если перестаёт быть им, пауза важнее любой акции.",
    format: "text",
    whyInteresting: "Снижает риск жалоб и показывает зрелость бренда",
  },
  {
    rubric: "behind_scenes",
    goal: "awareness",
    topic: "Закулисье канала или анонс турнира глазами команды",
    angle: "Человечность бренда",
    hook: "За кулисами: как выбираем темы, чтобы не быть очередным спамом.",
    format: "text_image",
    whyInteresting: "Закулисье вызывает любопытство и удерживает подписчиков",
  },
  {
    rubric: "trend_react",
    goal: "engagement",
    topic: "Реакция на тренд недели в развлечениях/играх",
    angle: "Актуальный пост в Tone of Voice",
    hook: "Все обсуждают X — вот наш взгляд без воды.",
    format: "text",
    whyInteresting: "Актуальность поднимает репосты и ответы",
  },
  {
    rubric: "faq_support",
    goal: "trust",
    topic: "FAQ: частый вопрос новичков",
    angle: "Снять трение до первой сессии",
    hook: "Самый частый вопрос в поддержку — отвечаем публично.",
    format: "text",
    whyInteresting: "Экономит поддержку и повышает ощущение заботы",
  },
  {
    rubric: "game_spotlight",
    goal: "awareness",
    topic: "Live vs slots: кому что заходит",
    angle: "Сравнение форматов без давления «играй сейчас»",
    hook: "Не «что лучше», а «что подходит под настроение сегодня».",
    format: "carousel",
    whyInteresting: "Выбор без давления = выше вовлечённость",
  },
  {
    rubric: "community_hook",
    goal: "community",
    topic: "Вечерний вопрос коммьюнити",
    angle: "Лёгкий хук на комменты",
    hook: "Один вопрос — и лента оживёт: ваш ритуал перед игрой?",
    format: "text",
    whyInteresting: "Вечер — пик присутствия; вопрос даёт максимум ответов",
  },
  {
    rubric: "promo_factual",
    goal: "offer",
    topic: "Напоминание о дедлайне акции (только если есть факт)",
    angle: "Срочность без манипуляций",
    hook: "До конца условия осталось немного — сверяем детали ещё раз.",
    format: "text_image",
    whyInteresting: "Мягкий дедлайн конвертирует тёплую аудиторию",
  },
  {
    rubric: "education",
    goal: "education",
    topic: "Словарь новичка: 5 терминов",
    angle: "Образовательный контент = сохранёнки",
    hook: "Волатильность, фриспины, live — коротко человеческим языком.",
    format: "text_image",
    whyInteresting: "Сохраняют и пересылают — органка без жёсткого оффера",
  },
];

const GENERIC_TOPICS: TopicIdea[] = [
  {
    rubric: "brand_atmosphere",
    goal: "awareness",
    topic: "Кто мы и какую пользу даём в канале",
    angle: "Позиционирование",
    hook: "Если подписались недавно — вот зачем этот канал существует.",
    format: "text_image",
    whyInteresting: "Ясность оффера канала повышает удержание",
  },
  {
    rubric: "education",
    goal: "education",
    topic: "Полезный разбор боли аудитории",
    angle: "Экспертность",
    hook: "Разбираем частую ошибку и как сделать проще.",
    format: "text_image",
    whyInteresting: "Польза = доверие и сохранения",
  },
  {
    rubric: "community_hook",
    goal: "engagement",
    topic: "Вопрос / опрос аудитории",
    angle: "Диалог",
    hook: "Нужен ваш голос — один вопрос на 10 секунд.",
    format: "poll",
    whyInteresting: "Вовлечение кормит охваты",
  },
  {
    rubric: "promo_factual",
    goal: "offer",
    topic: "Оффер / акция с фактами",
    angle: "Конверсия",
    hook: "Коротко: что, для кого, до когда.",
    format: "text_image",
    whyInteresting: "Прямой оффер на тёплой аудитории",
  },
  {
    rubric: "behind_scenes",
    goal: "awareness",
    topic: "Закулисье продукта или команды",
    angle: "Человечность",
    hook: "Показываем процесс, а не только результат.",
    format: "text_image",
    whyInteresting: "Людям интересны люди и процесс",
  },
  {
    rubric: "faq_support",
    goal: "trust",
    topic: "Ответ на частый вопрос",
    angle: "Снятие возражений",
    hook: "Вы часто спрашиваете — отвечаем здесь.",
    format: "text",
    whyInteresting: "Снижает барьер действия",
  },
  {
    rubric: "trend_react",
    goal: "engagement",
    topic: "Реакция на актуальный инфоповод в нише",
    angle: "Свежесть",
    hook: "Короткий взгляд на то, что сейчас обсуждают.",
    format: "text",
    whyInteresting: "Актуальность поднимает шеры",
  },
  {
    rubric: "social_proof",
    goal: "trust",
    topic: "Кейс / отзыв / результат (только реальный)",
    angle: "Доказательство",
    hook: "Живой пример, без приукрашивания.",
    format: "text_image",
    whyInteresting: "Соцдок сильнее обещаний",
  },
];

export function topicsForNiche(niche: string): TopicIdea[] {
  const n = niche.toLowerCase();
  if (
    n.includes("casino") ||
    n.includes("казино") ||
    n.includes("igaming") ||
    n.includes("gambling")
  ) {
    return CASINO_TOPICS;
  }
  return GENERIC_TOPICS;
}

/** Target mix so feed stays interesting (not only offers). */
export const DEFAULT_GOAL_WEIGHTS: Record<PostGoal, number> = {
  engagement: 0.25,
  education: 0.2,
  trust: 0.2,
  awareness: 0.15,
  offer: 0.15,
  community: 0.05,
};
