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
│   ├── AdminPanel.js         # админ-панель, встроенная прямо в приложение
│   ├── AuthGate.js           # экран входа/подтверждения телефона перед записью
│   ├── BookingForm.js        # форма имени/телефона + сводка заказа
│   ├── Calendar.js           # интерактивный календарь (учитывает выходные дни)
│   ├── ClosedDatesManager.js # управление выходными днями (в админ-панели)
│   ├── MasterSelect.js       # выбор мастера (Вадим / Марсель)
│   ├── ServiceList.js        # список услуг с ценами
│   ├── TimeSlotGrid.js       # сетка времени (Утро/День/Вечер)
│   └── UsersManager.js       # список пользователей: бан, права админа (в админ-панели)
├── lib/
│   ├── auth/
│   │   ├── validateInitData.js   # проверка подписи Telegram/MAX initData (HMAC-SHA256)
│   │   ├── upsertUser.js         # upsert пользователя по telegram_id/max_id
│   │   ├── session.js            # 30-дневная httpOnly/secure/sameSite=lax cookie-сессия
│   │   ├── codes.js               # генерация 6-значного кода и pollToken
│   │   ├── requireActiveUser.js   # правило "подтверждён телефон + указано имя" + права админа
│   │   ├── requireAdmin.js        # проверка "сессия + права админа" для /api/admin/*
│   │   └── publicUser.js          # безопасная проекция User для ответов API (+ isAdmin)
│   ├── bot/
│   │   ├── handleIncomingMessage.js  # общая логика диалога бота (код/телефон/имя)
│   │   ├── telegramApi.js            # sendMessage + клавиатура "поделиться телефоном"
│   │   └── maxApi.js                 # то же для MAX (см. примечание ниже)
│   ├── notify.js             # отправка уведомлений в Telegram/VK
│   ├── platform.js           # определение Telegram/MAX/VK/Web + haptics
│   ├── useAuth.js            # клиентский хук: авто-вход в Telegram/MAX, код для браузера
│   ├── supabaseAdmin.js      # server-only клиент Supabase (service role)
│   ├── supabaseClient.js     # публичный клиент Supabase (anon key)
│   └── timeSlots.js          # генерация слотов 08:00–20:00 с шагом 1 час
├── pages/
│   ├── _app.js
│   ├── _document.js          # подключение Telegram/VK SDK
│   ├── index.js              # главная страница клиента (шаги записи + встроенная админка)
│   └── api/
│       ├── services.js               # GET  список услуг
│       ├── masters.js                # GET  список мастеров
│       ├── availability.js           # GET  занятость слотов на дату/мастера
│       ├── closed-dates.js           # GET  закрытые даты для мастера (публично)
│       ├── appointments/create.js    # POST создание записи (требует активного пользователя)
│       ├── auth/
│       │   ├── telegram.js           # POST вход по X-Telegram-Init-Data
│       │   ├── max.js                # POST вход по X-Max-Init-Data
│       │   ├── me.js                 # GET  текущий пользователь + его статус
│       │   ├── logout.js             # POST выход
│       │   └── code/
│       │       ├── request.js        # POST выдать 6-значный код + pollToken
│       │       └── poll.js           # GET  браузер опрашивает статус кода
│       ├── bot/
│       │   ├── telegram-webhook.js   # POST webhook Telegram-бота
│       │   └── max-webhook.js        # POST webhook MAX-бота
│       ├── cron/
│       │   └── send-reminders.js     # POST напоминание клиенту за час (вызывается pg_cron)
│       └── admin/
│           ├── appointments.js       # GET  список записей (только для админов)
│           ├── confirm.js            # POST подтвердить запись + уведомить клиента
│           ├── cancel.js             # POST отмена записи (слот освобождается)
│           ├── closed-dates.js       # GET/POST/DELETE выходные дни (весь барбершоп/мастер)
│           └── users.js              # GET список + PATCH бан/права админа/привязка к мастеру
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
   Он создаст таблицы `services`, `masters`, `appointments`, `users`, `auth_codes`,
   `closed_dates`, индексы, политики RLS и добавит начальные данные (7 услуг, 2 мастера).
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
| `TELEGRAM_BOT_TOKEN` | @BotFather | да, для уведомлений и входа |
| `TELEGRAM_ADMIN_CHAT_ID` | @userinfobot или `getUpdates` | да, для уведомлений |
| `VK_GROUP_TOKEN` | VK → Управление сообществом → Работа с API → Ключи доступа | нет |
| `VK_GROUP_ID` | id сообщества ВКонтакте | нет |
| `AUTH_SESSION_SECRET` | `openssl rand -hex 32` | да |
| `MAX_BOT_TOKEN` | бот в MAX (аналог @BotFather) | да, для входа через MAX |
| `MAX_BOT_API_BASE` | обычно не нужно менять | нет |
| `TELEGRAM_BOT_USERNAME` / `MAX_BOT_USERNAME` | имя бота без `@` | нет (для подсказки на экране кода) |
| `TELEGRAM_WEBHOOK_SECRET` / `MAX_WEBHOOK_SECRET` | придумайте сами | да, для вебхуков ботов |
| `ADMIN_IDS` | Telegram/MAX user id владельцев барбершопа | **да, иначе никто не увидит админ-панель** |

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
5. Зарегистрируйте вебхук для входа по коду и подтверждения телефона/имени:
   ```
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
     ?url=https://<ваш-домен>/api/bot/telegram-webhook
     &secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```

