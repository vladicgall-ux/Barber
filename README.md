# BLACK BEARD — барбершоп в Кунашаке

Веб-приложение для онлайн-записи, работающее внутри **Telegram Web App** и
**ВКонтакте (Mini App / MAX)**, с единой базой данных на **Supabase**.
Готово к деплою на **Vercel**.

## Стек

- **Next.js 14** (Pages Router) — фронтенд + API Routes (serverless-функции на Vercel)
- **Tailwind CSS** — стилизация (тёмная премиальная тема)
- **Supabase (PostgreSQL)** — единая база данных для Telegram и VK
- **Telegram Bot API** — уведомления администратору
- **VK API** (опционально) — уведомления в сообщество

> **Примечание по безопасности:** используется последняя версия ветки Next.js 14
> (`14.2.35`). Некоторые CVE в `next` исправлены только в ветке 15.x; при желании
> максимальной защищённости рассмотрите миграцию на Next.js 15 после первого деплоя
> (`npm audit` покажет актуальный статус).

## 1. Структура проекта

```
Barber/
├── components/
│   ├── BookingForm.js        # форма имени/телефона + сводка заказа
│   ├── Calendar.js           # интерактивный календарь
│   ├── MasterSelect.js       # выбор мастера (Вадим / Марсель)
│   ├── ServiceList.js        # список услуг с ценами
│   └── TimeSlotGrid.js       # сетка времени (Утро/День/Вечер)
├── lib/
│   ├── adminAuth.js          # подписанные cookie-сессии для /admin
│   ├── notify.js             # отправка уведомлений в Telegram/VK
│   ├── platform.js           # определение Telegram/VK/Web + haptics
│   ├── supabaseAdmin.js      # server-only клиент Supabase (service role)
│   ├── supabaseClient.js     # публичный клиент Supabase (anon key)
│   └── timeSlots.js          # генерация слотов 08:00–20:00 с шагом 30 мин
├── pages/
│   ├── _app.js
│   ├── _document.js          # подключение Telegram/VK SDK
│   ├── index.js              # главная страница клиента (шаги записи)
│   ├── admin.js               # секретная админ-панель /admin
│   └── api/
│       ├── services.js               # GET  список услуг
│       ├── masters.js                # GET  список мастеров
│       ├── availability.js           # GET  занятость слотов на дату/мастера
│       ├── appointments/create.js    # POST создание записи + уведомления
│       └── admin/
│           ├── login.js              # POST вход в админку по паролю
│           ├── logout.js             # POST выход
│           ├── appointments.js       # GET  список записей (с фильтрами)
│           └── cancel.js             # POST отмена записи (слот освобождается)
├── styles/globals.css
├── supabase/schema.sql        # SQL для создания таблиц в Supabase
├── .env.example
├── vercel.json                 # заголовки для встраивания в Telegram/VK iframe
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 2. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. Откройте **SQL Editor** и выполните весь файл [`supabase/schema.sql`](./supabase/schema.sql).
   Он создаст таблицы `services`, `masters`, `appointments`, индексы,
   политики RLS и добавит начальные данные (7 услуг, 2 мастера).
3. В **Project Settings → API** скопируйте:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` ключ → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` ключ → `SUPABASE_SERVICE_ROLE_KEY` (держите в секрете!)

### Как работает защита от двойной записи

На `appointments` создан частичный уникальный индекс
`(master_id, appointment_date, appointment_time) WHERE status = 'confirmed'`.
Это значит, что:
- Два клиента не могут одновременно занять один и тот же слот у одного мастера.
- При отмене записи (`status = 'cancelled'`) слот **автоматически** освобождается,
  так как индекс больше не учитывает отменённые записи — новый клиент
  сразу увидит это время свободным.

## 3. Переменные окружения

Скопируйте `.env.example` в `.env.local` для локальной разработки и
задайте те же переменные в **Vercel → Project Settings → Environment Variables**:

| Переменная | Где взять | Обязательна |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | да |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | да |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | да |
| `ADMIN_PASSWORD` | придумайте сами | да |
| `ADMIN_SESSION_SECRET` | `openssl rand -hex 32` | да |
| `TELEGRAM_BOT_TOKEN` | @BotFather | да, для уведомлений |
| `TELEGRAM_ADMIN_CHAT_ID` | @userinfobot или `getUpdates` | да, для уведомлений |
| `VK_GROUP_TOKEN` | VK → Управление сообществом → Работа с API → Ключи доступа | нет |
| `VK_GROUP_ID` | id сообщества ВКонтакте | нет |

## 4. Настройка Telegram Bot

1. Создайте бота через **@BotFather** (`/newbot`), сохраните токен.
2. Добавьте бота в чат/группу администраторов и получите `chat_id`
   (перешлите любое сообщение из этого чата боту **@userinfobot**, либо
   вызовите `https://api.telegram.org/bot<TOKEN>/getUpdates`).
3. Чтобы открыть приложение как Telegram Web App:
   - В **@BotFather** выполните `/newapp` (или `/setmenubutton`) и укажите
     URL вашего деплоя на Vercel (например `https://black-beard.vercel.app`).
4. Приложение уже подключает `telegram-web-app.js` в `pages/_document.js`
   и вызывает `Telegram.WebApp.ready()/expand()` при загрузке (`lib/platform.js`).

## 5. Настройка VK Mini App

1. Создайте Mini App в **VK Apps → Создать приложение**.
2. Укажите базовый URL — адрес вашего деплоя на Vercel.
3. (Опционально, уведомления в сообщество) В настройках сообщества создайте
   ключ доступа с правом `wall` и заполните `VK_GROUP_TOKEN` / `VK_GROUP_ID`.
4. Приложение подключает `vk-bridge` и вызывает `VKWebAppInit` автоматически.

## 6. Деплой на Vercel

1. Запушьте репозиторий на GitHub.
2. На [vercel.com](https://vercel.com) → **Add New Project** → выберите репозиторий.
3. Vercel сам определит Next.js. Добавьте переменные окружения из таблицы выше.
4. Нажмите **Deploy**. Готово — приложение доступно и как обычный сайт,
   и как Telegram Web App / VK Mini App (по тому же URL).

## 7. Локальный запуск

```bash
npm install
cp .env.example .env.local   # заполните переменные
npm run dev
```

Откройте `http://localhost:3000` — клиентская запись, и
`http://localhost:3000/admin` — админ-панель (пароль из `ADMIN_PASSWORD`).

## 8. Админ-панель

- Вход по паролю (`ADMIN_PASSWORD`), сессия хранится в подписанном
  HttpOnly cookie на 12 часов.
- Таблица всех записей с фильтрами по дате и мастеру.
- Кнопка **«Отменить запись»** переводит запись в статус `cancelled` —
  слот немедленно становится доступен для новой записи (проверяется
  через `GET /api/availability`, которую вызывает клиентское приложение).
