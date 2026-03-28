import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { downloadAlertsCsv, simulateFlux } from "../api/actions";
import { getDashboardSummary, getDashboardTimeseries, type DashboardSummary, type DashboardTimeseries } from "../api/dashboard";

export function DashboardPage() {
  const { user, logout } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [timeseries, setTimeseries] = useState<DashboardTimeseries | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  async function loadData(selectedDays: number = days) {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        getDashboardSummary(),
        getDashboardTimeseries(selectedDays),
      ]);
      setSummary(s);
      setTimeseries(t);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const maxTx = useMemo(() => {
    if (!timeseries?.series?.length) return 1;
    return Math.max(...timeseries.series.map((x) => x.transactions), 1);
  }, [timeseries]);

  return (
    <AppShell
      user={user || undefined}
      onLogout={logout}
      onSimulate={async () => {
        await simulateFlux(30);
        await loadData(days);
      }}
      onExport={async () => {
        await downloadAlertsCsv();
      }}
      onOpenCritical={() => {
        window.location.href = "/alerts?criticite=ELEVE&page=1";
      }}
    >
      <div className="pt-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[30px] font-extrabold tracking-tight">Tableau de bord</h1>
            <p className="text-white/60 max-w-3xl">
              Vue consolidée des transactions, alertes, fraudes confirmées et signaux de risque
              pour le pilotage opérationnel de la plateforme FraudShield.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-sm"
            >
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
            </select>
          </div>
        </div>

        {loading || !summary || !timeseries ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-white/70">
            Chargement du tableau de bord…
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-12 gap-5">
              <KpiCard
                title="Transactions 24h"
                value={summary.transactions_24h}
                subtitle="Flux récent traité"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <KpiCard
                title="Alertes actives"
                value={summary.alertes_actives}
                subtitle="Ouvertes ou en cours"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <KpiCard
                title="Fraudes confirmées 7j"
                value={summary.confirmed_fraud_7d}
                subtitle={`${summary.taux_fraude_confirmee_7j.toFixed(2)}% des transactions`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <KpiCard
                title="Temps moyen d'analyse"
                value={`${summary.temps_moyen_analyse_ms} ms`}
                subtitle="Temps de scoring moyen"
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
            </div>

            {/* KPI secondaires */}
            <div className="grid grid-cols-12 gap-5">
              <MiniCard
                title="Taux d'alerte 7j"
                value={`${summary.taux_alerte_7j.toFixed(2)}%`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MiniCard
                title="Alertes haute criticité"
                value={`${summary.taux_alertes_haute_criticite_7j.toFixed(2)}%`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MiniCard
                title="Faux positifs estimés"
                value={`${summary.taux_faux_positifs_7j.toFixed(2)}%`}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
              <MiniCard
                title="Alertes créées 7j"
                value={summary.total_alerts_7d}
                className="col-span-12 md:col-span-6 xl:col-span-3"
              />
            </div>

            {/* Bloc principal */}
            <div className="grid grid-cols-12 gap-6">
              <section className="col-span-12 xl:col-span-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-lg font-semibold">Évolution activité & fraude confirmée</div>
                    <div className="text-white/60 text-sm">
                      Transactions, alertes et fraudes confirmées sur la période sélectionnée
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {timeseries.series.map((item) => {
                    const txWidth = `${(item.transactions / maxTx) * 100}%`;
                    const alWidth = `${(item.alertes / maxTx) * 100}%`;
                    const frWidth = `${(item.fraude_confirmee / maxTx) * 100}%`;

                    return (
                      <div key={item.date} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold text-white/90">{item.date}</div>
                          <div className="text-xs text-white/60">
                            Taux fraude: {item.taux_fraude.toFixed(2)}%
                          </div>
                        </div>

                        <MetricBar label="Transactions" value={item.transactions} width={txWidth} />
                        <MetricBar label="Alertes" value={item.alertes} width={alWidth} />
                        <MetricBar label="Fraudes confirmées" value={item.fraude_confirmee} width={frWidth} />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="col-span-12 xl:col-span-4 space-y-6">
                <Panel title="Répartition criticité">
                  <SimpleStatRow label="Faible" value={summary.criticite_distribution_7j.FAIBLE || 0} />
                  <SimpleStatRow label="Moyen" value={summary.criticite_distribution_7j.MOYEN || 0} />
                  <SimpleStatRow label="Élevé" value={summary.criticite_distribution_7j.ELEVE || 0} />
                </Panel>

                <Panel title="Transactions par canal">
                  {Object.keys(summary.transactions_by_channel_7j || {}).length === 0 ? (
                    <div className="text-white/60 text-sm">Aucune donnée.</div>
                  ) : (
                    Object.entries(summary.transactions_by_channel_7j).map(([label, value]) => (
                      <SimpleStatRow key={label} label={label} value={value} />
                    ))
                  )}
                </Panel>
              </section>
            </div>

            {/* Blocs premium */}
            <div className="grid grid-cols-12 gap-6">
              <section className="col-span-12 xl:col-span-4">
                <Panel title="Top reason codes">
                  {!summary.top_reason_codes.length ? (
                    <div className="text-white/60 text-sm">Aucune donnée disponible.</div>
                  ) : (
                    <div className="space-y-3">
                      {summary.top_reason_codes.map((r) => (
                        <div
                          key={r.code}
                          className="rounded-xl border border-white/10 bg-white/5 p-3"
                        >
                          <div className="text-sm text-white/90 font-semibold">{r.label}</div>
                          <div className="text-xs text-white/50 mt-1">{r.code}</div>
                          <div className="text-xs text-white/70 mt-2">Occurrences: {r.count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </section>

              <section className="col-span-12 xl:col-span-4">
                <Panel title="Commerçants les plus alertés">
                  {!summary.top_merchants_alerts.length ? (
                    <div className="text-white/60 text-sm">Aucune donnée disponible.</div>
                  ) : (
                    <div className="space-y-3">
                      {summary.top_merchants_alerts.map((m) => (
                        <div
                          key={m.nom}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                        >
                          <div className="text-sm text-white/90">{m.nom}</div>
                          <div className="text-sm font-semibold text-white">{m.count}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </section>

              <section className="col-span-12 xl:col-span-4">
                <Panel title="Lecture métier">
                  <div className="space-y-3 text-sm text-white/80">
                    <p>
                      Le dashboard consolide l’activité transactionnelle, la volumétrie d’alertes
                      et la fraude confirmée afin d’aider les analystes et responsables risque à
                      prioriser les investigations.
                    </p>
                    <p>
                      Les indicateurs séparent volontairement les <span className="font-semibold">alertes détectées</span>
                      des <span className="font-semibold">fraudes confirmées</span>, afin de mieux piloter
                      la qualité du système et le taux de faux positifs.
                    </p>
                    <p>
                      Les top reason codes permettent d’identifier rapidement les schémas dominants :
                      activité anormale, dépassement de plafond, pays inhabituel ou comportement nocturne.
                    </p>
                  </div>
                </Panel>
              </section>
            </div>

            {/* Recent alerts */}
            <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-semibold">Alertes récentes</div>
                  <div className="text-white/60 text-sm">
                    Derniers cas détectés par la plateforme
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead className="text-white/70">
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3">Alerte</th>
                      <th className="text-left py-3">Transaction</th>
                      <th className="text-left py-3">Client</th>
                      <th className="text-left py-3">Commerçant</th>
                      <th className="text-left py-3">Criticité</th>
                      <th className="text-left py-3">Statut</th>
                      <th className="text-left py-3">Score</th>
                      <th className="text-left py-3">Décision analyste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recent_alerts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-white/60">
                          Aucune alerte récente.
                        </td>
                      </tr>
                    ) : (
                      summary.recent_alerts.map((a) => (
                        <tr key={a.idAlerte} className="border-b border-white/10">
                          <td className="py-3 text-white/85">{a.idAlerte.slice(0, 8)}…</td>
                          <td className="py-3 text-white/85">{a.idTransac?.slice(0, 10)}…</td>
                          <td className="py-3 text-white/85">{a.client || "—"}</td>
                          <td className="py-3 text-white/85">{a.commercant || "—"}</td>
                          <td className="py-3">
                            <SeverityBadge criticite={a.criticite} />
                          </td>
                          <td className="py-3 text-white/85">{a.statut}</td>
                          <td className="py-3 text-white/85">{a.score_final.toFixed(4)}</td>
                          <td className="py-3 text-white/75">
                            {a.latest_validation
                              ? `${a.latest_validation.decision} — ${a.latest_validation.utilisateur || "analyste"}`
                              : "Non traité"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  className = "",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`${className} rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5`}>
      <div className="text-white/60 text-sm mb-2">{title}</div>
      <div className="text-3xl font-extrabold text-white">{value}</div>
      {subtitle ? <div className="text-white/50 text-sm mt-2">{subtitle}</div> : null}
    </div>
  );
}

function MiniCard({
  title,
  value,
  className = "",
}: {
  title: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={`${className} rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4`}>
      <div className="text-white/60 text-sm mb-1">{title}</div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
      <div className="text-lg font-semibold mb-4">{title}</div>
      {children}
    </div>
  );
}

function SimpleStatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0">
      <div className="text-white/70 text-sm">{label}</div>
      <div className="text-white font-semibold">{value}</div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  width,
}: {
  label: string;
  value: number;
  width: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs text-white/70 mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-white/60" style={{ width }} />
      </div>
    </div>
  );
}

function SeverityBadge({ criticite }: { criticite: string }) {
  const cls =
    criticite === "ELEVE"
      ? "bg-red-500/25 border-red-300/20 text-red-100"
      : criticite === "MOYEN"
      ? "bg-yellow-500/25 border-yellow-300/20 text-yellow-100"
      : "bg-emerald-500/25 border-emerald-300/20 text-emerald-100";

  return <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${cls}`}>{criticite}</span>;
}