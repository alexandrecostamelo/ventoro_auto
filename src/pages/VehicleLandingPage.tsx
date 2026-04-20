import { useParams, Link } from "react-router-dom";
import { vehicles } from "@/data/mock";
import { formatPrice, formatKm } from "@/utils/formatters";
import { VentoroLogo } from "@/components/VentoroLogo";
import { motion } from "framer-motion";
import {
  Fuel, Gauge, DollarSign, Shield, ShieldCheck, Camera, Sparkles, Star,
  ChevronDown, ChevronRight, MessageCircle, CalendarCheck, Send, Share2,
  Check, X, Car, Wrench, CreditCard, Umbrella, ArrowRight
} from "lucide-react";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const } }),
};

export default function VehicleLandingPage() {
  const { slug } = useParams();
  const vehicle = vehicles.find((v) => v.slug === slug) || vehicles[0];

  // Competitors for comparison
  const competitors = vehicles.filter((v) => v.id !== vehicle.id && v.preco_status !== "acima").slice(0, 2);

  const fullName = `${vehicle.marca} ${vehicle.modelo} ${vehicle.versao} ${vehicle.ano}`;
  const heroHeadline = `O ${vehicle.modelo} que todo mundo queria. Agora ao alcance certo.`;

  // Cost estimates (mock)
  const financing = Math.round(vehicle.preco * 0.7 / 48);
  const insurance = Math.round(vehicle.preco * 0.04 / 12);
  const fuel = 380;
  const maintenance = Math.round(vehicle.preco * 0.025 / 12);
  const totalMonthly = financing + insurance + fuel + maintenance;

  const benefits = [
    { icon: ShieldCheck, title: "Histórico limpo", desc: "Sem registros de sinistros, multas graves ou restrições judiciais. Procedência comprovada." },
    { icon: Camera, title: "Fotos profissionais", desc: "Imagens tratadas pelo VenStudio IA com cenário premium e alta resolução." },
    { icon: Gauge, title: "Quilometragem real", desc: `Apenas ${formatKm(vehicle.quilometragem)} rodados, compatível com o ano e uso declarado.` },
    { icon: DollarSign, title: "Preço competitivo", desc: `Valor ${vehicle.preco_status === "abaixo" ? "abaixo" : "dentro"} da faixa de mercado para o modelo e ano.` },
    { icon: Wrench, title: "Revisões em dia", desc: "Todas as manutenções realizadas na rede autorizada com registros comprovados." },
    { icon: Star, title: "Opcionais completos", desc: `${vehicle.opcionais.length} itens de série e opcionais que elevam conforto e segurança.` },
  ];

  const faqs = [
    { q: "O veículo aceita financiamento?", a: "Sim. Trabalhamos com as principais financeiras do mercado e conseguimos taxas a partir de 1,29% a.m. Simulamos na hora para você." },
    { q: "Quantas chaves acompanham?", a: "O veículo acompanha 2 chaves presenciais completas (original + cópia), ambas em perfeito funcionamento." },
    { q: "O IPVA está pago?", a: "Sim, o IPVA 2025 está integralmente quitado. Documentação 100% regular e sem débitos pendentes." },
    { q: "Aceita troca?", a: "Sim, aceitamos seu veículo como parte do pagamento. Avaliamos na hora com base em valores de mercado atualizados." },
    { q: "As revisões estão em dia?", a: "Todas as revisões foram realizadas na concessionária autorizada, dentro dos prazos recomendados pelo fabricante." },
    { q: "Posso agendar um test-drive?", a: "Claro! Agende diretamente pelo WhatsApp ou pelo botão de agendamento nesta página. Respondemos em menos de 15 minutos." },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scoreComponents = [
    { label: "Fotos verificadas", ok: vehicle.selo_studio_ia },
    { label: "Dados completos", ok: true },
    { label: "Identidade verificada", ok: true },
    { label: "Histórico do anúncio", ok: true },
    { label: "Inspeção visual IA", ok: vehicle.selo_inspecao },
    { label: "Responsividade", ok: true },
  ];

  const comparisonRows: { label: string; key: string; format?: (v: any) => string; winner?: "lower" | "higher" }[] = [
    { label: "Preço", key: "preco", format: formatPrice, winner: "lower" },
    { label: "Quilometragem", key: "quilometragem", format: formatKm, winner: "lower" },
    { label: "Ano", key: "ano", winner: "higher" },
    { label: "Potência", key: "potencia" },
    { label: "Câmbio", key: "cambio" },
    { label: "Combustível", key: "combustivel" },
  ];

  function getWinner(row: typeof comparisonRows[0], allVehicles: typeof vehicles) {
    if (!row.winner) return null;
    const vals = allVehicles.map(v => typeof (v as any)[row.key] === "number" ? (v as any)[row.key] : null).filter(Boolean) as number[];
    if (vals.length === 0) return null;
    return row.winner === "lower" ? Math.min(...vals) : Math.max(...vals);
  }

  const allCompare = [vehicle, ...competitors];

  return (
    <div className="min-h-screen bg-background">
      {/* ===== HERO FULLSCREEN ===== */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        <img src={vehicle.fotos[0]} alt={fullName} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5 md:px-12">
          <Link to="/"><VentoroLogo size="sm" /></Link>
          <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-micro text-white/80">
            Landing Ventoro
          </span>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.h1
            className="text-hero text-white mb-4"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          >
            {heroHeadline.split("alcance certo")[0]}
            <span className="text-brand">alcance certo.</span>
          </motion.h1>
          <motion.p
            className="text-body-lg text-white/80 mb-6 max-w-xl mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          >
            {fullName} · {formatKm(vehicle.quilometragem)} · {vehicle.cambio} · {vehicle.combustivel} · {vehicle.cor}
          </motion.p>
          <motion.p
            className="font-display text-[44px] md:text-[52px] font-bold text-white mb-8"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          >
            {formatPrice(vehicle.preco)}
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          >
            <a href="#cta" className="rounded-full bg-white text-brand font-body font-medium px-8 py-3.5 text-[15px] hover:bg-white/90 transition-colors flex items-center gap-2 justify-center">
              <MessageCircle className="w-4 h-4" /> Quero este veículo
            </a>
            <a href="#resumo" className="rounded-full border border-white/30 text-white font-body font-medium px-8 py-3.5 text-[15px] hover:bg-white/10 transition-colors flex items-center gap-2 justify-center">
              Ver mais detalhes <ChevronDown className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ChevronDown className="w-6 h-6 text-white/50" />
        </motion.div>
      </section>

      {/* ===== RESUMO EDITORIAL ===== */}
      <section id="resumo" className="py-20 md:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-5 gap-12 items-center">
          <motion.div className="md:col-span-3 space-y-6" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.span variants={fadeUp} custom={0} className="text-micro uppercase tracking-widest text-brand font-medium">
              ✦ Sobre este veículo
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-h1 text-text-primary">
              {vehicle.marca} {vehicle.modelo} {vehicle.versao}
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-body-lg text-text-secondary leading-relaxed">
              {vehicle.descricao} Cor {vehicle.cor} com interior impecável. O {vehicle.modelo} é referência na categoria por sua confiabilidade,
              valor de revenda acima da média e custo de manutenção acessível. Este exemplar específico se destaca pela baixa quilometragem
              e conjunto completo de opcionais, incluindo {vehicle.opcionais.slice(0, 3).join(", ").toLowerCase()} e muito mais.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4 pt-2">
              {[
                { icon: Fuel, label: vehicle.combustivel, sub: "Combustível" },
                { icon: Gauge, label: vehicle.consumo_estrada || "14 km/l", sub: "Autonomia estrada" },
                { icon: DollarSign, label: `~R$ ${totalMonthly}/mês`, sub: "Custo estimado" },
              ].map((item) => (
                <div key={item.sub} className="flex items-center gap-3 rounded-xl border border-border bg-surface-card p-4 min-w-[160px]">
                  <div className="rounded-lg bg-brand-light p-2"><item.icon className="w-5 h-5 text-brand" /></div>
                  <div>
                    <p className="text-h4 text-text-primary">{item.label}</p>
                    <p className="text-micro text-text-muted">{item.sub}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <img src={vehicle.fotos[1]} alt={fullName} className="rounded-xl shadow-elevated w-full aspect-[4/5] object-cover" />
          </motion.div>
        </div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section className="py-20 bg-surface-secondary">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-h1 text-text-primary mb-3">
              Por que este veículo?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-body-lg text-text-secondary max-w-xl mx-auto">
              Cada detalhe verificado para sua tranquilidade.
            </motion.p>
          </motion.div>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            {benefits.map((b, i) => (
              <motion.div
                key={b.title} variants={fadeUp} custom={i}
                className="rounded-xl border border-border bg-surface-card p-6 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="rounded-lg bg-brand-light p-2.5 w-fit mb-4"><b.icon className="w-5 h-5 text-brand" /></div>
                <h3 className="text-h3 text-text-primary mb-2">{b.title}</h3>
                <p className="text-body text-text-secondary">{b.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== DADOS DO MODELO ===== */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-h2 text-text-primary mb-6">Ficha técnica</h2>
            <div className="space-y-0 rounded-xl border border-border overflow-hidden">
              {[
                ["Marca / Modelo", `${vehicle.marca} ${vehicle.modelo}`],
                ["Versão", vehicle.versao],
                ["Ano", String(vehicle.ano)],
                ["Quilometragem", formatKm(vehicle.quilometragem)],
                ["Câmbio", vehicle.cambio],
                ["Combustível", vehicle.combustivel],
                ["Potência", vehicle.potencia],
                ["Torque", vehicle.torque || "—"],
                ["Cor", vehicle.cor],
              ].map(([label, value], i) => (
                <div key={label} className={`flex justify-between px-5 py-3 text-body ${i % 2 === 0 ? "bg-surface-secondary" : "bg-surface-card"}`}>
                  <span className="text-text-secondary">{label}</span>
                  <span className="text-text-primary font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-h2 text-text-primary mb-2">Consumo em destaque</h2>
            <p className="text-body text-text-secondary mb-6">
              O {vehicle.marca} {vehicle.modelo} é reconhecido pelo equilíbrio entre performance e economia. 
              Com motor {vehicle.potencia} e câmbio {vehicle.cambio}, entrega uma experiência de condução suave 
              com consumo competitivo na categoria.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-surface-card p-6 text-center">
                <Fuel className="w-6 h-6 text-brand mx-auto mb-2" />
                <p className="font-display text-[28px] font-bold text-text-primary">{vehicle.consumo_cidade || "11,8 km/l"}</p>
                <p className="text-small text-text-muted">Cidade</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-card p-6 text-center">
                <Fuel className="w-6 h-6 text-brand mx-auto mb-2" />
                <p className="font-display text-[28px] font-bold text-text-primary">{vehicle.consumo_estrada || "14,2 km/l"}</p>
                <p className="text-small text-text-muted">Estrada</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CUSTO DE PROPRIEDADE ===== */}
      <section className="py-20 bg-brand-light">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-h1 text-text-primary mb-3">Custo estimado mensal</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-body text-text-secondary">Simulação para facilitar seu planejamento financeiro.</motion.p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: CreditCard, label: "Financiamento", value: financing, sub: "48x · entrada 30%" },
              { icon: Umbrella, label: "Seguro", value: insurance, sub: "Estimativa anual/12" },
              { icon: Fuel, label: "Combustível", value: fuel, sub: "~1.200 km/mês" },
              { icon: Wrench, label: "Manutenção", value: maintenance, sub: "Custo anual/12" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-surface-card p-5 text-center">
                <c.icon className="w-5 h-5 text-brand mx-auto mb-2" />
                <p className="text-micro text-text-muted uppercase tracking-wider mb-1">{c.label}</p>
                <p className="font-display text-[22px] font-bold text-text-primary">R$ {c.value.toLocaleString("pt-BR")}</p>
                <p className="text-micro text-text-muted mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border-2 border-brand bg-surface-card p-6 text-center">
            <p className="text-micro text-text-muted uppercase tracking-wider mb-1">Total mensal estimado</p>
            <p className="font-display text-[36px] font-bold text-brand">R$ {totalMonthly.toLocaleString("pt-BR")}</p>
            <p className="text-small text-text-muted mt-2">* Valores estimados para fins de planejamento. Consulte condições reais.</p>
          </div>
        </div>
      </section>

      {/* ===== COMPARATIVO ===== */}
      {competitors.length >= 2 && (
        <section className="py-20 bg-background">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-h1 text-text-primary text-center mb-3">Comparativo rápido</h2>
            <p className="text-body text-text-secondary text-center mb-10">
              Veja como este {vehicle.modelo} se posiciona frente a concorrentes diretos.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-small text-text-muted font-medium p-3 border-b border-border w-[140px]">Atributo</th>
                    {allCompare.map((v, i) => (
                      <th key={v.id} className={`p-3 border-b border-border text-center ${i === 0 ? "bg-brand-light" : ""}`}>
                        <img src={v.fotos[0]} alt={v.modelo} className="w-16 h-12 object-cover rounded-md mx-auto mb-2" />
                        <p className={`text-small font-medium ${i === 0 ? "text-brand" : "text-text-primary"}`}>
                          {v.marca} {v.modelo}
                        </p>
                        <p className="text-micro text-text-muted">{v.ano}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, ri) => {
                    const winnerVal = getWinner(row, allCompare);
                    return (
                      <tr key={row.key} className={ri % 2 === 0 ? "bg-surface-secondary" : "bg-surface-card"}>
                        <td className="p-3 text-small text-text-secondary">{row.label}</td>
                        {allCompare.map((v, i) => {
                          const val = (v as any)[row.key];
                          const isWinner = winnerVal !== null && typeof val === "number" && val === winnerVal;
                          const formatted = row.format ? row.format(val) : String(val);
                          return (
                            <td key={v.id} className={`p-3 text-center text-body ${i === 0 ? "bg-brand-light/50" : ""} ${isWinner ? "text-brand font-semibold" : "text-text-primary"}`}>
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ===== CONFIANÇA ===== */}
      <section className="py-20 bg-surface-dark">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-h1 text-white mb-3">
              Anúncio verificado Ventoro.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-body-lg text-white/60 mb-10">
              Cada detalhe deste anúncio foi analisado pela nossa inteligência artificial.
            </motion.p>
          </motion.div>

          <motion.div
            className="inline-flex flex-col items-center mb-10"
            initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            <p className="font-mono text-[64px] font-bold text-brand">{vehicle.score_confianca}</p>
            <p className="text-small text-white/50">Score de confiança</p>
            <div className="w-48 h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
              <motion.div
                className="h-full bg-brand rounded-full"
                initial={{ width: 0 }} whileInView={{ width: `${vehicle.score_confianca}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
            {scoreComponents.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
                <div className={`rounded-full p-1.5 ${s.ok ? "bg-brand/20" : "bg-white/10"}`}>
                  {s.ok ? <Check className="w-4 h-4 text-brand" /> : <X className="w-4 h-4 text-white/30" />}
                </div>
                <div>
                  <p className="text-small text-white font-medium">{s.label}</p>
                  <p className="text-micro text-white/40">{s.ok ? "Verificado" : "N/D"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-h1 text-text-primary text-center mb-10">Perguntas frequentes</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left bg-surface-card hover:bg-surface-secondary transition-colors"
                >
                  <span className="text-body font-medium text-text-primary">{faq.q}</span>
                  <ChevronRight className={`w-4 h-4 text-text-muted transition-transform duration-200 ${openFaq === i ? "rotate-90" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 pt-1 bg-surface-card">
                    <p className="text-body text-text-secondary">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section id="cta" className="py-24 md:py-32 bg-brand relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.h2
            className="text-h1 md:text-hero text-white mb-4"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            Pronto para dar o próximo passo?
          </motion.h2>
          <p className="text-body-lg text-white/80 mb-10">
            {fullName} por {formatPrice(vehicle.preco)}. Resposta em menos de 15 minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <button className="rounded-full bg-white text-brand font-body font-medium px-8 py-3.5 text-[15px] hover:bg-white/90 transition-colors flex items-center gap-2 justify-center">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button className="rounded-full border border-white/30 text-white font-body font-medium px-8 py-3.5 text-[15px] hover:bg-white/10 transition-colors flex items-center gap-2 justify-center">
              <CalendarCheck className="w-4 h-4" /> Agendar visita
            </button>
            <button className="rounded-full border border-white/30 text-white font-body font-medium px-8 py-3.5 text-[15px] hover:bg-white/10 transition-colors flex items-center gap-2 justify-center">
              <Send className="w-4 h-4" /> Fazer proposta
            </button>
          </div>

          <div className="inline-flex items-center gap-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 mb-8">
            <span className="font-mono text-[20px] font-bold text-white">{vehicle.score_confianca}</span>
            <div className="w-px h-6 bg-white/20" />
            <span className="text-small text-white/70">Score de confiança verificado</span>
          </div>

          <div className="flex justify-center">
            <button className="text-small text-white/60 hover:text-white/90 transition-colors flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" /> Compartilhar esta página
            </button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-6 bg-surface-dark text-center">
        <Link to="/"><VentoroLogo size="sm" /></Link>
        <p className="text-micro text-white/30 mt-3">© 2025 Ventoro. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
