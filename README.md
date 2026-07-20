# AgentMark

Мультиклиентская платформа ИИ-агентов для SMM и маркетинга.

## Запуск

```bash
npm install
npm run dev
```

- http://localhost:3000 — лендинг  
- http://localhost:3000/plan — кабинет проектов  

## Как устроено

1. **Проект = клиент** — свой бриф, план, тексты, каналы  
2. **Маркетолог** — контент-план с корректным временем в таймзоне клиента  
3. **SMM** — тексты через DeepSeek  
4. **Каналы на проект** — Telegram/VK токены хранятся у проекта (`data/store.json`), не в общем `.env`  

## .env

```
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
```

Telegram/VK больше не в `.env` — подключаются в кабинете на вкладке «Каналы».

## Проверка времени

```bash
npx tsx scripts/check-timezone.ts
```
