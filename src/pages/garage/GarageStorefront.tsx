import { garages } from "@/data/mock";
import { Upload, Eye } from "lucide-react";
import { useState } from "react";

const garage = garages[0];

const sections = [
  { id: "sobre", label: "Sobre", enabled: true },
  { id: "estoque", label: "Estoque", enabled: true },
  { id: "avaliacoes", label: "Avaliações", enabled: true },
  { id: "contato", label: "Contato", enabled: true },
  { id: "horarios", label: "Horários", enabled: false },
];

export default function GarageStorefront() {
  const [sectionToggles, setSectionToggles] = useState(
    Object.fromEntries(sections.map((s) => [s.id, s.enabled]))
  );
  const [accentColor, setAccentColor] = useState("#534AB7");

  const toggle = (id: string) =>
    setSectionToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <h1 className="text-h2 text-text-primary">Configuração da vitrine</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-5">
          {/* Logo & Cover */}
          <div className="rounded-xl border border-border bg-background p-5 space-y-4">
            <h3 className="text-h4 text-text-primary">Identidade visual</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-micro text-text-muted mb-2">Logo</p>
                <div className="rounded-xl border-2 border-dashed border-border bg-surface-secondary h-28 flex flex-col items-center justify-center cursor-pointer hover:border-garage/50 transition-colors">
                  <Upload className="w-5 h-5 text-text-muted mb-1" />
                  <span className="text-micro text-text-muted">Upload</span>
                </div>
              </div>
              <div>
                <p className="text-micro text-text-muted mb-2">Capa</p>
                <div className="rounded-xl border-2 border-dashed border-border bg-surface-secondary h-28 flex flex-col items-center justify-center cursor-pointer hover:border-garage/50 transition-colors">
                  <Upload className="w-5 h-5 text-text-muted mb-1" />
                  <span className="text-micro text-text-muted">Upload</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-border bg-background p-5 space-y-4">
            <h3 className="text-h4 text-text-primary">Informações</h3>
            {[
              { label: "Nome da garagem", value: garage.nome },
              { label: "Tagline", value: "Especialistas em seminovos premium" },
              { label: "Especialidades", value: garage.especialidade },
              { label: "Telefone", value: garage.telefone },
              { label: "WhatsApp", value: garage.whatsapp },
              { label: "Email", value: garage.email },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-micro text-text-muted mb-1 block">{f.label}</label>
                <input
                  type="text" defaultValue={f.value}
                  className="w-full rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-body text-text-primary outline-none focus:border-garage focus:ring-1 focus:ring-garage/30 transition-all"
                />
              </div>
            ))}
            <div>
              <label className="text-micro text-text-muted mb-1 block">Descrição</label>
              <textarea
                defaultValue={garage.descricao} rows={3}
                className="w-full rounded-lg border border-border bg-surface-secondary px-4 py-2.5 text-body text-text-primary outline-none focus:border-garage focus:ring-1 focus:ring-garage/30 transition-all resize-none"
              />
            </div>
          </div>

          {/* Accent color */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h3 className="text-h4 text-text-primary mb-3">Cor de destaque</h3>
            <div className="flex items-center gap-3">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
              <span className="text-small text-text-secondary font-mono">{accentColor}</span>
            </div>
          </div>

          {/* URL */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h3 className="text-h4 text-text-primary mb-3">URL pública</h3>
            <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-4 py-2.5">
              <span className="text-small text-text-muted">ventoro.com.br/garagem/</span>
              <input
                type="text" defaultValue={garage.slug}
                className="flex-1 bg-transparent text-body text-text-primary font-medium outline-none"
              />
            </div>
          </div>

          {/* Section toggles */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h3 className="text-h4 text-text-primary mb-3">Seções visíveis</h3>
            <div className="space-y-2">
              {sections.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <span className="text-body text-text-primary">{s.label}</span>
                  <button
                    onClick={() => toggle(s.id)}
                    className={`w-10 h-6 rounded-full flex items-center transition-colors cursor-pointer ${
                      sectionToggles[s.id] ? "bg-garage justify-end" : "bg-border justify-start"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow mx-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full rounded-full bg-garage text-white py-3 text-small font-medium hover:brightness-90 transition-all">
            Salvar alterações
          </button>
        </div>

        {/* Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-text-muted" />
              <span className="text-micro text-text-muted uppercase tracking-wider">Preview da vitrine</span>
            </div>
            <div className="rounded-xl border border-border bg-background overflow-hidden shadow-elevated">
              <div className="h-28 bg-cover bg-center relative" style={{ backgroundImage: `url(${garage.capa_url})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="px-5 pb-5 -mt-8 relative">
                <img src={garage.logo_url} alt={garage.nome} className="w-14 h-14 rounded-xl border-2 border-white shadow mb-3" />
                <p className="text-h4 text-text-primary">{garage.nome}</p>
                <p className="text-micro text-text-muted">{garage.cidade}, {garage.estado}</p>
                <div className="flex gap-4 mt-3 text-micro text-text-muted">
                  <span>{garage.total_estoque} veículos</span>
                  <span>⭐ {garage.avaliacao}</span>
                  <span>Score {garage.score_confianca}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
