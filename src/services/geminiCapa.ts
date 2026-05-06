const API_KEY = process.env.REACT_APP_GEMINI_AI
const MODELS = [
  "gemini-2.5-flash",       // 1K RPM, 10K RPD
  "gemini-2.5-pro",         // 150 RPM, 1K RPD
  "gemini-2.5-flash-lite",  // 4K RPM, ilimitado RPD
  "gemini-2.0-flash",       // 2K RPM, ilimitado RPD
  "gemini-2.0-flash-lite",  // 4K RPM, ilimitado RPD
]

if (!API_KEY) {
  console.error("[geminiCapa] REACT_APP_GEMINI_AI não encontrada. Reinicie o servidor após adicionar ao .env")
}

export interface PeriodTotals {
  spent: number
  impressions: number
  clicks: number
  videoViews: number
  leads: number
  cpm: number
  ctr: number
  cpl: number
}

export interface GeneralTotals {
  spent: number
  impressions: number
  clicks: number
  videoViews: number
  leads: number
}

export interface VehicleMetric {
  name: string
  impressions: number
  clicks: number
  spent: number
  leads: number
  ctr: number
  cpm: number
}

export interface SessionsData {
  current: number
  previous: number
}

export interface CapaInsightResult {
  metricas: string
  veiculos: string
  sessoes: string
}

interface BenchmarkTotals {
  ctr: number
  cpm: number
  cpl: number
}

