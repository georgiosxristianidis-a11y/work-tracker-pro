# 🗂️ WORK TRACKER PRO — HANDOFF (карточный протокол)

> **Агент, читай так:** ① эта шапка → ② `AGENTS.md` (правила, обязательны) → ③ ТОЛЬКО твоя карточка. 
> **Запрещено:** читать файлы вне вайтлиста карточки, сканировать репо, «улучшать заодно». Одна сессия = одна карточка.

| | |
|---|---|
| **Проект** | Work Tracker Pro · PWA учёта рабочих часов |
| **Код** | `C:/Users/Zephyrus/Downloads/qBit/work-tracker-pro` · GitHub: `georgiosxristianidis-a11y/work-tracker-pro` (public, default branch `main`) |
| **Прод** | https://work-tracker-pro-kohl.vercel.app (Vercel, auto-deploy из `main`; `GEMINI_API_KEY` НЕ задан — намеренно, до S-1) |
| **Стек** | React 19 · Vite 6 · Tailwind v4 · Zustand · IndexedDB · Supabase (RLS+anon auth) · Gemini через `/api/insight` |
| **Аудит** | P0: 2026-07-05 · ядро/архитектура: 2026-07-10 (Fable 5, пре-деплой) |
| **Ворота после каждой карты** | `npm run lint && npm run build` (+ указанный в карте verify) → коммит |

**Прогресс:** 🟩 P0-0…P0-3 · 🟨 P0-4 (Supabase ✅ · Vercel env — при деплое) · 🟩 D1 · 🟩 D2 · 🟩 D3 · 🟩 P1-1 · 🚀 ДЕПЛОЙ (2026-07-13, live) · 🟩 P1-2 · 🟩 D4 · ⬜ P2-1 · ⬜ P2-2 · ⬜ P2-3 · **аудит-2:** 🟩 S-1 · 🟩 S-3 · 🟩 UX-1 · 🟩 FX-1 · ⬜ D5 · 🟨 P2-4 (шрифт-пункт закрыт в S-3)

**🚀 Деплой-гейт:** деплоить можно только после D1 + D3 + P1-1 (код) и P0-4 (руками владельца). D2 — до публичного анонса «синхронизации».

**Делегирование по критичности (решение владельца):**
- 🔴 **Fable** — ядро синка и целостность данных (всё, что может потерять/слить данные) — первым.
- 🔴 **Opus (Lead)** — второй хирург; ревью дифов Fable; замена Fable при лимитах.
- 🔵 **Sonnet 5** — точечные многофайловые багфиксы строго по списку карты.
- 🟢 **Gemini 3.5** — механика по готовой спеке: словари, массовые замены, гигиена. 
- Автор кода ≠ ревьюер. Одна сессия = одна карта.

---

## 🧑 P0-4 — Внешняя инфраструктура · ТОЛЬКО пользователь (агенты не могут)
- **🎯 Цель:** активировать серверную часть P0-1/P0-2.
- **📋 Чек-лист:**
  1. Supabase Dashboard → SQL Editor → выполнить `supabase/schema.sql` (если старая таблица `work_entries` существует — сначала `drop`, см. комментарий в файле).
  2. Supabase → Authentication → Sign In/Up → включить **Anonymous sign-ins**.
  3. Vercel → Project Settings → Environment Variables → задать `GEMINI_API_KEY` (иначе `/api/insight` вернёт 500).
- **🔍 Verify:** запись с двух разных браузеров на одну дату — обе строки живы в таблице; AI-инсайт отвечает на проде.

## 🔴 D1 — Sync v2: тихий фон + удаление в облаке · 🔴 Fable (хирургия, деплой-блокер)
- **🎯 Цель:** фоновый синк никогда не спамит тостами; удаление данных доезжает до облака.
- **🐛 Факты аудита:**
  - `useSupabaseSync.ts:26-29` — при `!supabase` показывает error-тост; вызывается interval'ом каждые 5 мин (`App.tsx:150-161`) и **каждым сохранением записи** → у пользователя без .env красный тост на каждый чих. Interval также не проверяет `navigator.onLine` → офлайн = тост-спам.
  - Удаления только локальные: `deleteEntry`/`clearMonth`/`clearAllData` не трогают облако → «Delete All Data» оставляет полную копию в Supabase (конфликт с privacy-позиционированием).
  - Автосейв редактора (`EditorModal.tsx:50-58`, debounce 600ms) на каждое изменение часов запускает полный upsert всей таблицы + тост «Entry saved».
- **📂 Файлы:** `src/hooks/useSupabaseSync.ts`, `src/App.tsx` (вызовы sync + interval), `src/components/EditorModal.tsx` (не трогать UI — только цепочку сейва), при необходимости `src/store/useAppStore.ts`.
- **📏 Правила:** сигнатура `syncWithSupabaseAction(opts?: {silent?: boolean})`; ручной тап Sync в Settings — с тостами, все фоновые вызовы — silent; interval не создавать при `!supabase`; удаление: точечный `delete().eq('user_id',uid).eq('date',date)` в deleteEntry-потоке и `delete().eq('user_id',uid)` в clearAllData; тост «Entry saved» из автосейва убрать (в модалке уже есть индикатор Database/CircleCheck); синк после автосейва — debounce ≥10с от последнего изменения. UX-поведение ручного Sync не менять.
- **✅ Done:** без .env и офлайн — ноль тостов от фона; удалённая запись исчезает из таблицы Supabase; Clear All чистит строки user_id.
- **🔍 Verify:** ворота + сценарии: (1) пустой .env → сохранить запись → тостов об ошибке нет; (2) удалить запись при работающем Supabase → строки нет в таблице; (3) ручной Sync без .env → понятный тост есть.

