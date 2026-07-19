import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("loads only the Alexandria weights used by the site with font-display swap", async () => {
  const css = await readFile(new URL("app/globals.css", root), "utf8");

  for (const weight of [400, 500, 700, 800]) {
    const face = new RegExp(`@font-face \\{[^}]*font-weight:${weight};[^}]*font-display:swap;[^}]*\\}`);
    assert.match(css, face);
    await access(new URL(`public/fonts/alexandria-arabic-${weight}-normal.woff2`, root));
  }

  assert.doesNotMatch(css, /alexandria-arabic-(?:300|600)-normal/);
});
