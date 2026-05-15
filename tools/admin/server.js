// Admin local — servidor Hono.
// Roda em http://localhost:3000 ao invocar `npm run admin` na raiz do projeto.

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { extractMetadata } from "./extractors.js";
import { saveEntry, getContent } from "./storage.js";
import { lattesPackage } from "./lattes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = new Hono();

app.get("/", async (c) => {
  const html = await readFile(resolve(__dirname, "index.html"), "utf8");
  return c.html(html);
});

app.get("/tokens.css", async (c) => {
  const css = await readFile(resolve(__dirname, "../../src/styles/tokens.css"), "utf8");
  return c.body(css, 200, { "Content-Type": "text/css; charset=utf-8" });
});

app.post("/api/ingest", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "JSON inválido" }, 400);
  }
  const { url, typeHint } = body ?? {};
  try {
    const meta = await extractMetadata(url, typeHint);
    return c.json(meta);
  } catch (e) {
    return c.json({ error: String(e?.message ?? e) }, 400);
  }
});

app.post("/api/save", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "JSON inválido" }, 400);
  }
  try {
    const saved = await saveEntry(body);
    const lattes = lattesPackage(saved);
    return c.json({ saved, lattes });
  } catch (e) {
    return c.json({ error: String(e?.message ?? e) }, 400);
  }
});

app.get("/api/content", async (c) => c.json(await getContent()));

const port = 3000;
serve({ fetch: app.fetch, port });
console.log(`\n  admin local rodando em http://localhost:${port}\n  (Ctrl+C pra parar)\n`);
