import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/home-client.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("header compacts only when the scroll threshold changes", () => {
  assert.match(home, /const \[headerCompact, setHeaderCompact\] = useState\(false\)/);
  assert.match(home, /const nextHeaderCompact = window\.scrollY >= 96/);
  assert.match(home, /setHeaderCompact\(\(current\) => current === nextHeaderCompact \? current : nextHeaderCompact\)/);
  assert.match(home, /className=\{headerCompact \? "header compact" : "header"\}/);
  assert.equal((home.match(/addEventListener\("scroll"/g) ?? []).length, 1);
});

test("desktop and mobile header sizes transition without hiding controls", () => {
  assert.match(styles, /\.nav-wrap \{ height:84px;[^}]*transition:height \.22s ease;/);
  assert.match(styles, /\.header\.compact \.nav-wrap \{ height:64px; \}/);
  assert.match(styles, /\.header\.compact \.brand \{ width:166px; height:56px; \}/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.header\.compact \.nav-wrap \{ height:58px; \}[^\n]*\.header\.compact \.brand \{ width:124px; height:48px; \}/);
  assert.match(home, /className="favorite-counter"/);
  assert.match(home, /className="menu-btn"/);
  assert.match(home, /className="nav-contact"/);
});

test("compact mobile menu follows the shorter header", () => {
  assert.match(styles, /\.header\.compact \.nav-links \{ top:58px; \}/);
  assert.match(styles, /\.nav-links\.open \{ display:grid;/);
  assert.match(home, /aria-expanded=\{menuOpen\}/);
});
