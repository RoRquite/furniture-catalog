# Furniture Catalog — Telegram Mini App (MVP)

Демонстрационный каталог мебели для Telegram Mini App.
**Zero-dependency stack:** vanilla ES-модули + `node:test`. Данные помечены
`demo: true` и не являются реальными товарными предложениями.

## Установка и запуск

```bash
cd furniture_catalog
npm run build      # валидация данных + сборка dist/
npm run dev        # http://localhost:8123  (build + dev server)
npm test           # 15 E2E-проверок ядра (node:test)
```

Требуется только Node.js ≥ 18. `npm install` не нужен.

## Структура

```text
furniture_catalog/
├── frontend/
│   ├── index.html            # точка входа (+ telegram-web-app.js)
│   ├── css/styles.css        # mobile-first стили
│   └── js/
│       ├── app.js            # bootstrap: данные → router → UI
│       ├── core/router.js    # экраны + история (настоящий стек навигации)
│       ├── core/favorites.js # избранное (localStorage)
│       ├── core/order.js     # текст заказа + передача на контакт
│       ├── core/telegram.js  # WebApp API wrapper с browser-fallback
│       └── ui/render.js      # рендер экранов
├── data/                     # categories.json, products.json, config.json
├── public/images/            # локальные demo-SVG (никаких внешних URL)
├── scripts/                  # build / dev-server / генерация изображений
└── tests/e2e.test.mjs        # 15 проверок ядра
```

## Формат данных

Товар:
```json
{"id": "furniture-001", "category": "tables", "name": "...",
 "description": "...", "price": "1 890 000", "currency": "UZS",
 "image": "images/p_furniture-001.svg", "features": ["..."]}
```
Категория: `{id, name, image}`. Контакт заказа — `data/config.json →
order.contactUrl` (сейчас placeholder, см. ниже).

## Добавить товар

1. Добавьте объект в `data/products.json` (уникальный `id`, существующий
   `category`, поля по контракту выше).
2. Положите изображение в `public/images/`.
3. `npm run build` — валидатор проверит контракт и соберёт `dist/`.

## Добавить категорию

Добавьте категорию в `data/categories.json` + изображение. Экран категории
и переходы появятся автоматически.

## Подключение Telegram

1. Разместите содержимое `dist/` на публичном HTTPS (например static hosting).
2. @BotFather → `/newbot` или существующий бот →
   `/setmenubutton` / Bot Settings → Menu Button → URL приложения.
3. Замените `order.contactUrl` в `data/config.json` на реальный
   `https://t.me/<ваш контакт>` и пересоберите.
4. Откройте бота → кнопка меню запускает Mini App внутри Telegram.

В обычном браузере приложение работает без Telegram API (dev-fallback:
кнопка «← Назад» в интерфейсе вместо системной BackButton).

## Ограничения MVP

- Только клиентское состояние; избранное живёт в localStorage устройства.
- Оплата/авторизация/корзина/БД — сознательно не входят в MVP.
- Изображения — сгенерированные SVG-заглушки (позже заменит AI Factory).
- Реальный Telegram-smoke требует публичного HTTPS и токена бота — внешний
  prerequisite (см. REPORT_MVP.md).
