// Gera "pacote Lattes" — texto formatado pronto pra colar nos campos do Lattes.

const MONTH_NAMES_PT_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fullMonth(month) {
  if (!month) return "";
  return MONTH_NAMES_PT_FULL[month - 1];
}

// Para cada tipo, gera um bloco de campos com label e valor pré-formatados.
// O usuário vê este bloco na tela, copia o que precisa e cola no Lattes.
export function lattesPackage({ type, entry }) {
  const e = entry;

  if (type === "academic") {
    return {
      titulo: "Artigo em periódico (Produção Bibliográfica)",
      campos: [
        ["Título do Artigo", e.title],
        ["Autores", e.authors],
        ["Periódico/Revista", e.venue],
        ["Ano", e.year],
        ["Mês", fullMonth(e.month)],
        ["DOI / URL", e.link],
        ["Idioma", "—"],
        ["País", "—"],
      ],
      observacao:
        "No Lattes: Produção → Bibliográfica → Artigos completos publicados em periódicos. Preencha cada campo com o valor correspondente.",
    };
  }

  if (type === "reports") {
    return {
      titulo: "Relatório / Nota Técnica (Produção Técnica)",
      campos: [
        ["Título", e.title],
        ["Autores", e.authors],
        ["Instituição/Projeto", e.venue],
        ["Ano", e.year],
        ["URL", e.link],
        ["Natureza", "Relatório técnico"],
      ],
      observacao:
        "No Lattes: Produção → Técnica → Relatórios de pesquisa. Use 'Outra Produção Técnica' se for nota técnica curta.",
    };
  }

  if (type === "authored_media") {
    return {
      titulo: "Artigo em jornal/revista (Produção Bibliográfica)",
      campos: [
        ["Título", e.title],
        ["Autores", e.authors],
        ["Veículo", e.outlet],
        ["Data", e.date_display || `${fullMonth(e.month)} ${e.year ?? ""}`.trim()],
        ["URL", e.link],
      ],
      observacao:
        "No Lattes: Produção → Bibliográfica → Artigos publicados em jornais e revistas (não científicos).",
    };
  }

  if (type === "talks") {
    return {
      titulo: "Apresentação de trabalho / Palestra (Eventos)",
      campos: [
        ["Título da Apresentação", e.title],
        ["Nome do Evento", e.event],
        ["Local", e.location],
        ["Data", e.date_display || `${fullMonth(e.month)} ${e.year ?? ""}`.trim()],
        ["URL", e.link],
        ["Natureza", "Palestra/Conferência"],
      ],
      observacao:
        "No Lattes: Eventos → Apresentações de Trabalho e Palestras. Escolha entre Conferência ou palestra, Comunicação, etc.",
    };
  }

  if (type === "mentions") {
    return {
      titulo: "Entrevista / Aparição em mídia (Produção Cultural ou Outros)",
      campos: [
        ["Título", e.title],
        ["Veículo", e.outlet],
        ["Formato", e.format],
        ["Data", e.date_display || `${fullMonth(e.month)} ${e.year ?? ""}`.trim()],
        ["URL", e.link],
        ["Afiliação mencionada", e.affiliation],
      ],
      observacao:
        "Lattes não tem campo perfeito pra entrevista. Use Produção Cultural → Outra Produção Cultural OU Outras informações relevantes. Considere também incluir em 'Citações na mídia' se você só foi mencionada.",
    };
  }

  return {
    titulo: "Tipo desconhecido",
    campos: [],
    observacao: "Tipo não mapeado.",
  };
}