## 🔴 D2 — Restore из облака (или честный «Backup») · 🔴 Fable, ревью Opus
- **🎯 Цель:** «Cloud Sync» перестаёт быть push-only бэкапом без восстановления.
- **🐛 Факт аудита:** пути pull не существует; переустановка PWA = новая анонимная сессия + пустая база, данные из облака недостижимы. Продавать как «синхронизацию» нельзя.
- **📂 Файлы:** `src/hooks/useSupabaseSync.ts` (pull+merge по `updated_at`), `src/components/SettingsScreen.tsx` (кнопка Restore / переименование), `src/hooks/useTranslation.ts`.
- **📏 Правила:** ЛИБО (a) restore: pull всех строк user_id при ручной команде + merge (новее побеждает по updated_at), ЛИБО (b) если restore откладываем — переименовать «Cloud Sync» → «Cloud Backup» во всех трёх языках. Вариант выбирает владелец перед сессией. Помнить: анонимный uid не переживает чистку браузера — для настоящего мультидевайса позже нужен sign-in (email OTP) — НЕ делать в этой карте, только заметка.
- **✅ Done:** (a) restore возвращает данные на чистой установке при живой сессии; или (b) в UI нигде нет слова Sync без Backup.
- **🔍 Verify:** ворота + ручной сценарий restore.

## 🔵 D3 — Пакет точечных багфиксов ядра · 🔵 Sonnet 5 (строго по списку)
- **🎯 Цель:** закрыть найденные аудитом баги. НИЧЕГО сверх списка.
- **📋 Список (файл → фикс):**
  1. `src/components/CalendarScreen.tsx:76` — `new Date().toISOString().split('T')[0]` даёт UTC-«сегодня» (ночью в GR/RU подсвечен вчерашний день) → собрать строку из локальных getFullYear/getMonth/getDate.
  2. `CalendarScreen.tsx:52` — `{hours && hours > 0 && (...)}` рендерит текст «0» при hours===0 → `{hours > 0 && (...)}`.
  3. `CalendarScreen.tsx:116,119,163,166` (+ аналог в HomeScreen, если есть) — `setViewDate(new Date(viewDate.setMonth(...)))` мутирует Date в сторе → `const d = new Date(viewDate); d.setMonth(d.getMonth()±1); setViewDate(d)`.
  4. `src/App.tsx` — удалить мёртвое: `syncQueue`/`setSyncQueue`, `isSyncing`/`setIsSyncing`, неиспользуемые `setEntries`/`setYearEntries` из деструктуризации, `handleEditorSave` + проп `saveEntry` у CalendarScreen (никогда не вызывается; убрать и из интерфейса CalendarScreenProps), неиспользуемые импорты (`supabase`, `Entry`, `ChevronLeft`, `Logo`, `useMemo`, `useRef`, `DOW_NAMES` — проверить каждый).
  5. `App.tsx:272-279` — `toggleTheme`: убрать ручные `document.documentElement.className` и `db.setSetting` (store `setSettings` уже делает оба).
  6. `App.tsx:106` — убрать искусственный `setTimeout(...,1200)` сплэша → `setIsLoading(false)` сразу после загрузки.
  7. `App.tsx:421` — `EditorModal` получает `haptic={haptic}` → `haptic={h}` (вибрация игнорирует настройку) — если ещё не закрыто P1-1.
- **📏 Правила:** только перечисленные строки; никакого рефакторинга вокруг.
- **✅ Done:** все 7 пунктов; `grep "syncQueue\|isSyncing\|handleEditorSave" src/` — пусто.
- **🔍 Verify:** ворота + `npx playwright test` + ручная проверка: переключение месяцев стрелками и свайпом работает, «сегодня» подсвечен верно.

## 🟠 P1-1 — Честность фич + гигиена deps · 🔵 Sonnet 5
- **🎯 Цель:** UI не обещает того, чего нет; конфиг без фантомов.
- **📂 Файлы:**
  - `src/components/SettingsScreen.tsx:94` — подзаголовок `t('E2E Encryption & Blurring')`: шифрования НЕТ → заменить на честный (`Privacy & Offline`).
  - `src/hooks/useTranslation.ts:18,138` — обновить ключ словаря (RUS/GR).
  - `src/constants.ts:34-35,56-57` — `e2eeEnabled`/`e2eeKey` пометить `@deprecated (never implemented)`, НЕ удалять (миграция настроек).
  - `vite.config.ts:60` — убрать `'html2canvas'` из `vendor-pdf` manualChunks (не прямая зависимость).
  - `src/App.tsx:421` — `haptic={h}` для EditorModal (если не закрыто в D3).
- **✅ Done:** grep `-i "e2e"` по `src/` → только deprecated-поля constants.ts.
- **🔍 Verify:** ворота; выключить Haptic Feedback → редактор не вибрирует.

## 🚀 === ДЕПЛОЙ-ГЕЙТ: D1 + D3 + P1-1 + P0-4 === 

## 🟠 P1-2 — TypeScript strict · 🔵 Sonnet 5 (итеративно)
- **🎯 Цель:** `"strict": true` в `tsconfig.json`; ошибки починены типами.
- **📂 Файлы:** `tsconfig.json`, далее ТОЛЬКО файлы из вывода `npm run lint`. Горячие точки: `(import.meta as any)` в `src/lib/supabase.ts` (→ vite-env.d.ts), `settings: any` в CalendarScreen:15-16.
- **📏 Правила:** чинить типами, не `as any`; поведенческие изменения — СТОП, доложить.
- **✅ Done:** `npm run lint` — 0 ошибок при strict.
- **🔍 Verify:** ворота.