const fetchBenchmarks = async (): Promise<BenchmarkTotals> => {
  try {
    const url = "https://nmbcoamazonia-api.vercel.app/google/sheets/1R1ehp35FAxdP1vhI1rT-mIYw3h9fuatHMiS__5V6Yok/data?range=Consolidado"
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Benchmark HTTP ${res.status}`)
    const json = await res.json()
    const rows: string[][] = json?.data?.values ?? []
    if (rows.length < 2) return { ctr: 0, cpm: 0, cpl: 0 }

    const headers: string[] = rows[0]
    const parseN = (v: string) =>
      parseFloat((v ?? "").replace(/[R$\s%]/g, "").replace(/\./g, "").replace(",", ".")) || 0

    const impIdx   = headers.findIndex((h) => h.toLowerCase().includes("impression"))
    const clickIdx = headers.findIndex((h) => h.toLowerCase().includes("click"))
    const spentIdx = headers.findIndex((h) => h.toLowerCase().includes("spent") || h.toLowerCase().includes("cost"))
    const leadsIdx = headers.findIndex((h) => h.toLowerCase().includes("lead"))

    let totalImp = 0, totalClicks = 0, totalSpent = 0, totalLeads = 0
    rows.slice(1).forEach((row) => {
      totalImp    += impIdx   !== -1 ? parseN(row[impIdx])   : 0
      totalClicks += clickIdx !== -1 ? parseN(row[clickIdx]) : 0
      totalSpent  += spentIdx !== -1 ? parseN(row[spentIdx]) : 0
      totalLeads  += leadsIdx !== -1 ? parseN(row[leadsIdx]) : 0
    })

    return {
      ctr: totalImp    > 0 ? (totalClicks / totalImp)    * 100  : 0,
      cpm: totalImp    > 0 ? (totalSpent  / totalImp)    * 1000 : 0,
      cpl: totalLeads  > 0 ?  totalSpent  / totalLeads          : 0,
    }
  } catch {
    return { ctr: 0, cpm: 0, cpl: 0 }
  }
}

const callGemini = async (prompt: string): Promise<string> => {
  if (!API_KEY) throw new Error("Chave REACT_APP_GEMINI_AI não definida. Reinicie o servidor.")
  const payload = { contents: [{ parts: [{ text: prompt }] }] }
  let lastError: Error | null = null

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i]
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const status = res.status
        lastError = new Error(`Modelo ${model} indisponível (${status})`)
        if (i < MODELS.length - 1) await new Promise((r) => setTimeout(r, 1500))
        continue
      }
      const json = await res.json()
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text.trim()
      lastError = new Error(`Modelo ${model} sem conteúdo`)
    } catch (err: any) {
      lastError = err
      if (i < MODELS.length - 1) await new Promise((r) => setTimeout(r, 1500))
    }
  }

  throw new Error(lastError?.message || "Todos os modelos Gemini falharam")
}

export const generateCapaInsight = async (
  last7: PeriodTotals,
  prev7: PeriodTotals,
  general: GeneralTotals,
  vehicles: VehicleMetric[],
  sessions: SessionsData,
): Promise<CapaInsightResult> => {
  console.log("[geminiCapa] Veículos recebidos:", vehicles.map((v) => `${v.name}: ${Math.round(v.impressions)} imp, ${v.leads} leads`))
  console.log("[geminiCapa] Leads 7d:", last7.leads, "| Sessões:", sessions.current, "vs", sessions.previous)
  const bench = await fetchBenchmarks()

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} mi` : n >= 1_000 ? `${(n / 1_000).toFixed(1)} mil` : String(Math.round(n))
  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
  const pct = (a: number, b: number) => {
    if (b === 0) return "—"
    const d = ((a - b) / b) * 100
    return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`
  }
  const vsB = (val: number, bVal: number) => {
    if (bVal === 0) return ""
    const d = ((val - bVal) / bVal) * 100
    return ` (${d >= 0 ? "+" : ""}${d.toFixed(0)}% vs bench)`
  }

  const hasBench = bench.ctr > 0
  const topVehicles = vehicles.slice(0, 5)
  const sessChange = pct(sessions.current, sessions.previous)

  const prompt = `
Você é um analista sênior de mídia digital para uma marca automotiva premium.

Gere EXATAMENTE 3 frases em português, separadas pelo delimitador "|||", sem numeração, sem título, sem aspas extras:

FRASE 1 — MÉTRICAS GERAIS (máx. 50 palavras):
Comece contextualizando o período analisado (últimos 7 dias de mídia paga da Jetour), depois leia o principal movimento das métricas vs período anterior e vs benchmark. Seja específico com números e variações.

FRASE 2 — VEÍCULOS (máx. 50 palavras):
Comece com "Nos veículos," e faça uma leitura dos principais canais em termos de impressões, CTR e leads — identifique quem está puxando para cima e quem está arrastando os resultados, com números.

FRASE 3 — SESSÕES (máx. 40 palavras):
Comece com "No GA4," e leia o que está acontecendo com as sessões — variação vs semana anterior e o que isso pode indicar sobre o comportamento de tráfego gerado pela mídia.

---

DADOS — ÚLTIMOS 7 DIAS:
Investimento: ${fmtBRL(last7.spent)} (vs anterior: ${pct(last7.spent, prev7.spent)})
Impressões: ${fmt(last7.impressions)} (vs anterior: ${pct(last7.impressions, prev7.impressions)})
Leads: ${fmt(last7.leads)} (vs anterior: ${pct(last7.leads, prev7.leads)})
CTR: ${last7.ctr.toFixed(2)}%${hasBench ? vsB(last7.ctr, bench.ctr) : ""} | anterior: ${prev7.ctr.toFixed(2)}%
CPM: ${fmtBRL(last7.cpm)}${hasBench ? vsB(last7.cpm, bench.cpm) : ""} | anterior: ${fmtBRL(prev7.cpm)}
CPL: ${last7.leads > 0 ? fmtBRL(last7.cpl) : "sem leads"}${hasBench && bench.cpl > 0 ? vsB(last7.cpl, bench.cpl) : ""} | anterior: ${prev7.leads > 0 ? fmtBRL(prev7.cpl) : "sem leads"}

BENCHMARK HISTÓRICO DA CONTA:
CTR: ${bench.ctr > 0 ? bench.ctr.toFixed(2) + "%" : "indisponível"}
CPM: ${bench.cpm > 0 ? fmtBRL(bench.cpm) : "indisponível"}
CPL: ${bench.cpl > 0 ? fmtBRL(bench.cpl) : "indisponível"}

CONTEXTO GERAL ACUMULADO:
Investimento total: ${fmtBRL(general.spent)} | Leads totais: ${fmt(general.leads)}

VEÍCULOS (últimos 7 dias, por impressões):
${topVehicles.map((v) =>
  `- ${v.name}: ${fmt(v.impressions)} imp | CTR ${v.ctr.toFixed(2)}% | CPM ${fmtBRL(v.cpm)} | ${v.leads > 0 ? fmt(v.leads) + " leads" : "0 leads"}`
).join("\n")}

SESSÕES GA4:
Últimos 7 dias: ${fmt(sessions.current)} sessões
7 dias anteriores: ${fmt(sessions.previous)} sessões
Variação: ${sessChange}

---

REGRAS CRÍTICAS:
- Retorne EXATAMENTE 3 frases separadas por "|||" e nada mais
- Nenhuma frase pode ter ponto final duplo ou aspas extras
- Tom analítico, direto, profissional
- Cite números reais dos dados fornecidos
- Não invente dados que não estejam acima
`

  const raw = await callGemini(prompt)
  const parts = raw.split("|||").map((s) => s.trim()).filter(Boolean)

  return {
    metricas: parts[0] ?? "",
    veiculos: parts[1] ?? "",
    sessoes:  parts[2] ?? "",
  }
}
