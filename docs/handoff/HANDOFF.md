# 🗂️ WORK TRACKER PRO — HANDOFF (карточный протокол)

> **Агент, читай так:** ① эта шапка → ② `AGENTS.md` (правила, обязательны) → ③ ТОЛЬКО твоя карточка. 
> **Запрещено:** читать файлы вне вайтлиста карточки, сканировать репо, «улучшать заодно». Одна сессия = одна карточка.

| | |
|---|---|
| **Проект** | Work Tracker Pro · PWA учёта рабочих часов |
| **Код** | `C:/Users/Zephyrus/Downloads/qBit/work-tracker-pro` · git: ветка `fixes/p0` (база `main`), дерево чистое |
| **Стек** | React 19 · Vite 6 · Tailwind v4 · Zustand · IndexedDB · Supabase (RLS+anon auth) · Gemini через `/api/insight` |
| **Аудит** | 2026-07-05 (Fable 5) · безопасность после P0: ключ и RLS закрыты |
| **Ворота после каждой карты** | `npm run lint && npm run build` (+ указанный в карте verify) → коммит |

**Прогресс:** 🟩 P0-0 · 🟩 P0-1 · 🟩 P0-2 · 🟩 P0-3 · 🧑 P0-4 (пользователь) · ⬜ P1-1 · ⬜ P1-2 · ⬜ P2-1 · ⬜ P2-2

**Делегирование (решение владельца):** вся хирургия по коду — ТОЛЬКО 🔴 **Lead (Fable/Opus)** в свежей сессии, одна карта на сессию. 🟢 Gemini / 🔵 Sonnet — лишь механика по уже утверждённой Lead'ом спеке (замены классов, словари) и ревью не своего кода. Автор кода ≠ ревьюер.

---

## 🧑 P0-4 — Внешняя инфраструктура · ТОЛЬКО пользователь (агенты не могут)
- **🎯 Цель:** активировать серверную часть P0-1/P0-2.
- **📋 Чек-лист:**
  1. Supabase Dashboard → SQL Editor → выполнить `supabase/schema.sql` (если старая таблица `work_entries` существует — сначала `drop`, см. комментарий в файле).
  2. Supabase → Authentication → Sign In/Up → включить **Anonymous sign-ins**.
  3. Vercel → Project Settings → Environment Variables → задать `GEMINI_API_KEY` (иначе `/api/insight` вернёт 500).
- **🔍 Verify:** запись с двух разных браузеров на одну дату — обе строки живы в таблице; AI-инсайт отвечает на проде.

## 🟠 P1-1 — Честность фич + гигиена deps · 🔴 Lead
- **🎯 Цель:** UI не обещает того, чего нет; конфиг без фантомов; багфикс вибрации.
- **📂 Файлы (актуализировано после P0):**
  - `src/components/SettingsScreen.tsx:94` — подзаголовок Privacy-блока `t('E2E Encryption & Blurring')`: шифрования в коде НЕТ (тумблер отсутствовал изначально) → заменить на честный `t('Privacy & Offline')` или убрать строку.
  - `src/hooks/useTranslation.ts:18,138` — обновить/удалить соответствующий ключ словаря (RUS/GR).
  - `src/constants.ts:34-35,56-57` — `e2eeEnabled`/`e2eeKey` пометить комментарием `@deprecated (never implemented)`, НЕ удалять (миграция сохранённых настроек).
  - `vite.config.ts:60` — убрать `'html2canvas'` из `vendor-pdf` manualChunks (не прямая зависимость; express/dotenv уже отсутствуют — этот пункт карты закрыт сам собой).
  - `src/App.tsx:421` — багфикс: `EditorModal` получает `haptic={haptic}` (сырая функция) → должен получать `haptic={h}`, иначе вибрация в редакторе игнорирует настройку `hapticEnabled`.
- **📏 Правила:** ничего кроме перечисленного.
- **✅ Done:** grep `-i "e2e"` по `src/` → только deprecated-поля в constants.ts; сборка без ссылок на html2canvas в manualChunks.
- **🔍 Verify:** ворота; в приложении выключить Haptic Feedback → редактор записей не вибрирует.

