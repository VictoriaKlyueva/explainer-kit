# Формат page: разметка лонгрида

`content.html` содержит только героя и разделы. Оглавление, прогресс чтения, фон и кнопку рисования добавляет кит.

## Каркас

```html
<header class="hero" id="top">
  <div class="eyebrow"><b>Тема</b><span class="dash"></span>Ноябрь 2026<span class="dash"></span>что внутри</div>
  <h1>Заголовок<span class="sub">тезис страницы одной фразой</span></h1>
  <p class="lead">Два-три предложения: о чём страница и что читатель поймёт.</p>
  <div class="plate"> … живая схема, видна сразу … </div>
</header>

<section class="sec" id="s1" data-title="Короткое имя для оглавления">
  <div class="head"><span class="eyebrow"><b>01</b><span class="dash"></span>подзаголовок</span><h2>Заголовок <em>с акцентом</em></h2></div>
  <div class="prose"> <p>…</p> </div>
  <div class="plate"> … </div>
</section>

<section class="sec" id="sN" data-title="Источники"> … <div class="sources"><div><a href="…" target="_blank" rel="noopener">…</a></div></div></section>
```

- `id` разделов нужен оглавлению и проверке: `check.mjs` снимает каждый раздел отдельно.
- Без `data-title` раздел не попадёт в оглавление. Так можно делать врезки между разделами.
- `config.json`: `"brand"` — заголовок над оглавлением, можно с `<em>`. `"toc": false` убирает оглавление.

## Компоненты

| класс | что это |
|---|---|
| `.prose` | колонка текста до 760 px; внутри `p`, `ul.ticks`, `h3`, `.eq` |
| `.lead` | вводный абзац крупнее обычного |
| `.small`, `.label`, `.mono`, `.num` | мелкий текст, ярлык капсом, моноширинный, табличные цифры |
| `.kicker` | финальная фраза раздела, курсивом |
| `ul.ticks` | список с короткими чёрточками вместо точек |
| `.eq` | формула; внутри `<M>…</M>` и подпись `<div class="cap">…</div>` |
| `.plate` | интерактивная плашка, подробно ниже |
| `.tablewrap > table.t` | таблица; `tr.hlrow` — выделенная строка; на телефоне прокручивается вбок |
| `.grid2`, `.grid3` | две или три колонки, на узком экране в одну |
| `.cards > .card` или `.grid3 > .card` | карточки: `.y` или `.tag` (надпись сверху), `h4`, `p`; `.card.warn` — оговорка |
| `.callout`, `.callout.warn` | врезка с рамкой: одна оговорка или неожиданный факт |
| `.flag` | маленькая пометка вроде «оценка» или «слух» |
| `.exhibit` | картинка в рамке, клик открывает лайтбокс |
| `.photo` | фото без обрезки: `<figure class="photo"><div class="frame"><img …></div><figcaption>…</figcaption></figure>` |
| `.sources` | список источников в две колонки |
| `.hl .a2 .warn .extra .muted` | цвет текста из токенов |

## Плашка

```html
<div class="plate">
  <div class="ph"><h4>Название схемы</h4><span class="label" id="x-status">что показывает</span></div>
  <div class="row">
    <div class="btns" id="x-mode"><span class="label">режим</span><button class="on" data-m="a">A</button><button data-m="b">B</button></div>
    <label class="slider">параметр<input type="range" id="x-n" min="0" max="100" value="40"><output></output></label>
  </div>
  <svg class="fig" id="x" viewBox="0 0 1000 360"></svg>
  <p class="note">Допущения, источник цифр, формула оценки.</p>
</div>
```

- `viewBox` шириной 1000 — стандарт. Такие схемы на телефоне прокручиваются вбок (не меньше 720 px), чтобы текст не стал микроскопическим. Если схема должна сжиматься, поставь `data-shrink`.
- Две схемы рядом: `<div class="grid2"><svg class="fig" viewBox="0 0 500 330">…</div>`.
- У каждого `input` есть стабильный `id`.

## Ритм страницы

1. Hero: тезис и схема, которая его показывает.
2. Раздел «проблема или зачем»: почему вообще об этом думать.
3. Механизм по шагам, 2–5 разделов, в каждом одна плашка.
4. Сравнение или контраст: таблица и, может быть, эксперимент.
5. Итог: карточки и кикер.
6. Источники.
