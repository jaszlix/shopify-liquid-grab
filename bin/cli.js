#!/usr/bin/env node
/*
 * Shopify Liquid Grab installer.
 *   npx github:jaszlix/shopify-liquid-grab init [themeDir]
 *   npx github:jaszlix/shopify-liquid-grab remove [themeDir]
 *   npx github:jaszlix/shopify-liquid-grab status [themeDir]
 *   npx github:jaszlix/shopify-liquid-grab mcp
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SNIPPET_NAME = "liquid-grab";
const SNIPPET_FILE = `${SNIPPET_NAME}.liquid`;
const RENDER_TAG = `{%- render '${SNIPPET_NAME}' -%}`;
const MARKER = "<!-- shopify-liquid-grab -->";
const SOURCE = path.join(__dirname, "..", "snippets", SNIPPET_FILE);

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const help = () => {
  console.log(`
${c.bold("Shopify Liquid Grab")} — point at an element in your local Shopify preview, hand it to your coding agent.
Built on React Grab by Aiden Bai (https://github.com/aidenybai/react-grab).

Usage:
  npx github:jaszlix/shopify-liquid-grab ${c.green("init")}   [themeDir]   add the snippet and render tag to your theme
  npx github:jaszlix/shopify-liquid-grab ${c.green("remove")} [themeDir]   remove both again
  npx github:jaszlix/shopify-liquid-grab ${c.green("status")} [themeDir]   show what is installed
  npx github:jaszlix/shopify-liquid-grab ${c.green("mcp")}                 connect the React Grab MCP server to Claude Code

themeDir defaults to the current folder (the one with layout/, sections/, snippets/).
Options: --layout <name>  layout file to patch (default: theme)   --force  overwrite an existing snippet
`);
};

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1] === "--layout"));
const command = positional[0];
const themeDir = path.resolve(positional[1] || process.cwd());
const layoutName = option("layout", "theme");

const paths = () => ({
  snippet: path.join(themeDir, "snippets", SNIPPET_FILE),
  layout: path.join(themeDir, "layout", `${layoutName}.liquid`),
});

const assertTheme = () => {
  const missing = ["layout", "snippets"].filter((d) => !fs.existsSync(path.join(themeDir, d)));
  if (missing.length) {
    console.error(c.red(`✖ ${themeDir} does not look like a Shopify theme (missing ${missing.map((d) => d + "/").join(", ")}).`));
    console.error(c.dim("  Run this from your theme folder or pass it: init ./my-theme"));
    process.exit(1);
  }
  if (!fs.existsSync(paths().layout)) {
    console.error(c.red(`✖ layout/${layoutName}.liquid not found. Use --layout <name>.`));
    process.exit(1);
  }
};

const readLayout = () => fs.readFileSync(paths().layout, "utf8");
const hasRender = (src) => src.includes(`render '${SNIPPET_NAME}'`) || src.includes(`render "${SNIPPET_NAME}"`);

const init = () => {
  assertTheme();
  const { snippet, layout } = paths();

  if (fs.existsSync(snippet) && !flag("force")) {
    const same = fs.readFileSync(snippet, "utf8") === fs.readFileSync(SOURCE, "utf8");
    console.log(same ? c.dim(`• snippets/${SNIPPET_FILE} already up to date`) : c.yellow(`• snippets/${SNIPPET_FILE} exists and differs — keeping it (use --force to overwrite)`));
  } else {
    fs.copyFileSync(SOURCE, snippet);
    console.log(c.green(`✔ wrote snippets/${SNIPPET_FILE}`));
  }

  let src = readLayout();
  if (hasRender(src)) {
    console.log(c.dim(`• layout/${layoutName}.liquid already renders the snippet`));
  } else {
    const idx = src.toLowerCase().lastIndexOf("</body>");
    if (idx === -1) {
      console.error(c.red(`✖ no </body> in layout/${layoutName}.liquid — add ${RENDER_TAG} before it yourself.`));
      process.exit(1);
    }
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const insert = `    ${MARKER}${eol}    ${RENDER_TAG}${eol}  `;
    src = src.slice(0, idx).replace(/[ \t]*$/, "") + insert + src.slice(idx);
    fs.writeFileSync(layout, src);
    console.log(c.green(`✔ added ${RENDER_TAG} before </body> in layout/${layoutName}.liquid`));
  }

  console.log(`
${c.bold("Next:")}
  1. ${c.green("shopify theme dev")} and open ${c.bold("http://127.0.0.1:9292")}
  2. Press ${c.bold("Alt+C")} (Option+C on Mac) or the React Grab toolbar button, click an element,
     type a note, press Enter. Or hover + Ctrl/⌘+C to copy without a note.
  3. Paste into your agent. Optional: ${c.green("npx github:jaszlix/shopify-liquid-grab mcp")} so Claude Code
     receives grabs directly.
${c.dim("The script only runs on 127.0.0.1/localhost, never for your shoppers or in the theme editor.")}
`);
};

const remove = () => {
  assertTheme();
  const { snippet, layout } = paths();
  let src = readLayout();
  const before = src;
  src = src
    .split(/\r?\n/)
    .filter((line) => !line.includes(MARKER) && !(line.includes("render") && line.includes(`'${SNIPPET_NAME}'`)))
    .join(src.includes("\r\n") ? "\r\n" : "\n");
  if (src !== before) {
    fs.writeFileSync(layout, src);
    console.log(c.green(`✔ removed render tag from layout/${layoutName}.liquid`));
  } else {
    console.log(c.dim(`• no render tag in layout/${layoutName}.liquid`));
  }
  if (fs.existsSync(snippet)) {
    fs.unlinkSync(snippet);
    console.log(c.green(`✔ deleted snippets/${SNIPPET_FILE}`));
  } else {
    console.log(c.dim(`• snippets/${SNIPPET_FILE} not present`));
  }
};

const status = () => {
  assertTheme();
  const { snippet } = paths();
  const snip = fs.existsSync(snippet);
  const render = hasRender(readLayout());
  console.log(`${snip ? c.green("✔") : c.red("✖")} snippets/${SNIPPET_FILE}`);
  console.log(`${render ? c.green("✔") : c.red("✖")} render tag in layout/${layoutName}.liquid`);
  if (snip && fs.readFileSync(snippet, "utf8") !== fs.readFileSync(SOURCE, "utf8")) {
    console.log(c.yellow("• snippet differs from this version — run init --force to update"));
  }
};

const mcp = () => {
  const cmd = ["mcp", "add", "react-grab-mcp", "--", "npx", "-y", "@react-grab/mcp", "--stdio"];
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["claude"], { encoding: "utf8" });
  if (which.status !== 0) {
    console.log(c.yellow("Claude Code CLI not found. Add this MCP server to your agent manually:"));
    console.log(`  command: npx   args: -y @react-grab/mcp --stdio`);
    console.log(c.dim("  (Claude Code: claude " + cmd.join(" ") + ")"));
    return;
  }
  const r = spawnSync("claude", cmd, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status === 0) console.log(c.green("✔ React Grab MCP added. Restart Claude Code, then ask it to read your latest grab."));
  else console.log(c.yellow("Could not add automatically. Run: claude " + cmd.join(" ")));
};

switch (command) {
  case "init":
  case "install":
    init();
    break;
  case "remove":
  case "uninstall":
    remove();
    break;
  case "status":
    status();
    break;
  case "mcp":
    mcp();
    break;
  default:
    help();
    process.exit(command && !["help", "-h", "--help"].includes(command) ? 1 : 0);
}