## 5. Настройка VK Mini App

1. Создайте Mini App в **VK Apps → Создать приложение**.
2. Укажите базовый URL — адрес вашего деплоя на Vercel.
3. (Опционально, уведомления в сообщество) В настройках сообщества создайте
   ключ доступа с правом `wall` и заполните `VK_GROUP_TOKEN` / `VK_GROUP_ID`.
4. Приложение подключает `vk-bridge` и вызывает `VKWebAppInit` автоматически.

## 6. Авторизация пользователей (3 канала, одна база)

Реализована в `lib/auth/*`, `lib/bot/*`, `pages/api/auth/*`, `pages/api/bot/*`,
`lib/useAuth.js` и `components/AuthGate.js`.

### Канал 1 — Telegram Mini App

Клиент передаёт подписанный `Telegram.WebApp.initData` в заголовке
`X-Telegram-Init-Data` на `POST /api/auth/telegram`. Подпись проверяется по
официальной схеме Telegram (`lib/auth/validateInitData.js`):

```
secret_key = HMAC_SHA256(key="WebAppData", message=TELEGRAM_BOT_TOKEN)
hash       = HMAC_SHA256(key=secret_key,   message=data_check_string)
```

`data_check_string` — все пары `key=value` из `initData` (кроме `hash`),
отсортированные по ключу и соединённые `\n`. Данные считаются просроченными
через 24 часа (`auth_date`). При успехе пользователь создаётся/обновляется
в таблице `users` (`upsertUserByTelegramId`) и выдаётся сессионная cookie.

### Канал 2 — MAX Mini App

Полностью аналогично, но заголовок `X-Max-Init-Data`, эндпоинт
`POST /api/auth/max`, секрет — `MAX_BOT_TOKEN`. MAX использует идентичный
протокол подписи, поэтому обе платформы используют одну и ту же функцию
`validateInitData()`.

> **Допущение, которое стоит проверить:** точный SDK-глобал MAX Mini Apps и
> формат вебхука бота в официальной документации на момент написания не
> зафиксированы. Код предполагает `window.WebApp.initData` на клиенте
> (`lib/platform.js`) и Telegram-подобный Bot API на сервере
> (`lib/bot/maxApi.js`, `MAX_BOT_API_BASE`, по умолчанию `https://botapi.max.ru`).
> Поправьте эти два места под актуальную документацию MAX перед продакшеном.

### Канал 3 — обычный браузер (код в боте)

1. `POST /api/auth/code/request` создаёт 6-значный код и случайный
   `pollToken` (известен только этому браузеру), код живёт 10 минут
   (таблица `auth_codes`).
2. Пользователь отправляет код боту (Telegram или MAX — любому из двух).
3. Вебхук бота (`pages/api/bot/telegram-webhook.js` /
   `pages/api/bot/max-webhook.js` → общая логика в
   `lib/bot/handleIncomingMessage.js`) находит код, привязывает его к
   `telegram_id`/`max_id` отправителя, создаёт/обновляет пользователя и
   помечает код как `claimed`.
4. Браузер каждые 3 секунды опрашивает `GET /api/auth/code/poll?pollToken=...`
   (`lib/useAuth.js`). Как только код помечен `claimed`, сервер выдаёт
   сессионную cookie и возвращает пользователя.

Тот же бот, приняв контакт (`request_contact`), подтверждает телефон
(`phone_confirmed = true`), а обычным текстовым сообщением «Имя Фамилия»
— сохраняет имя и фамилию.