## 🟢 D4 — i18n дыры · 🟢 Gemini 3.5 (механика по спеке)
- **🎯 Цель:** график и новые строки говорят на языке пользователя.
- **📂 Файлы:** `src/hooks/useTrends.ts:38` — `MONTH_NAMES[...]` hardcode → принимать словарь месяцев параметром (выбор по settings.language, как в `App.tsx:174-179`); `src/hooks/useTranslation.ts` — добавить в RUS/GR: 'Strict Offline Mode', 'Disable cloud sync & AI requests' и все ключи, добавленные картами D1/D2/P1-1.
- **📏 Правила:** только словари и проброс месяцев; логику не трогать.
- **✅ Done:** на RUS график показывает «Янв…Дек» (первые 3 буквы), тумблер офлайна переведён.
- **🔍 Verify:** ворота + переключение трёх языков в Settings.

## 🟡 P2-1 — Токены → @theme + семантические имена · 🔴 план Fable → 🟢 замены Gemini 3.5
- **🎯 Цель:** цвета как нативные Tailwind-утилиты; конец `bg-[var(--bg)]`-многословию.
- **📂 Файлы:** `src/index.css` (палитру в `@theme`; `--a→--accent`, `--b→--border`, `--t1..t3→--text-1..3`, `--bg-1→--surface`), затем механическая замена классов по `src/components/*` и `src/App.tsx` по карте замен, утверждённой Fable.
- **📏 Правила:** пиксель-в-пиксель; 3 темы сохраняются; контраст `--t3` на светлой теме ≥4.5:1; `maximum-scale=1`/`user-scalable=0` убрать из `index.html`.
- **✅ Done:** grep `"var(--a)"` по `src/` → 0; три темы переключаются.
- **🔍 Verify:** ворота + `npx playwright test`.

## 🟡 P2-2 — Гигиена репо · 🟢 Gemini 3.5
- **🎯 Цель:** корень без разового мусора.
- **📂 Файлы:** удалить `temp_modals.txt`, `del.cjs`, `find_emoji.cjs`, `inspect.cjs`, `rebuild.cjs`, `wrap_modals.cjs`, `test.cjs`, `test-toasts.js`, `test-motion.ts`, `selector-test.spec.ts`, `manifest.json` (корневой — сирота, манифест генерит VitePWA; НЕ трогать `public/`).
- **📏 Правила:** `scripts/`, `tests/`, все `.md` — НЕ трогать.
- **✅ Done:** `ls *.cjs` в корне — пусто.
- **🔍 Verify:** ворота + `npx playwright test`.

## 🟡 P2-3 — Производительность записи · 🔵 Sonnet 5
- **🎯 Цель:** убрать лишние транзакции и O(N)-перечтения.
- **📂 Файлы:** `src/lib/db.ts` (добавить `saveMany(entries)`/`deleteMany(dates)` одной транзакцией), `src/hooks/useQuickFill.ts` (до 31 последовательного await → batch), `src/store/useAppStore.ts` (undo-буфер → стек из N последних операций; НЕ трогать сигнатуры экшенов), `src/components/SettingsScreen.tsx:169` (debounce персистенции rate/goal — писать в db не чаще раза в 500мс).
- **✅ Done:** QuickFill месяца — 2 транзакции вместо ~60; два удаления подряд — оба «Undo» работают.
- **🔍 Verify:** ворота + playwright.

---

## 🔍 КАРТЫ ПО АУДИТУ 2026-07-12 (security + core + customer journey, Fable 5)

## 🔴 S-1 — Защита /api/insight · 🔴 план Fable → 🔵 Opus код (деплой-блокер)
- **🎯 Цель:** эндпоинт нельзя дёргать с чужого сайта и сжигать квоту Gemini.
- **🐛 Факты:** нет проверки Origin; `targetLang` и `history` без валидации интерполируются в промпт (prompt injection + cost abuse); размер body не ограничен.
- **📂 Файлы:** `api/insight.ts`, (опц.) `vercel.json`.
- **📏 Правила:** `targetLang` — allowlist `['English','Russian','Greek']`; `history` — строка, обрезка ≤4000 симв.; Origin/Referer должен матчить прод-домен, иначе 403 без деталей; заметка владельцу: включить Vercel WAF/ratelimit на `/api/*`.
- **🔍 Verify:** curl с чужим Origin → 403; body 1MB → 400; легитимный запрос из приложения работает.

## 🟠 S-3 — Security headers через `vercel.json` · 🔵 Opus (карта подготовлена 2026-07-20, сверена с кодом)
- **🎯 Цель:** прод отдаёт строгие security-заголовки (в первую очередь CSP), НЕ ломая шрифт, синк, PDF/CSV/JSON-экспорт и анимации.
- **🐛 Факты (сверено с кодом 2026-07-20):**
  - `vercel.json` в репо НЕТ — создаётся с нуля (единственный источник заголовков; VitePWA-манифест не трогать).
  - Наивный CSP из прежней версии карты (`script-src 'self'; connect-src 'self' https://*.supabase.co`) **сломал бы живой прод** по трём осям:
    1. Шрифт **Epilogue грузится с Google Fonts CDN** — `index.html`: `preconnect`/`preload` на `fonts.googleapis.com` (CSS) + `fonts.gstatic.com` (woff2). `style-src 'self'`/`font-src 'self'` убьют шрифт.
    2. На `<link rel=preload>` шрифта висит инлайн-обработчик `onload="this.onload=null;this.rel='stylesheet'"` → строгий `script-src 'self'` его заблокирует, swap preload→stylesheet не произойдёт (в dist подтверждено: инлайн-`<script>`/`<style>` блоков 0, но инлайн-`onload` есть).
    3. **framer-motion** (`motion/react`, широко: App, AnalyticsChart/Screen, EditorModal и др.) пишет инлайн `style=""` в рантайме → обязателен `style-src 'unsafe-inline'`, иначе анимации/раскладка ломаются.
  - Синк: Supabase REST+Auth на `https://*.supabase.co`; realtime/wss НЕ используется (0 `.subscribe`/channel) → `connect-src 'self' https://*.supabase.co` достаточно. AI-инсайт — свой origin (`/api/insight`, покрыт `'self'`). Env: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
  - Экспорт (`src/hooks/useDataExport.ts`): скачивание через `Blob`+`URL.createObjectURL` (`blob:`) → нужен `img-src 'self' data: blob:`.
  - `https://t.me/share/url` в src — навигационная ссылка шаринга (не fetch), connect-src не трогает; строгую навигацию не ставить так, чтобы блокнуть open в новой вкладке. `manifest.webmanifest` → `manifest-src 'self'`.
