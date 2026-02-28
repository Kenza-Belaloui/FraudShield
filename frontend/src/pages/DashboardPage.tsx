import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { getDashboardSummary, type DashboardSummary } from "../api/dashboard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const res = await getDashboardSummary();
        setData(res);
      } catch {
        setError("Impossible de charger les données du dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = useMemo(() => {
    const d = data?.criticite_distribution_7j || {};
    const order = ["FAIBLE", "MOYEN", "ELEVE"];
    return order.map((k) => ({ criticite: k, count: d[k] || 0 }));
  }, [data]);

  return (
    <AppShell user={user || undefined} onLogout={logout}>
      <div className="pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight">Tableau de bord</h1>
            <div className="text-white/60 mt-1">
              Vue synthétique des transactions, alertes et performance du scoring.
            </div>
          </div>
          <div className="text-white/60 text-sm">
            Dernière mise à jour : {new Date().toLocaleString()}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-red-100">
            {error}
          </div>
        )}

        {/* GRID responsive */}
        <div className="grid grid-cols-12 gap-6">
          {/* KPI */}
          <section className="col-span-12 lg:col-span-4 fs-glass rounded-2xl p-5">
            <div className="text-sm text-white/70 mb-3 font-semibold">Indicateurs clés</div>

            <Kpi title="Transactions analysées (24h)" value={data?.transactions_24h ?? 0} />
            <Kpi title="Alertes actives" value={data?.alertes_actives ?? 0} />
            <Kpi title="Taux de fraude (7j)" value={`${(data?.taux_fraude_7j ?? 0).toFixed(2)} %`} />
            <Kpi title="Temps moyen d’analyse" value={`${Math.round(data?.temps_moyen_analyse_ms ?? 0)} ms`} />

            {loading && <div className="mt-4 text-white/50 text-sm">Chargement…</div>}
          </section>

          {/* Chart */}
          <section className="col-span-12 lg:col-span-8 fs-glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Alertes par criticité (7 jours)</div>
              <div className="text-xs text-white/55">FAIBLE • MOYEN • ÉLEVÉ</div>
            </div>

            <div className="h-[320px] lg:h-[380px] rounded-2xl border border-white/10 bg-white/5 p-4">
              {loading ? (
                <div className="h-full flex items-center justify-center text-white/60">Chargement…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="criticite" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,25,50,0.95)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Recent alerts */}
          <section className="col-span-12 fs-glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Alertes récentes</div>
              <div className="text-white/60 text-sm">Dernières 7 alertes</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3">ID</th>
                    <th className="text-left py-3">Date</th>
                    <th className="text-left py-3">Criticité</th>
                    <th className="text-left py-3">Statut</th>
                    <th className="text-left py-3">Score</th>
                    <th className="text-left py-3">Raison</th>
                    <th className="text-left py-3">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent_alerts || []).map((a) => (
                    <tr key={a.idAlerte} className="border-b border-white/10">
                      <td className="py-3 text-white/85 font-medium">{a.idAlerte.slice(0, 10)}…</td>
                      <td className="py-3 text-white/75">{new Date(a.date_creation).toLocaleString()}</td>
                      <td className="py-3">
                        <Badge criticite={a.criticite} />
                      </td>
                      <td className="py-3 text-white/85">{a.statut}</td>
                      <td className="py-3 text-white/85">{Number(a.score_final || 0).toFixed(4)}</td>
                      <td className="py-3 text-white/70 max-w-[380px] truncate" title={a.raison ?? ""}>
                        {a.raison || "—"}
                      </td>
                      <td className="py-3 text-white/75">{(a.idTransac || "").slice(0, 10)}…</td>
                    </tr>
                  ))}

                  {!loading && (data?.recent_alerts || []).length === 0 && (
                    <tr>
                      <td className="py-6 text-white/60" colSpan={7}>
                        Aucune alerte récente.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td className="py-6 text-white/60" colSpan={7}>
                        Chargement…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
      <div className="text-xs text-white/60 mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Badge({ criticite }: { criticite: string }) {
  const cls =
    criticite === "ELEVE"
      ? "bg-red-500/25 border-red-300/20 text-red-100"
      : criticite === "MOYEN"
      ? "bg-yellow-500/25 border-yellow-300/20 text-yellow-100"
      : "bg-emerald-500/25 border-emerald-300/20 text-emerald-100";

  return <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${cls}`}>{criticite}</span>;
}