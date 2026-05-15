// Lê e escreve src/data/content.json com escrita atômica (tmp + rename).

import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = resolve(__dirname, "../../src/data/content.json");

const VALID_TYPES = new Set(["academic", "reports", "authored_media", "talks", "mentions"]);

const MONTH_NAMES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function displayDate(year, month) {
  if (!year) return "";
  if (month) return `${MONTH_NAMES_PT[month - 1]} ${year}`;
  return String(year);
}

export async function getContent() {
  const txt = await readFile(CONTENT_PATH, "utf8");
  return JSON.parse(txt);
}

// Normaliza um entry vindo do form pro shape do content.json
function normalize(entry) {
  const e = { ...entry };
  // Limpa strings
  for (const k of Object.keys(e)) {
    if (typeof e[k] === "string") {
      const v = e[k].trim();
      e[k] = v === "" ? undefined : v;
    }
  }
  // Converte year/month pra number
  if (e.year != null && e.year !== "") e.year = parseInt(e.year, 10);
  if (e.month != null && e.month !== "") e.month = parseInt(e.month, 10);
  // Recalcula date_display sempre
  e.date_display = displayDate(e.year, e.month);
  // Remove campos vazios pra manter JSON enxuto
  Object.keys(e).forEach((k) => {
    if (e[k] === undefined || e[k] === null || e[k] === "") delete e[k];
  });
  return e;
}

function sortByDateDesc(arr) {
  arr.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.month ?? 0) - (a.month ?? 0));
}

// Salva entry no array do tipo correspondente em content.json.
// `entry.type` define o destino e não é persistido junto.
export async function saveEntry(entry) {
  const type = entry.type;
  if (!VALID_TYPES.has(type)) {
    throw new Error(`Tipo inválido: ${type}. Use um de: ${[...VALID_TYPES].join(", ")}`);
  }
  const content = await getContent();
  if (!content[type]) content[type] = [];

  const { type: _, ...rest } = entry;
  const normalized = normalize(rest);

  content[type].unshift(normalized);
  sortByDateDesc(content[type]);

  // Escrita atômica: escreve em .tmp e renomeia
  const tmpPath = CONTENT_PATH + ".tmp";
  await writeFile(tmpPath, JSON.stringify(content, null, 2) + "\n", "utf8");
  await rename(tmpPath, CONTENT_PATH);

  return { type, entry: normalized };
}
