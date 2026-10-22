// Generates web/app/tokens.css from the Stillwell design tokens.
// Usage: node scripts/generate-tokens.mjs   (npm run tokens)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TOKENS_JSON = resolve(root, "../docs/design/stillwell/design-system/tokens.json");
export const TOKENS_CSS = resolve(root, "web/app/tokens.css");

export function buildTokensCss(tokens) {
  const lines = [];
  let count = 0;
  const add = (name, value) => { lines.push(`  --${name}: ${value};`); count += 1; };

  for (const token of tokens.color.tokens) add(token.name, token.value.light);

  // next/font exposes Inter as --font-inter; the stack keeps the design fallbacks.
  add("font-sans", `var(--font-inter), ${tokens.type.families.sans}`);

  for (const group of tokens.type.groups) {
    for (const style of group.styles) {
      add(`type-${style.name}-size`, style.fontSize);
      add(`type-${style.name}-line`, style.lineHeight);
      add(`type-${style.name}-weight`, String(style.fontWeight));
      if (style.letterSpacing) add(`type-${style.name}-letter-spacing`, style.letterSpacing);
    }
  }

  for (const token of tokens.spacing.tokens) add(token.name, token.value);
  for (const token of tokens.radius.tokens) add(token.name, token.value);
  for (const token of tokens.shadow.tokens) add(token.name, token.value);

  const css = [
    "/* GENERATED FILE - do not edit. Source: docs/design/stillwell/design-system/tokens.json */",
    "/* Regenerate with: npm run tokens */",
    ":root {",
    ...lines,
    "}",
    "",
  ].join("\n");
  return { css, count };
}

export function generateTokensCss() {
  return buildTokensCss(JSON.parse(readFileSync(TOKENS_JSON, "utf8")));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { css, count } = generateTokensCss();
  writeFileSync(TOKENS_CSS, css);
  console.log(`Wrote ${count} tokens to web/app/tokens.css`);
}
