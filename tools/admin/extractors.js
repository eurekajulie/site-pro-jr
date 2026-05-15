// Extrai metadados de uma URL — tenta Crossref (DOI), arXiv, oEmbed, OpenGraph.

import { unfurl } from "unfurl.js";

const MONTH_NAMES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function displayDate(year, month) {
  if (!year) return "";
  if (month) return `${MONTH_NAMES_PT[month - 1]} ${year}`;
  return String(year);
}

function isDOI(s) {
  return /^10\.\d{4,9}\/\S+$/.test(s.trim());
}

function extractDOIFromUrl(url) {
  // doi.org/10.xxxx/yyyy → 10.xxxx/yyyy
  const m = url.match(/(?:doi\.org\/|dx\.doi\.org\/)(10\.[^?#\s]+)/i);
  if (m) return m[1];
  if (isDOI(url)) return url.trim();
  return null;
}

function arxivIdFromUrl(url) {
  // arxiv.org/abs/2401.12345 or arxiv.org/pdf/...
  const m = url.match(/arxiv\.org\/(?:abs|pdf)\/([^?#\s]+?)(?:v\d+)?(?:\.pdf)?$/i);
  return m ? m[1] : null;
}

async function fetchCrossref(doi) {
  const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { "User-Agent": "site-pro-jr-admin/0.1 (mailto:juliec.ricard@gmail.com)" },
  });
  if (!r.ok) throw new Error(`Crossref ${r.status} para ${doi}`);
  const data = await r.json();
  const m = data.message;
  const issued = m.issued?.["date-parts"]?.[0] ?? [];
  const authors = (m.author ?? [])
    .map((a) => `${a.given ?? ""} ${a.family ?? ""}`.trim())
    .filter(Boolean)
    .join(", ");
  return {
    title: Array.isArray(m.title) ? m.title.join(" ") : m.title ?? "",
    authors,
    year: issued[0],
    month: issued[1],
    venue: Array.isArray(m["container-title"]) ? m["container-title"][0] : m["container-title"] ?? "",
    link: m.URL || `https://doi.org/${doi}`,
    suggestedType: "academic",
    source: "crossref",
  };
}

async function fetchArxiv(id) {
  const r = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(`arXiv ${r.status} para ${id}`);
  const xml = await r.text();
  const pick = (re) => {
    const m = xml.match(re);
    return m ? m[1].trim().replace(/\s+/g, " ") : "";
  };
  const title = pick(/<entry>[\s\S]*?<title>([\s\S]*?)<\/title>/);
  const published = pick(/<entry>[\s\S]*?<published>([\s\S]*?)<\/published>/);
  const authors = [...xml.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)].map((m) => m[1].trim()).join(", ");
  const date = published ? new Date(published) : null;
  return {
    title,
    authors,
    year: date?.getUTCFullYear(),
    month: date ? date.getUTCMonth() + 1 : undefined,
    venue: "arXiv (preprint)",
    link: `https://arxiv.org/abs/${id}`,
    suggestedType: "academic",
    source: "arxiv",
  };
}

function suggestTypeFromHostname(host) {
  host = host.toLowerCase();
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "mentions";
  if (host.includes("spotify.com") || host.includes("anchor.fm") || host.includes("soundcloud.com")) return "mentions";
  if (host.includes("nexojornal") || host.includes("folha") || host.includes("g1.globo") || host.includes("uol")) return "mentions";
  if (host.includes("zenodo.org")) return "reports";
  return "mentions";
}

function suggestFormatFromHostname(host) {
  host = host.toLowerCase();
  if (host.includes("youtube") || host.includes("youtu.be") || host.includes("vimeo")) return "Video";
  if (host.includes("spotify") || host.includes("anchor") || host.includes("soundcloud")) return "Audio";
  return "Texto";
}

async function fetchOpenGraph(url) {
  const meta = await unfurl(url, { timeout: 8000, follow: 5 });
  const og = meta.open_graph ?? {};
  const tw = meta.twitter_card ?? {};
  const title = og.title ?? tw.title ?? meta.title ?? "";
  const description = og.description ?? tw.description ?? meta.description ?? "";
  const siteName = og.site_name ?? tw.site ?? "";
  const articlePub = og.article?.published_time;
  let year, month;
  if (articlePub) {
    const d = new Date(articlePub);
    if (!Number.isNaN(d.getTime())) {
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
    }
  }
  const host = new URL(url).hostname.replace(/^www\./, "");
  return {
    title,
    snippet: description.slice(0, 240),
    authors: "",
    year,
    month,
    venue: siteName || host,
    outlet: siteName || host,
    link: url,
    format: suggestFormatFromHostname(host),
    suggestedType: suggestTypeFromHostname(host),
    source: "opengraph",
  };
}

export async function extractMetadata(url, typeHint) {
  if (!url || typeof url !== "string") throw new Error("URL é obrigatória");
  url = url.trim();

  // Tenta Crossref se for DOI
  const doi = extractDOIFromUrl(url);
  if (doi) {
    const meta = await fetchCrossref(doi).catch((e) => {
      console.error("crossref falhou:", e.message);
      return null;
    });
    if (meta) {
      meta.date_display = displayDate(meta.year, meta.month);
      if (typeHint) meta.suggestedType = typeHint;
      return meta;
    }
  }

  // Tenta arXiv
  const aid = arxivIdFromUrl(url);
  if (aid) {
    const meta = await fetchArxiv(aid).catch((e) => {
      console.error("arxiv falhou:", e.message);
      return null;
    });
    if (meta) {
      meta.date_display = displayDate(meta.year, meta.month);
      if (typeHint) meta.suggestedType = typeHint;
      return meta;
    }
  }

  // Fallback: OpenGraph via unfurl
  const meta = await fetchOpenGraph(url);
  meta.date_display = displayDate(meta.year, meta.month);
  if (typeHint) meta.suggestedType = typeHint;
  return meta;
}
