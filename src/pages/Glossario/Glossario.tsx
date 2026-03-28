"use client"

import type React from "react"
import { useState } from "react"
import { Search } from "lucide-react"

interface GlossaryTerm {
  term: string
  abbr?: string
  category: string
  definition: string
}

const glossaryTerms: GlossaryTerm[] = [
  // ── Métricas de custo ───────────────────────────────────────────────────────
  {
    term: "Investimento",
    category: "Custo",
    definition:
      "Valor total gasto em anúncios no período selecionado. É a soma de todos os custos de veiculação das campanhas ativas nas plataformas.",
  },
  {
    term: "CPM",
    abbr: "Custo por Mil Impressões",
    category: "Custo",
    definition:
      "Quanto você paga por cada mil exibições do seu anúncio, independentemente de cliques ou interações. É a métrica padrão de precificação em campanhas de awareness e alcance.",
  },
  {
    term: "CPC",
    abbr: "Custo por Clique",
    category: "Custo",
    definition:
      "Valor médio pago por cada clique no anúncio. Calculado dividindo o investimento total pelo número de cliques. Fundamental para campanhas de tráfego e conversão.",
  },
  {
    term: "CPL",
    abbr: "Custo por Lead",
    category: "Custo",
    definition:
      "Valor médio investido para captar um lead (contato qualificado). Calculado dividindo o investimento total pelo número de leads gerados. Quanto menor, mais eficiente a campanha.",
  },
  {
    term: "CPA",
    abbr: "Custo por Aquisição",
    category: "Custo",
    definition:
      "Valor médio pago por cada conversão ou ação desejada — como um formulário preenchido, agendamento ou contato realizado. Similar ao CPL, mas aplicado a qualquer tipo de ação.",
  },

  // ── Métricas de alcance e entrega ───────────────────────────────────────────
  {
    term: "Impressões",
    category: "Entrega",
    definition:
      "Número total de vezes que o anúncio foi exibido na tela de um usuário. Uma mesma pessoa pode gerar múltiplas impressões ao ver o mesmo anúncio mais de uma vez.",
  },
  {
    term: "Alcance",
    category: "Entrega",
    definition:
      "Número de pessoas únicas que viram o anúncio pelo menos uma vez no período. Diferente das impressões, o alcance conta cada usuário apenas uma vez.",
  },
  {
    term: "Frequência",
    category: "Entrega",
    definition:
      "Número médio de vezes que cada pessoa viu o anúncio. Calculada dividindo impressões pelo alcance. Frequências muito altas podem causar fadiga de anúncio.",
  },

  // ── Métricas de engajamento ─────────────────────────────────────────────────
  {
    term: "CTR",
    abbr: "Taxa de Cliques",
    category: "Engajamento",
    definition:
      "Percentual de pessoas que clicaram no anúncio em relação ao total que o viram (impressões). Fórmula: Cliques ÷ Impressões × 100. Indica o quão relevante e atrativo é o criativo.",
  },
  {
    term: "Cliques",
    category: "Engajamento",
    definition:
      "Número total de cliques registrados no anúncio, incluindo cliques no link de destino, no perfil ou em elementos interativos do criativo.",
  },
  {
    term: "Engajamentos",
    category: "Engajamento",
    definition:
      "Total de interações com o anúncio: curtidas, comentários, compartilhamentos, salvamentos e cliques. Mede o nível de interesse e conexão do público com o conteúdo.",
  },
  {
    term: "Taxa de Engajamento",
    category: "Engajamento",
    definition:
      "Percentual de engajamento em relação ao alcance ou impressões. Indica a proporção de pessoas que interagiram ativamente com o conteúdo ao vê-lo.",
  },

  // ── Métricas de vídeo ───────────────────────────────────────────────────────
  {
    term: "Video Views",
    category: "Vídeo",
    definition:
      "Número de vezes que o vídeo começou a ser reproduzido. Em geral, considera-se uma visualização quando o vídeo é assistido por pelo menos 2 a 3 segundos, variando conforme a plataforma.",
  },
  {
    term: "VTR",
    abbr: "View Through Rate",
    category: "Vídeo",
    definition:
      "Percentual de pessoas que assistiram o vídeo até o final em relação ao total de reproduções iniciadas. Fórmula: Visualizações 100% ÷ Total de Views. Mede a capacidade de retenção do vídeo.",
  },
  {
    term: "Visualizações 25% / 50% / 75% / 100%",
    category: "Vídeo",
    definition:
      "Indica quantas pessoas assistiram o vídeo até cada marco de progresso. A curva de retenção mostra em que ponto o público abandona o conteúdo — útil para identificar onde melhorar a narrativa.",
  },
  {
    term: "Retenção de Vídeo",
    category: "Vídeo",
    definition:
      "Gráfico que mostra o percentual do público que permanece assistindo ao longo do vídeo. Uma queda acentuada no início indica que a abertura não está capturando atenção suficiente.",
  },

  // ── Métricas de Google Search ───────────────────────────────────────────────
  {
    term: "Palavra-chave (Keyword)",
    category: "Google Search",
    definition:
      "Termo ou expressão digitada pelo usuário no Google que aciona a exibição do anúncio. A escolha e organização das palavras-chave é fundamental para que o anúncio apareça para o público certo.",
  },
  {
    term: "Correspondência de Palavra-chave",
    category: "Google Search",
    definition:
      "Define como o Google compara a pesquisa do usuário com a palavra-chave cadastrada. Os tipos são: Exata (termo idêntico), Frase (contém a frase) e Ampla (variações e sinônimos).",
  },
  {
    term: "Avg. CPC",
    abbr: "CPC Médio",
    category: "Google Search",
    definition:
      "Valor médio pago por cada clique nos anúncios de Search. Varia conforme a concorrência pelo termo, o índice de qualidade do anúncio e o lance configurado.",
  },
  {
    term: "Conversões (Search)",
    category: "Google Search",
    definition:
      "Ações valiosas realizadas pelo usuário após clicar no anúncio — como enviar um formulário, ligar para a concessionária ou acessar a página de interesse. Configuradas como metas no Google Ads.",
  },
  {
    term: "Taxa de Conversão",
    category: "Google Search",
    definition:
      "Percentual de cliques que resultaram em uma conversão. Fórmula: Conversões ÷ Cliques × 100. Indica a eficiência da landing page e da experiência pós-clique.",
  },

  // ── Métricas de GA4 / Tráfego ───────────────────────────────────────────────
  {
    term: "Sessões",
    category: "Tráfego (GA4)",
    definition:
      "Conjunto de interações de um usuário com o site durante uma visita. Uma sessão encerra após 30 minutos de inatividade ou à meia-noite. Múltiplas sessões podem ser geradas pelo mesmo usuário.",
  },
  {
    term: "Novos Usuários",
    category: "Tráfego (GA4)",
    definition:
      "Número de visitantes que acessaram o site pela primeira vez no período analisado, com base em identificadores de navegador ou ID de usuário.",
  },
  {
    term: "Visualizações de Página",
    category: "Tráfego (GA4)",
    definition:
      "Total de páginas carregadas ou recarregadas pelo usuário. Inclui visitas repetidas à mesma página. Indica o volume de conteúdo consumido no site.",
  },
  {
    term: "Sessões Engajadas",
    category: "Tráfego (GA4)",
    definition:
      "Sessões em que o usuário ficou no site por mais de 10 segundos, realizou uma conversão ou acessou pelo menos 2 páginas. É uma métrica mais qualitativa que o simples número de sessões.",
  },
  {
    term: "Taxa de Rejeição",
    abbr: "Bounce Rate",
    category: "Tráfego (GA4)",
    definition:
      "Percentual de sessões que não foram consideradas engajadas. No GA4, uma sessão rejeitada é aquela com menos de 10 segundos, sem conversão e com apenas 1 página vista.",
  },
  {
    term: "Eventos (GA4)",
    category: "Tráfego (GA4)",
    definition:
      "Interações específicas do usuário com o site registradas pelo GA4 — como cliques em botões, rolagem da página, envio de formulários, reprodução de vídeos e downloads. Cada evento pode ser configurado como conversão.",
  },

  // ── Conceitos gerais ────────────────────────────────────────────────────────
  {
    term: "Criativo",
    category: "Geral",
    definition:
      "Elemento visual ou audiovisual de um anúncio — pode ser uma imagem estática, vídeo, carrossel ou combinação de texto e mídia. O criativo é o que o usuário efetivamente vê ao ser impactado.",
  },
  {
    term: "Lead",
    category: "Geral",
    definition:
      "Contato qualificado que demonstrou interesse em um produto ou serviço — geralmente ao preencher um formulário, solicitar um test drive ou entrar em contato com a concessionária.",
  },
  {
    term: "Funil de Marketing",
    category: "Geral",
    definition:
      "Modelo que representa as etapas da jornada do consumidor: Topo (Awareness — conhecer a marca), Meio (Consideração — avaliar opções) e Fundo (Conversão — tomar uma decisão de compra).",
  },
  {
    term: "ROAS",
    abbr: "Return on Ad Spend",
    category: "Geral",
    definition:
      "Retorno sobre o investimento em publicidade. Fórmula: Receita gerada ÷ Investimento em anúncios. Um ROAS de 5 significa R$ 5 gerados para cada R$ 1 investido.",
  },
  {
    term: "Campanha Ativa",
    category: "Geral",
    definition:
      "Campanha que apresentou investimento e impressões nos últimos 7 dias. No dashboard, campanhas ativas são destacadas e utilizadas como referência para métricas recentes.",
  },
  {
    term: "Veículo / Plataforma",
    category: "Geral",
    definition:
      "Canal de mídia onde o anúncio é veiculado — como Meta (Facebook/Instagram), TikTok, Google, LinkedIn. Cada plataforma tem características próprias de público, formato e mensuração.",
  },
  {
    term: "Tipo de Compra",
    category: "Geral",
    definition:
      "Define como o espaço publicitário é adquirido. Os principais tipos são: Leilão (auction) — o sistema define quem exibe com base em lances e qualidade; e Reserva (reach & frequency) — compra de volume garantido a um CPM fixo.",
  },
  {
    term: "Placement",
    category: "Geral",
    definition:
      "Local específico dentro de uma plataforma onde o anúncio é exibido — como Feed do Instagram, Stories, Reels, TikTok For You Page, YouTube In-stream, etc. Cada placement tem taxas de entrega e engajamento diferentes.",
  },
]

