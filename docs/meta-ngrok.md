# Meta + ngrok (тесты Instagram / Threads / Facebook)

## 1. Запустите Next

```bash
npm run dev
```

## 2. Туннель HTTPS

```bash
ngrok http 3000
```

Скопируйте URL вида `https://xxxx.ngrok-free.app` в `.env`:

```
APP_URL=https://xxxx.ngrok-free.app
META_APP_ID=...
META_APP_SECRET=...
```

Перезапустите `npm run dev` после смены `.env`.

## 3. Meta Developer App

1. https://developers.facebook.com → Create App (Business)
2. Добавьте **Facebook Login** и при необходимости **Threads**
3. Settings → Basic: App ID / App Secret → в `.env`
4. Facebook Login → Settings → Valid OAuth Redirect URIs:

```
https://xxxx.ngrok-free.app/api/meta/callback
```

5. Roles → Roles: добавьте себя Admin/Developer/Tester
6. Instagram: Professional + связь с Facebook Page

## 4. В кабинете

Каналы → «Войти через Meta» для Facebook / Instagram / Threads.

Пока приложение в Development — работают только тестовые аккаунты.
Для любых клиентов нужен App Review.