- **🔀 Развилка (решение владельца ДО сессии) — рекомендация Вариант A:**
  - **Вариант A (рекомендую):** сперва самхост Epilogue (это же половина карты P2-4): `public/fonts/*.woff2` + `@font-face` в `src/index.css`, убрать 3 внешних `<link>` и инлайн `onload` из `index.html`. Тогда CSP чистый и строгий:
    ```
    default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
    ```
    (`style-src 'unsafe-inline'` остаётся из-за motion; `script-src` строгий — БЕЗ `'unsafe-inline'`.) Плюсы: privacy (нет утечки IP на Google), офлайн, LCP, самый строгий CSP, соответствует DNA (self-hosted шрифты).
  - **Вариант B:** оставить Google Fonts CDN → CSP слабее: `script-src 'self' 'unsafe-inline'` (ради `onload`), `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`. `'unsafe-inline'` в script-src обесценивает половину защиты — НЕ рекомендую.
- **📂 Файлы:** **новый** `vercel.json` (`headers` → CSP + сопутствующие). При Варианте A ещё: `public/fonts/*.woff2` (новые), `src/index.css` (`@font-face`), `index.html` (убрать preconnect/preload/noscript Google Fonts + инлайн `onload`).
- **📏 Правила:** заголовки — HTTP-заголовками через `vercel.json`, НЕ `<meta>`. Помимо CSP добавить: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, минимальный `Permissions-Policy` (напр. `camera=(), microphone=(), geolocation=()`), `X-Frame-Options: DENY` (дубль frame-ancestors для старых браузеров). HSTS Vercel ставит сам — не дублировать. Скоуп строго по варианту, рефакторинга вокруг нет.
- **✅ Done:** securityheaders.com ≥ A; на живом проде: Epilogue рендерится, Supabase-синк (запись/удаление/restore) работает, экспорт скачивается, навигация/анимации целы, DevTools Console — 0 CSP-violation.
- **🔍 Verify:** ворота (`npm run lint && npm run build`) + `npx playwright test --workers=2` (шрифт/навигация/сейв не сломаны) + `curl -I` прод-URL (заголовки на месте) + Console 0 CSP-ошибок. Заметка владельцу из S-1 в силе: включить Vercel WAF/rate-limit на `/api/*`.

## 🟠 UX-1 — Честная модель сохранения редактора · 🔵 Opus
- **🐛 Факты (journey):** правка часов автосейвится через 600мс, но закрытие модалки раньше таймера молча теряет правку (cleanup clearTimeout в EditorModal.tsx:60); свежеоткрытый день показывает «10h / €150» как будто записано, хотя закрытие без изменений ничего не создаёт.
- **📏 Правка:** при закрытии — flush отложенного автосейва (если были изменения); незаписанный дефолт визуально отличать от сохранённой записи.
- **📂 Файлы:** `src/components/EditorModal.tsx` (+ `App.tsx` только если нужен проброс).

## 🔵 FX-1 — Вибрация уважает настройку во всех экшенах App · 🔵 Sonnet (10 мин)
- **🐛 Факт:** `App.tsx` saveEntry/saveMultipleEntries/deleteEntry/handleOpenQuickFill зовут глобальный `haptic()` (enabled=true) вместо обёртки `h` — `hapticEnabled` игнорируется. Та же болезнь, что чинили в P1-1 для EditorModal.
- **📏 Правка:** заменить вызовы на `h`, поправить deps. Только это.

## 🔵 D5 — Дельта-синк вместо полного upsert · 🔴 Fable
- **🐛 Факт:** каждый фоновый синк шлёт ВСЮ таблицу (`getAllEntries` → upsert) — O(N) сети каждые 5 мин и после каждого сейва.
- **📏 Правка:** копить Set изменённых дат с последнего успешного синка (персистить), слать только их; после успеха — очищать. Ручной Sync может остаться полным (кнопка = «выровнять всё»).
- **📂 Файлы:** `src/hooks/useSupabaseSync.ts`, `src/store/useAppStore.ts`.

## 🟢 P2-4 — Perf/типы-гигиена по аудиту · 🟢 Gemini по списку
- AI-кэш: ключ = вся history-строка → `${lastDate}-${count}-${lang}` (useAiInsight.ts:29).
- `navClicks` из App → внутрь Navigation (сейчас каждый тап по навигации ререндерит всё дерево).
- `restoreFromCloudAction`: по-строчные `db.saveEntry` → `saveMany` (после P2-3).
- ~~Self-host шрифта Epilogue, убрать preconnect/CDN Google Fonts~~ ✅ ЗАКРЫТО в S-3 (Вариант A): `@fontsource-variable/epilogue`, CDN убран, шрифт с own origin.
- **новый** `src/vite-env.d.ts` (`/// <reference types="vite/client">` + typed env) → убрать `(import.meta as any)` в supabase.ts; `as any` у theme/language/currency в SettingsScreen (массивы `as const`); `usePowerSave` getBattery через типизированный интерфейс.

---