const CATEGORIES = ["Todos", ...Array.from(new Set(glossaryTerms.map((t) => t.category)))]

const CATEGORY_COLORS: Record<string, string> = {
  "Custo": "bg-red-100 text-red-700",
  "Entrega": "bg-blue-100 text-blue-700",
  "Engajamento": "bg-purple-100 text-purple-700",
  "Vídeo": "bg-orange-100 text-orange-700",
  "Google Search": "bg-green-100 text-green-700",
  "Tráfego (GA4)": "bg-teal-100 text-teal-700",
  "Geral": "bg-gray-100 text-gray-700",
}

const Glossario: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("Todos")

  const filtered = glossaryTerms.filter((item) => {
    const matchCat = activeCategory === "Todos" || item.category === activeCategory
    const q = searchTerm.toLowerCase()
    const matchSearch =
      !q ||
      item.term.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      (item.abbr || "").toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-4">
      {/* ── Hero com vídeo ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl h-44">
        <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
          <source src="/images/jetour-hero.mp4" media="(min-width: 768px)" type="video/mp4" />
          <source src="/images/Jetour_Hero_Mobile.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-2xl flex items-center gap-4">
            <img src="/images/Jetour_logo.svg" alt="Jetour" className="h-8 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Glossário</h1>
              <p className="text-sm text-gray-600">Definições dos termos e métricas do dashboard</p>
            </div>
            <div className="ml-auto">
              <img src="/images/W+E_logo.png" alt="W+E" className="h-7 object-contain opacity-70" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Busca + Filtros ──────────────────────────────────────────────────── */}
      <div className="card-overlay rounded-2xl shadow-lg p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar termos, siglas ou definições..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none bg-white"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeCategory === cat
                  ? "bg-slate-700 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400">{filtered.length} {filtered.length === 1 ? "termo" : "termos"} encontrado{filtered.length === 1 ? "" : "s"}</p>
      </div>

      {/* ── Termos ──────────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((item, index) => (
            <div key={index} className="card-overlay rounded-2xl shadow p-5 flex flex-col gap-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug">{item.term}</h3>
                  {item.abbr && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.abbr}</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] || "bg-gray-100 text-gray-600"}`}>
                  {item.category}
                </span>
              </div>
              {/* Definition */}
              <p className="text-xs text-gray-600 leading-relaxed">{item.definition}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-overlay rounded-2xl shadow p-12 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum termo encontrado para <strong>"{searchTerm}"</strong></p>
          <button onClick={() => { setSearchTerm(""); setActiveCategory("Todos") }}
            className="mt-3 text-xs text-blue-600 hover:underline">
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}

export default Glossario
