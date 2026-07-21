# SMM-Agents

ИИ-агенты для SMM: план, тексты и публикация в соцсетях.

**Сайт:** https://smm-agents.ru

## Запуск

```bash
npm install
npm run dev
```

Локально:
- http://localhost:3000 — лендинг  
- http://localhost:3000/plan — кабинет  

Прод: `APP_URL=https://smm-agents.ru`

## Как устроено

1. **Проект = бизнес** — бриф, план, тексты, каналы  
2. **Маркетолог** — контент-план с временем по таймзоне  
3. **SMM** — тексты через DeepSeek  
4. **Оплата** — баланс пользователя, 50 ₽ за пост (ЮKassa)  

## .env

Скопируйте `.env.example` → `.env` и заполните ключи. Обязательно:

```
APP_URL=https://smm-agents.ru
AUTH_SECRET=длинная-случайная-строка
```
