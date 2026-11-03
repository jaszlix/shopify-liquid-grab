# Shopify Liquid Grab

Point at any element in your local Shopify theme preview and hand it to your coding agent (Claude Code, Cursor, Codex, Copilot…) together with **where it lives in your theme**: the Liquid section file, the JSON template or section group, the section key and the DOM path.

Built on **[React Grab](https://github.com/aidenybai/react-grab) by [Aiden Bai](https://github.com/aidenybai)**. React Grab gives React apps "copy element for your agent". Shopify themes are Liquid, not React, so this adds a Shopify plugin, a click-to-comment workflow and a one-command installer.

```txt
Make this button bigger and rounder
[<a class="btn" href="/collections/all">Shop now</a> selector: …]

[Shopify theme context]
page: /
template: index (templates/index.json)
section: "hero" in templates/index.json
section file: sections/hero-banner.liquid
dom path: section.hero > div.hero__content > div.hero__actions > a.btn
```

## Install

Run this in your theme folder (the one with `layout/`, `sections/`, `snippets/`):

```bash
npx github:jaszlix/shopify-liquid-grab init
```

This:

1. copies `snippets/liquid-grab.liquid` into your theme
2. adds `{%- render 'liquid-grab' -%}` before `</body>` in `layout/theme.liquid`

Then start your preview as usual:

```bash
shopify theme dev
```

and open **http://127.0.0.1:9292**.

> **Safe in production.** The script only runs when the page is opened at `127.0.0.1` or `localhost` (that is, through `shopify theme dev`). It never loads in the theme editor or for your shoppers, so it's fine to publish a theme with it installed.

## Use it

| What you want | Do this |
| --- | --- |
| Copy an element **with a note** | Press **Alt+C** (Option+C on Mac) or click the React Grab toolbar button, **click** the element, type your note, press **Enter** or the **↑** arrow |
| Copy an element instantly, no note | Hover it and press **Ctrl+C** (⌘C on Mac) |
| Cancel | **Esc** |
| Turn selection off | **Alt+C** again |

Paste the clipboard into your agent and ask for the change.

### Send grabs straight to Claude Code (optional)

React Grab ships an MCP server. Once it's connected, every grab is sent to your agent automatically, so you can say *"check my grab"* instead of pasting.

```bash
npx github:jaszlix/shopify-liquid-grab mcp
```

This runs `claude mcp add react-grab-mcp -- npx -y @react-grab/mcp --stdio`. For other agents, add an MCP server with command `npx` and args `-y @react-grab/mcp --stdio`. The browser talks to it on `http://localhost:4723`. If the server isn't running, the snippet skips this step.

## Point grabs at the exact file

Shopify doesn't expose a section's file name in the storefront HTML. By default a grab reports the section **key** and the JSON file that defines it, which is enough for an agent to look up the `type` and open `sections/<type>.liquid`.

To name the file directly, add `data-grab-source` to the section's root element:

```liquid
<section class="hero" data-grab-source="sections/hero-banner.liquid">
```

Nested elements inherit the closest `data-grab-source`, so you can tag snippets too:

```liquid
<div class="product-card" data-grab-source="snippets/product-card.liquid">
```

## Other commands

```bash
npx github:jaszlix/shopify-liquid-grab status   # check the snippet and render tag
npx github:jaszlix/shopify-liquid-grab remove   # uninstall from the theme
npx github:jaszlix/shopify-liquid-grab init ./path/to/theme --layout password   # another folder or layout
npx github:jaszlix/shopify-liquid-grab init --force   # update an existing snippet
```

## How it works

- `snippets/liquid-grab.liquid` loads [React Grab](https://github.com/aidenybai/react-grab) (`react-grab@0.2.0` from unpkg) on local hosts only.
- A React Grab plugin appends the Shopify context to every copy, using `.shopify-section` wrappers, `shopify-section-group-*` classes, Liquid's `template` object and any `data-grab-source` attributes.
- On activation it arms React Grab's built-in comment mode, so clicking opens the note box. Your note is put first in the copied text.
- When the React Grab MCP server is reachable on `localhost:4723`, copies are also POSTed to it, the same way `@react-grab/mcp`'s client does.

## Credits

- **[React Grab](https://github.com/aidenybai/react-grab)** by **[Aiden Bai](https://github.com/aidenybai)** and contributors (MIT). This project uses React Grab's selection engine, overlay, comment box and plugin API, and its MCP server ([`@react-grab/mcp`](https://www.npmjs.com/package/@react-grab/mcp)). React Grab is loaded from its published npm build and isn't bundled or modified here.
- Shopify Liquid Grab (the Shopify plugin, shortcuts and installer) by [jaszlix](https://github.com/jaszlix).

## License

MIT. See [LICENSE](LICENSE).
