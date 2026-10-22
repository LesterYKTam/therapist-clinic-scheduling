import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { generateTokensCss, TOKENS_CSS } from "../../scripts/generate-tokens.mjs";

test("committed tokens.css matches the generator output", () => {
  const { css } = generateTokensCss();
  assert.equal(readFileSync(TOKENS_CSS, "utf8"), css, "tokens.css is stale: run npm run tokens");
});

test("tokens.css defines the core Stillwell tokens", () => {
  const { css } = generateTokensCss();
  for (const name of ["surface-page", "primary", "focus-ring", "status-conflict-bg", "font-sans", "type-time-size", "space-4", "radius-md", "shadow-overlay"]) {
    assert.match(css, new RegExp(`--${name}:`));
  }
});