### Сессия

`lib/auth/session.js` — подписанная cookie `bb_session`
(`HttpOnly; Secure; SameSite=Lax`), срок жизни 30 дней. Секрет —
`AUTH_SESSION_SECRET`. Эта же сессия используется и для доступа к
встроенной админ-панели (см. раздел 9) — отдельного пароля у неё нет.

### Уровень доступа requireActiveUser

`lib/auth/requireActiveUser.js` определяет, может ли пользователь
записываться на услугу — гейт применён к `POST /api/appointments/create`
(`lib/auth/getActiveUserStatus`):

- пользователь должен быть авторизован;
- телефон должен быть подтверждён через бота (`phone_confirmed`);
- должны быть указаны имя и фамилия;
- забаненный администратором пользователь (`is_banned`) всегда получает 403.

Пользователи, чей Telegram/MAX id перечислен в `ADMIN_IDS` (через запятую),
освобождены от всех этих ограничений, кроме бана.

На фронтенде (`components/AuthGate.js`, подключён в `pages/index.js` на шаге
«Контакты») показывается соответствующий экран вместо формы записи, пока
условия не выполнены: вход через код, подтверждение телефона или указание
имени.

## 7. Деплой на Vercel

1. Запушьте репозиторий на GitHub.
2. На [vercel.com](https://vercel.com) → **Add New Project** → выберите репозиторий.
3. Vercel сам определит Next.js. Добавьте переменные окружения из таблицы выше.
4. Нажмите **Deploy**. Готово — приложение доступно и как обычный сайт,
   и как Telegram Web App / VK Mini App (по тому же URL).

## 8. Локальный запуск

```bash
npm install
cp .env.example .env.local   # заполните переменные
npm run dev
```

Откройте `http://localhost:3000` — там же, при входе под id из `ADMIN_IDS`,
доступна и админ-панель (см. ниже).

## 9. Админ-панель

Отдельной страницы `/admin` и пароля больше нет — панель встроена прямо в
главное приложение (`components/AdminPanel.js`) и видна только тому, кто
вошёл (через Telegram/MAX или код в браузере — см. раздел 6) и является
администратором.

### Кто считается администратором

Два независимых источника, оба проверяются в `lib/auth/requireActiveUser.js#isAdminUser`:

1. **`ADMIN_IDS`** — переменная окружения, статичный bootstrap-список
   Telegram/MAX id через запятую. Всегда работает, не зависит от базы —
   гарантия, что владелец не потеряет доступ, даже если случайно снимет
   с себя права в самой панели.
2. **Флаг `is_admin` в таблице `users`** — то, чем реально управляет
   `components/UsersManager.js` в панели. Это столбец в Postgres, а не
   переменная окружения и не память процесса, поэтому **права,
   выданные через кнопку «Сделать администратором», не пропадают ни при
   редеплое, ни при перезапуске serverless-функций** — они переживают
   любой рестарт ровно как любая другая запись в базе.

- Как только пользователь авторизован и является админом (по любому из
  двух источников), в правом верхнем углу шапки появляется кнопка
  **«Админ-панель»** (`pages/index.js`, проверка `user.isAdmin` —
  вычисляется в `lib/auth/publicUser.js` через `isAdminUser()`).
- Доступ к данным на сервере проверяет `lib/auth/requireAdmin.js`: сессия
  должна быть валидна, пользователь — админ, не забанен. Используется в
  `GET /api/admin/appointments`, `POST /api/admin/cancel`,
  `POST /api/admin/confirm`, `GET/PATCH /api/admin/users` и
  `GET/POST/DELETE /api/admin/closed-dates`.

### Пользователи (`components/UsersManager.js`)

Раскрывающийся блок «Пользователи (N)» показывает счётчик и список всех,
кто хоть раз входил в приложение (через Telegram, MAX или код в браузере):
имя, телефон, к какой платформе привязан, статус. У каждого — три действия
(`GET/PATCH /api/admin/users`):

- **«Сделать администратором» / «Убрать администратора»** — переключает
  `is_admin`. Как только пользователь стал админом, у него в приложении
  сразу появляется кнопка «Админ-панель» (без переавторизации — статус
  проверяется при каждом запросе к `/api/auth/me`).
- **Выпадающий список мастеров** (виден только у админов) — «Все мастера»
  или конкретный мастер. Это `admin_master_id`: если задан — такой админ
  получает уведомления в Telegram/MAX **только** о записях этого мастера;
  если «Все мастера» (`null`) — получает уведомления обо всех записях,
  как раньше. Рассылкой занимается `notifyMasterAdmins()`
  (`lib/notify.js`), которая при каждой новой записи находит всех
  `is_admin = true` с `admin_master_id is null OR = <мастер этой записи>`
  и шлёт каждому персональное уведомление с кнопками «Подтвердить»/
  «Отменить» (в общий `TELEGRAM_ADMIN_CHAT_ID` по-прежнему уходит копия
  со всеми записями без исключения — это отдельный, общий канал).
- **«Заблокировать» / «Разблокировать»** — переключает `is_banned`;
  забаненный получает 403 при попытке записаться (`getActiveUserStatus`),
  а если он администратор — тоже теряет доступ к панели.
- Таблица всех записей с фильтрами по дате и мастеру.
- Кнопка **«Подтвердить»** (`POST /api/admin/confirm`) ставит
  `admin_confirmed = true` и сразу отправляет клиенту сообщение в
  Telegram/MAX: «Ваша запись в BLACK BEARD подтверждена ✅» с деталями
  услуги, мастера, даты и времени. Пока запись не подтверждена, в списке
  видна пометка «Ожидает подтверждения».
- То же самое подтверждение или отмену можно сделать **прямо из Telegram**,
  не открывая приложение: каждое уведомление о новой записи (общее в
  `TELEGRAM_ADMIN_CHAT_ID` и персональные от `notifyMasterAdmins()`) несёт
  две inline-кнопки — «✅ Подтвердить» и «❌ Отменить». Нажатие
  обрабатывается в `pages/api/bot/telegram-webhook.js` (`callback_query` с
  `data: "confirm:<id>"` или `"cancel:<id>"`), проверяет, что нажавший —
  админ по `ADMIN_IDS` ИЛИ по флагу `is_admin` в базе
  (`lib/auth/requireActiveUser.js#isAdminByPlatformId`), и вызывает ту
  же функцию, что и соответствующая кнопка в приложении —
  `confirmAppointment()` / `cancelAppointment()`
  (`lib/appointments/*.js`). Клиент получает то же уведомление
  (подтверждение или отмена), что и при действии через веб-панель, а обе
  кнопки в чате исчезают после нажатия любой из них.
- Кнопка **«Отменить запись»** переводит запись в статус `cancelled` —
  слот немедленно становится доступен для новой записи (проверяется
  через `GET /api/availability`, которую вызывает клиентское приложение),
  и клиенту сразу уходит сообщение «Ваша запись в BLACK BEARD отменена ❌».
- Блок **«Выходные дни»** (`components/ClosedDatesManager.js`) наверху
  панели — админ выбирает дату и либо весь барбершоп, либо одного мастера
  (например, отпуск), и закрывает её. Закрытые даты хранятся в таблице
  `closed_dates` (`master_id = null` — закрыт весь барбершоп для всех
  мастеров; иначе — только для одного). Клиентский календарь
  (`components/Calendar.js`) сразу показывает такие дни зачёркнутыми и
  недоступными для выбора (`GET /api/closed-dates?masterId=...`), а
  `POST /api/appointments/create` и `GET /api/availability` отдельно
  перепроверяют это на сервере — обойти закрытие через прямой запрос к API
  тоже нельзя.

## 10. Напоминание клиенту за час до записи

`POST /api/cron/send-reminders` (`pages/api/cron/send-reminders.js`)
находит все записи со статусом `confirmed`, которые начинаются через
50–65 минут и ещё не получили напоминание (`reminder_sent = false`),
отправляет клиенту сообщение в Telegram/MAX и помечает `reminder_sent = true`,
чтобы не отправить дважды. Эндпоинт защищён общим секретом
(`CRON_SECRET`) в заголовке `Authorization: Bearer <секрет>` — вызывать его
может только планировщик, не браузер.

Планировщик — не Vercel Cron (на тарифе Hobby он ограничен одним запуском
в сутки, чего недостаточно для проверки «через час»), а **`pg_cron` +
`pg_net` прямо в Supabase**, не зависящие от тарифа Vercel:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-appointment-reminders',
  '*/5 * * * *', -- каждые 5 минут
  $$
  select net.http_post(
    url := 'https://<ваш-домен>/api/cron/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <тот же CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Если `ADMIN_IDS` не задан или не содержит ваш id — кнопка «Админ-панель»
не появится и запросы к `/api/admin/*` будут отклонены с 403.