## 🟩 Закрытые карты (сжато — детали в Журнале и git log)
- **P0-0** `acfc3e8` — проект взят под git (раньше был ВНЕ контроля версий), ветка `fixes/p0`.
- **P0-1** `f9acf45` — ключ Gemini только в `api/insight.ts` (Vercel, `process.env`); клиент → `fetch('/api/insight')`; `@google/genai` удалён.
- **P0-2** `2a75e86` — `ensureAuth()` (анонимная сессия), upsert `(user_id,date)`, delete-all удалён, `supabase/schema.sql` + RLS.
- **P0-3** `b659440` — chaos-код вырезан полностью (App/store/Settings/public/chaos); strictOfflineMode честно отключает sync+AI.

## 🔴 MISTAKE LEDGER (живой лог — пополнять по Auto-Ledger)
```
- [🔴 motion.circle/motion.line в Navigation.tsx без initial] -> в production-сборке (не в dev-сервере!) framer-motion иногда не мог прочитать стартовое cx/cy/y2 из ещё не отрисованного DOM -> "undefined" в SVG-атрибуты, 20 console-error за 3с простоя, нестабильный hit-test нав-бара -> [🟢 initial={false} на все motion.circle/motion.line с animate по raw SVG-атрибутам; баг был НЕВИДИМ на dev-сервере и intermittent даже на prod-сборке (0/20 ошибок между прогонами) — только 5x повторный прогон против production build поймал race]
- [🔴 API-ключ через vite define] -> ключ в клиентском бандле -> [🟢 serverless /api/insight]
- [🔴 upsert onConflict:'date' без auth] -> юзеры перетирают друг друга -> [🟢 RLS + (user_id,date)]
- [🔴 Chaos/dev-код в проде] -> SW прекэшировал chaos-скрипты юзерам (36→32 файла) -> [🟢 удалён; dev-тулзы только за import.meta.env.DEV]
- [🔴 UI-лейбл без логики (E2EE)] -> ложное чувство защиты -> [🟢 фича появляется только с кодом] (закрыто P1-1: лейбл удалён)
- [🔴 git init в C:/Users/Zephyrus вместо папки проекта] -> git сканировал весь профиль Windows, команды висли; проект был вне контроля версий -> [🟢 репо в папке проекта; домашний .git снести вручную]
- [🔴 Gemini при удалении define снёс закрытие массива plugins] -> сломанный vite.config.ts -> [🟢 после каждой правки агента: npm run lint && npm run build; диф ревьюит другая модель]
- [🔴 P0-2 убрал delete-all, но не вписал замену] -> удаления перестали доезжать до облака (расхождение данных) -> [🟢 при вырезании поведения сразу проектировать замену; карта D1]
- [🔴 Фоновый sync без silent-режима] -> error-тосты каждые 5 мин у юзеров без .env и офлайн -> [🟢 фон молчит, говорит только ручное действие; карта D1]
- [🔴 Worktree агента создан от baseline-коммита, не от fixes/p0] -> агент видит код без P0-фиксов и чужой HANDOFF; P1-1 сессия так и чинила уже починенный vite.config -> [🟢 первый шаг новой сессии: git merge fixes/p0 --ff-only в ветку worktree]
- [🔴 Карта перечисляет deps (express/dotenv), которых уже нет] -> холостые шаги в спеке -> [🟢 перед картой сверять спеку с фактическим package.json]
- [🔴 npx playwright test всем набором с дефолтными воркерами] -> ложные newPage-таймауты всех 8 тестов на этой машине -> [🟢 гонять с --workers=2; при падении сверять с baseline через git stash]
- [🔴 rocket.spec / wand.spec] -> сломаны ещё ДО правок D1/D3 (wand ищет текст «Quick Fill Calendar», которого нет в UI) -> [🟢 тест-дрифт; чинить отдельной картой, не «заодно»]
- [🔴 «Merge новее по updated_at» в спеке D2] -> локальные Entry без временных меток, а upsert не обновляет updated_at при update -> [🟢 restore = вставка отсутствующих локально дат, при конфликте локальная побеждает; настоящий LWW — вместе с email OTP и триггером на updated_at]
- [🔴 Автоправка оставила литеральный «\n» в JSX SettingsScreen] -> мусорный текст виден пользователю над блоком Cloud Sync -> [🟢 после массовых правок агентов — скриншот-прогон Playwright, не только tsc]
- [🔴 localStorage.clear() в ErrorBoundary] -> сносил supabase-сессию: анонимный uid = единственный ключ к облачному бэкапу, данные осиротели бы навсегда -> [🟢 при «reset» сохранять sb-* ключи; уборка хранилища — только селективная]
- [🔴 Hardcoded MONTH_NAMES в useTrends] -> график всегда по-английски, независимо от языка -> [🟢 выбор словаря месяцев по settings.language внутри хука + settings.language в deps useMemo]
- [🔴 В проекте не было @types/react] -> tsc молча считал весь JSX any; strict был физически невозможен -> [🟢 @types/react + @types/react-dom в devDeps; при «странно тихом» tsc первым делом проверять типы зависимостей]
- [🔴 Живая проверка через Claude Browser-пану] -> в ней не тикает requestAnimationFrame: AnimatePresence mode="wait" не завершает exit, экраны «не переключаются» — ложная тревога о сломанной навигации -> [🟢 вживую проверять через Playwright (реальный Chromium); пана годится только для статики]
- [🔴 SVG-иконка sizes:'any' в PWA-манифесте] -> Chrome требует иконку с числовым размером ≥144px: инсталл молча недоступен, лого не показывается -> [🟢 PNG 192+512 (purpose:any) + отдельная maskable-запись с full-bleed фоном и лого в центральных 80%]
- [🔴 Два манифеста: мёртвый manifest.json в корне + генерируемый VitePWA] -> правки уходили в файл, который никуда не подключён -> [🟢 единственный источник — блок manifest в vite.config.ts; manifest.json удалён]
- [🔴 apple-touch-icon указывал на SVG] -> iOS не понимает SVG в этой роли, на домашнем экране дефолтная заглушка -> [🟢 apple-touch-icon.png 180×180 с непрозрачным фоном]
- [🔴 «Сломанный» rocket.spec списали на тест-дрифт] -> тест честно ловил регрессию: тернарник видимости stats-блока сплющен в статичный `opacity-100 visible` (ещё до baseline), ракета висела поверх «€0/0h» -> [🟢 условная видимость восстановлена + data-testid вместо хрупких классов в селекторе; падающий тест сперва подозревать в правоте, потом в дрейфе]
- [🔴 Автосейв редактора debounce 600мс + clearTimeout в cleanup] -> закрытие модалки (тап по фону / свайп вниз) до срабатывания таймера тихо теряло правку часов; свежий день с дефолтными «10h/€150» выглядел записанным, хотя ничего не сохранено -> [🟢 pendingSaveRef хранит незасейвленную правку, closeEditor() flush'ит её перед setEditorDate(null); ref сбрасывается на open/close — закрытый день не пересейвится повторно. Незаписанный дефолт честен визуально: подзаголовок «Not Saved Yet» (--danger) для дат без записи в allEntries, флипается на «Log Work Hours» после автосейва. allEntries уже в сторе → менять App не пришлось]
- [🔴 Playwright-селектор `page.mouse.click(10,10)` для тапа по фону] -> на десктопном вьюпорте (#frame центрирован, min-width:640px) координата попадает в letterbox ВНЕ фрейма, модалка не закрывается -> [🟢 кликать сам элемент фона `.bg-black/70` с position в верхней зоне (над bottom-sheet); не полагаться на абсолютные экранные координаты при центрированном фрейме]
- [🔴 «Строгий CSP `script-src 'self'`» без аудита фронта] -> сломал бы прод по трём осям: Epilogue с Google Fonts CDN, инлайн-`onload` на preload-линке шрифта (блокирует строгий script-src), инлайн-стили framer-motion (нужен `style-src 'unsafe-inline'`) -> [🟢 самхост шрифта (`@fontsource-variable`, `font-src 'self'`) + убрать CDN/onload из index.html; `style-src 'unsafe-inline'` обязателен пока в стеке motion/recharts; CSP проверять на РЕАЛЬНОЙ сборке под самим CSP (dist за сервером с заголовком + console на violations), не «на глаз» по спеке]
- [🔴 `@fontsource-variable` регистрирует семейство `«Epilogue Variable»`, не `«Epilogue»`] -> литеральные `font-['Epilogue']` (App.tsx loading-экран) и `fontFamily="Epilogue"` (SVG Logo) молча упали бы в sans-serif -> [🟢 перед свитчем шрифта грепать ВСЕ литеральные имена семейства, не только `--font-sans`; обновить каждое]
- [🔴 Соблазн добавить HSTS в vercel.json] -> Vercel уже шлёт `Strict-Transport-Security` сам → был бы дубль-заголовок -> [🟢 `curl -I` прода ПЕРЕД добавлением любого security-заголовка; не дублировать то, что ставит платформа]
```