## 🟠 P1-2 — TypeScript strict · 🔴 Lead (итеративно)
- **🎯 Цель:** `"strict": true` в `tsconfig.json`; ошибки починены типами.
- **📂 Файлы:** `tsconfig.json`, далее ТОЛЬКО файлы из вывода `npm run lint`.
- **📏 Правила:** чинить типами, не `as any`; если фикс требует изменения поведения — СТОП, доложить владельцу. Известная горячая точка: `(import.meta as any)` в `src/lib/supabase.ts` → использовать `src/vite-env.d.ts`.
- **✅ Done:** `npm run lint` — 0 ошибок при strict; новых `as any` нет.
- **🔍 Verify:** ворота.

## 🟡 P2-1 — Токены → @theme + семантические имена · 🔴 Lead (план+ревью) / механика по спеке Lead
- **🎯 Цель:** цвета как нативные Tailwind-утилиты; конец `bg-[var(--bg)]`-многословию.
- **📂 Файлы:** `src/index.css` (палитру в `@theme`; `--a→--accent`, `--b→--border`, `--t1..t3→--text-1..3`, `--bg-1→--surface`), затем механическая замена классов по `src/components/*` и `src/App.tsx`.
- **📏 Правила:** визуально пиксель-в-пиксель; 3 темы сохраняются; контраст `--t3` на светлой теме поднять до ≥4.5:1; `maximum-scale=1`/`user-scalable=0` убрать из `index.html`.
- **✅ Done:** grep `"var(--a)"` по `src/` → 0; три темы переключаются.
- **🔍 Verify:** ворота + `npx playwright test`.

## 🟡 P2-2 — Гигиена репо · 🔴 Lead (быстрая)
- **🎯 Цель:** корень репо без разового мусора.
- **📂 Файлы:** удалить `temp_modals.txt`, `del.cjs`, `find_emoji.cjs`, `inspect.cjs`, `rebuild.cjs`, `wrap_modals.cjs`, `test.cjs`, `test-toasts.js`, `test-motion.ts`, `selector-test.spec.ts`.
- **📏 Правила:** `scripts/`, `tests/`, все `.md` — НЕ трогать. `playwright-report/`, `test-results/`, `dist/` уже в `.gitignore`.
- **✅ Done:** `ls *.cjs` в корне — пусто.
- **🔍 Verify:** ворота + `npx playwright test`.

---

## 🟩 Закрытые карты (сжато — детали в Журнале и git log)
- **P0-0** `acfc3e8` — проект взят под git (раньше был ВНЕ контроля версий), ветка `fixes/p0`.
- **P0-1** `f9acf45` — ключ Gemini только в `api/insight.ts` (Vercel, `process.env`); клиент → `fetch('/api/insight')`; `@google/genai` удалён.
- **P0-2** `2a75e86` — `ensureAuth()` (анонимная сессия), upsert `(user_id,date)`, delete-all удалён, `supabase/schema.sql` + RLS.
- **P0-3** `b659440` — chaos-код вырезан полностью (App/store/Settings/public/chaos); strictOfflineMode честно отключает sync+AI.

## 🔴 MISTAKE LEDGER (живой лог — пополнять по Auto-Ledger)
```
- [🔴 API-ключ через vite define] -> ключ в клиентском бандле -> [🟢 serverless /api/insight]
- [🔴 upsert onConflict:'date' без auth] -> юзеры перетирают друг друга -> [🟢 RLS + (user_id,date)]
- [🔴 Chaos/dev-код в проде] -> SW прекэшировал chaos-скрипты юзерам (36→32 файла) -> [🟢 удалён; dev-тулзы только за import.meta.env.DEV]
- [🔴 UI-лейбл без логики (E2EE)] -> ложное чувство защиты -> [🟢 фича появляется только с кодом] (закрыть в P1-1)
- [🔴 git init в C:/Users/Zephyrus вместо папки проекта] -> git сканировал весь профиль Windows, команды висли; проект был вне контроля версий -> [🟢 репо в папке проекта; домашний .git снести вручную]
- [🔴 Gemini при удалении define снёс закрытие массива plugins] -> сломанный vite.config.ts -> [🟢 после каждой правки агента: npm run lint && npm run build; диф ревьюит другая модель]
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
