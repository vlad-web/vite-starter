# vite-starter

Быстрый старт для вёрстки на Vite: всё уже настроено

## 🚀 Быстрый старт

Клонируйте шаблон без истории коммитов:

```
npx degit <your-username>/vite-starter my-project
cd my-project
npm install
npm run dev
```

Или обычным `git clone` + удалить `.git`:

```
git clone https://github.com/<your-username>/vite-starter.git my-project
cd my-project
rm -rf .git
npm install
npm run dev
```

## 📦 Что внутри

- **Vite** — мультистраничная сборка, каждый `*.html` в `app/` становится отдельной точкой входа автоматически
- **SASS** (indented-синтаксис) — модульная структура: `reset` / `globals` / `helpers` / `blocks`
- **HTML-partials** — `<include src="partials/header.html"></include>` через `posthtml-include`
- **SVG-спрайт** — кладёте иконки в `app/images/icons/`, спрайт собирается сам через `svgo`
- **Оптимизация картинок** при сборке — `vite-plugin-image-optimizer`
- **jQuery + Swiper + Fancybox** — через npm, без CDN и ручных `<script>`
- **ESLint + Prettier + Stylelint** — настроены и прогнаны
- **Алиасы путей** — `@js`, `@scss`, `@images`, `@fonts`

## 📁 Структура

```
app/
  index.html
  partials/       — переиспользуемые куски разметки (header, footer)
  js/             — app.js, точка входа
  sass/
    main.sass
    _reset.sass   — нейтрализация браузерных дефолтов
    _globals.sass — типографика, layout, дизайн-решения проекта
    helpers/      — миксины и брейкпоинты ($laptop, $tablet, $mobile)
    blocks/       — стили отдельных блоков
  images/
    icons/        — svg для спрайта
  fonts/
  public/         — статика без обработки (favicon и т.п.)
```

## 🛠 Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | дев-сервер |
| `npm run build` | продакшн-сборка в `dist/` |
| `npm run preview` | превью собранного билда |
| `npm run lint:js` | ESLint |
| `npm run lint:css` | Stylelint |
| `npm run format` | форматирование Prettier |

## Использование иконок

Файл `app/images/icons/arrow.svg` становится доступен как:

```html
<svg class="icon"><use href="#icon-arrow"></use></svg>
```

## Брейкпоинты в SASS

```sass
@use 'helpers' as *

.block
  @include tablet
    display: none
```

## Требования

- Node.js 18+
- npm (или pnpm/yarn)