## 🤖 AUTO-LEDGER PROTOCOL
После закрытия карты агент обязан: добавить строку в Ledger (формат выше), отметить карту в «Прогресс», добавить строку в Журнал, закоммитить.

## 📝 Журнал работ
| Дата | Карта | Модель | Итог |
|---|---|---|---|
| 2026-07-07 | P0-0 | Fable 5 | git init в папке проекта (репо в C:/Users/Zephyrus — ошибка, проект был вне git), baseline `acfc3e8`, 100 файлов, ветка fixes/p0 |
| 2026-07-07 | P0-1 | Fable 5 | define удалён, хук → fetch /api/insight, @google/genai удалён (сервер на REST), ключа в dist нет. Попутно: чужая правка сломала синтаксис vite.config.ts — починено. Коммит `f9acf45` |
| 2026-07-07 | P0-2 | Fable 5 | ensureAuth() (анонимная сессия), upsert по (user_id,date), delete-all при пустой базе удалён, supabase/schema.sql с RLS. ⚠️ Пользователь должен применить schema.sql в Supabase и включить Anonymous sign-ins. Коммит `2a75e86` |
| 2026-07-07 | P0-3 | Fable 5 | Amnesia-листенер и Fortress-патчи удалены из App.tsx, chaos-биндинги из store, Chaos Lab UI из Settings, public/chaos/ удалён (SW прекэшировал его юзерам: 36→32 файла). strictOfflineMode остался и честно отключает sync+AI. Лейблы переименованы. Коммит `b659440` |
| 2026-07-10 | Аудит ядра | Fable 5 | Пре-деплой аудит: 5 критикалов (тост-спам фонового синка, удаления не доезжают до облака, sync без restore, UTC-«сегодня», upsert всей таблицы на каждый автосейв) + 12 рефакторов. Созданы карты D1-D4, P2-3; выставлен деплой-гейт D1+D3+P1-1+P0-4 |
| 2026-07-11 | D1 | Fable 5 | Sync v2: `syncWithSupabaseAction({silent})` — фон (interval, после сейвов) молчит и не пытается синкать офлайн; interval не создаётся при `!supabase`; тост «Entry saved» убран (индикатор в модалке остался); синк после сейва — debounce 10с; новые `deleteEntryFromCloud(date)`/`clearCloudData()` зовутся из deleteEntry/clearAllData; Undo — тихий ресинк. Ворота ✅; вживую: без .env сейв/автосейв/удаление — 0 error-тостов, ручной Sync — понятный тост. Сценарий с живым Supabase (строка исчезает из таблицы) проверить после P0-4. EditorModal не тронут |
| 2026-07-11 | D3 | Fable 5 (по решению владельца вместо Sonnet) | Все 7 пунктов: локальное «сегодня» в CalendarScreen; `{hours > 0 &&}` вместо `hours &&`; setMonth без мутации store-даты (4 места CalendarScreen + 2 HomeScreen); мёртвый код из App вычищен (syncQueue, isSyncing, setEntries/setYearEntries, handleEditorSave + проп saveEntry из CalendarScreenProps, импорты Entry/ChevronLeft/Logo/useMemo/DOW_NAMES; useRef и supabase теперь живые после D1 — оставлены); toggleTheme без ручного className/db.setSetting; сплэш без setTimeout(1200); haptic={h} у EditorModal. Ворота ✅; вживую: стрелки Home и Calendar в обе стороны, «сегодня»=11 подсвечен, «0» в клетках нет. Playwright: app/save/animations проходят; rocket+wand падали и на baseline (тест-дрифт, вне карты) |
| 2026-07-12 | P0-4 (частично) | Пользователь + Fable 5 (гид) | Supabase: старая `work_entries` дропнута, schema.sql применён (таблица `(user_id,date)` + 4 RLS-политики), Anonymous sign-ins включён. Vercel: env var НЕ задана — новый проект ещё не деплоился; старый деплой от 2026-04-08 собран до P0-1 → ключ Gemini в публичном бандле, владельцу нужно ОТОЗВАТЬ старый ключ в AI Studio и создать новый. `GEMINI_API_KEY` задать при деплое (после P1-1), затем финальный Verify (2 браузера + AI-инсайт на проде) |
| 2026-07-12 | P1-1 | Fable 5 (worktree от baseline, по старой версии карты) | E2EE-лейбл удалён из SettingsScreen целиком (новая карта предлагала замену на «Privacy & Offline» — по факту убран, честно в обоих вариантах); e2eeEnabled/e2eeKey → @deprecated; html2canvas убран из manualChunks; haptic={h} у EditorModal (совпало с D3); express/dotenv в deps уже отсутствовали. Подзаголовок возвращён как «Privacy & Offline» (все блоки Settings имеют подзаголовок — UX-консистентность), ключ словаря переименован в RUS/GR. Смержено в main вместе с fixes/p0. lint+build ✅ |
| 2026-07-12 | D2 (вариант a — выбор владельца) | Fable 5 | `restoreFromCloudAction` в useSupabaseSync: pull всех строк user_id → вставка дат, отсутствующих локально; при конфликте локальная запись побеждает (у Entry нет меток времени — LWW по updated_at невозможен без изменения схемы, отклонение от спеки задокументировано в Ledger). Кнопка «Restore from Cloud» в блоке Cloud Sync (+ RUS/GR ключи: Restore from Cloud / Entries restored / Nothing to restore); тосты результата в App-обёртке, после restore — loadEntries. App.tsx тронут вне вайтлиста карты (проброс пропа — иначе кнопку не подключить). Ворота ✅; Playwright (реальный Chromium): кнопка видна/активна, без .env — понятный error-тост, в Strict Offline — disabled. Сценарий с живым Supabase — после P0-4, как у D1 |
| 2026-07-12 | P1-2 | Fable 5 | `"strict": true` в tsconfig. Ключевое: в проекте отсутствовали @types/react/@types/react-dom — добавлены в devDeps (без них strict невозможен, весь JSX был any). Починено типами (0 × `as any`): CalendarScreenProps settings/setSettings → AppSettings; AnalyticsScreen aiLangOverride → `AppSettings['language'] \| null`; SettingsScreen lastSynced → `string \| null`; useTrends months — явный тип; useAppStore merge настроек через типизированный helper (`keyof AppSettings`); recharts Tooltip formatter → `Number(value ?? 0)`; perf-reporter `Suite \| undefined`. Удалён мёртвый проп exportLogoPNG из SettingsScreenProps (нигде не передавался и не использовался). Ворота ✅ |
| 2026-07-12 | D4 | Fable 5 | useTrends: месяцы графика по settings.language (словарь выбирается внутри хука — settings уже параметр, сигнатуру не менял; language добавлен в deps useMemo). useTranslation RUS/GR: 'Strict Offline Mode', 'Disable cloud sync & AI requests' + 'Blocked by Paranoia Mode' (тоже висел без перевода в оверлее Cloud Sync); ключи D2/P1-1 были добавлены своими картами. Ворота ✅; Playwright: ENG 'Jul' / RUS 'Июл'+переведённый тумблер / GR 'Ιού' — все три языка живьём |
| 2026-07-12 | Аудит-2 (security+core+journey) | Fable 5 | Security: /api/insight открыт (origin/лимиты/инъекция в промпт) → карта S-1 (деплой-блокер); нет security headers → S-3; XSS-векторов нет (innerHTML/eval — 0), RLS корректен, .env-гигиена ок. Core: write-амплификация сейвов (→P2-3), полный upsert на каждый синк (→D5), AI-кэш по history-строке, navClicks ререндерит всё дерево (→P2-4), haptic в App-экшенах игнорирует настройку (→FX-1). Journey (Playwright, 11 скриншотов, mobile): закрытие редактора <600мс после правки молча теряет её + дефолт «10h/€150» выглядит записанным (→UX-1). Починено сразу: литеральный «\n» в Settings UI; ErrorBoundary больше не сносит supabase-сессию при Reset (sb-* ключи сохраняются). Ворота ✅ |
| 2026-07-13 | Деплой | Пользователь + Fable 5 | GitHub-репо `georgiosxristianidis-a11y/work-tracker-pro` (public) создан из `main` (история проверена — секретов нет, только .env.example); default branch → main. Vercel подключён владельцем через дашборд, env `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` заданы, `GEMINI_API_KEY` намеренно пропущен (после S-1). Прод: https://work-tracker-pro-kohl.vercel.app — живой. Smoke-verify (Playwright): манифест PWA ок, ключа Gemini в бандле нет, /api/insight отвечает 500 «API key not configured» (ожидаемо), навигация по 4 экранам работает. Найден и починен реальный prod-баг: `motion.circle`/`motion.line` в Navigation.tsx без `initial` — race condition в production-сборке (НЕ воспроизводится на dev-сервере), intermittent (0–20 console errors между прогонами) → `initial={false}` на все 4 анимируемых SVG-элемента; 5/5 повторных прогонов против локальной prod-сборки — чисто. Ворота ✅; коммит и redeploy — следующим шагом |
| 2026-07-15 | PWA-иконки (вне карт) | Fable 5 | Chrome не давал установку: единственная иконка манифеста — icon.svg sizes:'any' (installability требует числовой размер ≥144px). Нарезаны из icon.svg через sharp: pwa-192/512 (any), pwa-maskable-512 (full-bleed фон, лого 80%), apple-touch-icon 180 (iOS не ест SVG). Манифест в vite.config.ts → 3 PNG-записи; index.html → PNG apple-touch-icon; мёртвый корневой manifest.json удалён. Установка в Chrome с лого «27» подтверждена владельцем ✅. Смержено в main из worktree gate-status-test-fixes (дубли P1-1 из ветки отброшены в пользу main) |
| 2026-07-15 | Rocket zero-state (вне карт, репорт владельца с телефона) | Fable 5 | Ракета «Start Work» перекрывала видимые «€0/0h»: в HomeScreen.tsx:110 условие видимости stats-блока было сплющено в статичный `opacity-100 visible` (до baseline; апрельский прод — ещё без бага). Восстановлен тернарник по totalHours===0 + data-testid="monthly-stats"; rocket.spec переведён на testid и СНОВА ЗЕЛЁНЫЙ (не дрейф — ловил регрессию). Диагноз: покадровый Playwright-трейс на Pixel 7 эмуляции против prod-сборки (float/tap/навигация работали, дефект чисто визуальный). Полный набор: 7/8, падает только wand.spec (известный дрейф). Ворота ✅ |
| 2026-07-15 | FX-1 | Fable 5 | `h` обёрнут в useCallback([settings.hapticEnabled]); 4 вызова глобального `haptic()` в saveEntry/saveMultipleEntries/deleteEntry/handleOpenQuickFill → `h()`; deps haptic→h. Вибрация теперь уважает настройку во всех экшенах App. Ворота ✅; suite 7/8 (только wand). Урок: первый прогон дал ложные 4/8 — таймауты от нагрузки машины (3м vs 48с), baseline-сверка отделила флейк от регрессии |
| 2026-07-20 | S-3 (Вариант A) | Opus 4.8 | Security headers через **новый `vercel.json`**: CSP (`default-src 'self'`; `script-src 'self'` — строгий, без unsafe-inline; `style-src 'self' 'unsafe-inline'` — обязателен из-за инлайн-стилей framer-motion; `font-src 'self'`; `img-src 'self' data: blob:`; `connect-src 'self' https://*.supabase.co`; `manifest-src/worker-src 'self'`; `frame-ancestors 'none'`; `base-uri/form-action 'self'`; `object-src 'none'`) + `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, минимальный `Permissions-Policy`. HSTS НЕ дублировал — Vercel уже шлёт `max-age=63072000; includeSubDomains; preload` (сверено `curl -I` прода). Самхост Epilogue: `@fontsource-variable/epilogue@5.3.0` (import `wght.css`), `--font-sans` → `"Epilogue Variable"`, из `index.html` убраны 4 Google-Fonts-строки + инлайн `onload`; литералы `Epilogue` в `App.tsx`/`Logo.tsx` переименованы (закрывает шрифт-пункт P2-4). Weights: грузятся только используемые (variable-файл, все веса; unused 600/800 CDN больше не тянутся). Ворота ✅; **проверка под самим CSP** (dist за node-сервером с реальным заголовком CSP, реальный Chromium): 0 CSP-violations, Epilogue грузится через `font-src 'self'`, навигация+редактор+motion работают; app+save 4/4. Владельцу: после деплоя проверить securityheaders.com ≥ A + включить Vercel WAF/rate-limit на `/api/*` (хвост S-1). |
| 2026-07-20 | UX-1 | Opus 4.8 | EditorModal: честная модель сохранения. (1) Data-loss: закрытие модалки (тап по фону + свайп вниз) до 600мс-автосейва теряло правку → `pendingSaveRef` + `closeEditor()` flush'ит отложенный сейв перед закрытием; ref сбрасывается на open/close (нет ложного пересейва закрытого дня). (2) Незаписанный дефолт: подзаголовок «Not Saved Yet» (--danger) для дат без записи в `allEntries`, флип на «Log Work Hours» после автосейва. Только `EditorModal.tsx` (allEntries уже в сторе → App не тронут; проброс не нужен). Ворота ✅ (lint+build); Playwright (реальный Chromium): правка+быстрое закрытие <600мс — значение сохраняется, «Not Saved Yet» на свежем дне — PASS. save+app специи 4/4 (регрессии нет). Урок в Ledger: `mouse.click(10,10)` промахивается мимо центрированного #frame |
| 2026-07-15 | S-1 | Fable 5 | api/insight.ts: Origin/Referer-гейт (прод-домен; localhost/preview только при VERCEL_ENV≠production) → 403 без деталей; targetLang — allowlist EN/RU/GR → 400; history — только непустая строка, обрезка 4000 симв.; лимит тела 10KB (content-length + фактическая длина) → 400. Клиент шлёт ровно эти значения (useAiInsight langMap), UX не тронут. Verify: handler прогнан напрямую в Node с мок-Request (esbuild-транспиляция), 9/9 сценариев PASS. Владельцу: включить Vercel WAF/rate-limit на /api/* + задать GEMINI_API_KEY (хвост P0-4) — AI-инсайты можно включать |
