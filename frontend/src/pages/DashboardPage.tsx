import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { getDashboardSummary, getDashboardTimeseries, type DashboardSummary } from "../api/dashboard";
import { simulateFlux, downloadAlertsCsv } from "../api/actions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySim, setBusySim] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, ts] = await Promise.all([getDashboardSummary(), getDashboardTimeseries(7)]);
      setData(s);
      setSeries(ts.series || []);
    } catch (error) {
      console.error("Dashboard load error:", error);
      setData(null);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const chartData = useMemo(() => {
    const d = data?.criticite_distribution_7j || {};
    return [
      { criticite: "FAIBLE", count: d["FAIBLE"] || 0 },
      { criticite: "MOYEN", count: d["MOYEN"] || 0 },
      { criticite: "ELEVE", count: d["ELEVE"] || 0 },
    ];
  }, [data]);

  const hasCriticityData = chartData.some((x) => x.count > 0);
  const hasSeriesData = Array.isArray(series) && series.length > 0;

  async function onSimulate() {
    try {
      setBusySim(true);
      const r = await simulateFlux(30);
      setNotice(`Simulation terminée : ${r.created} transactions, ${r.elev_count} alertes ÉLEVÉES`);
      await loadAll();
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setBusySim(false);
    }
  }

  async function onExport() {
    await downloadAlertsCsv();
  }

  function onOpenCritical() {
    navigate("/alerts?criticite=ELEVE");
  }

  return (
    <AppShell
      user={user || undefined}
      onLogout={logout}
      onSimulate={onSimulate}
      onExport={onExport}
      onOpenCritical={onOpenCritical}
    >
      <div className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[30px] font-extrabold tracking-tight">Tableau de bord</h1>
            {notice && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/85">
                {notice}
              </div>
            )}
            <div className="text-white/60 mt-1">
              Vue synthétique des transactions, alertes et performance du scoring.
            </div>
          </div>

          <div className="text-white/65 text-sm">
            Dernière mise à jour : {new Date().toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="text-sm text-white/70 mb-3 font-semibold flex items-center justify-between">
              <span>Indicateurs clés</span>
              {busySim && <span className="text-xs text-white/60">Simulation…</span>}
            </div>

            <Kpi title="Transactions analysées (24h)" value={data?.transactions_24h ?? 0} variant="blue" />
            <Kpi title="Alertes actives" value={data?.alertes_actives ?? 0} variant="red" />
            <Kpi
              title="Fraude confirmée (7j)"
              value={`${(data?.taux_fraude_confirmee_7j ?? 0).toFixed(2)} %`}
              variant="green"
            />
            <Kpi
              title="Temps moyen d’analyse"
              value={`${Math.round(data?.temps_moyen_analyse_ms ?? 0)} ms`}
              variant="cyan"
            />
          </section>

          <section className="col-span-12 lg:col-span-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Alertes par criticité (7 jours)</div>
              <div className="text-xs text-white/55">FAIBLE • MOYEN • ÉLEVÉ</div>
            </div>

            <div className="h-[300px] rounded-2xl border border-white/10 bg-white/5 p-4">
              {loading ? (
                <div className="h-full flex items-center justify-center text-white/60">Chargement…</div>
              ) : !hasCriticityData ? (
                <div className="h-full flex items-center justify-center text-white/50">
                  Pas assez de données pour afficher la criticité.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="criticite" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,25,50,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Bar dataKey="count" fill="#2ec5ff" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-12 gap-4 mt-5">
              <div className="col-span-12 md:col-span-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/70 mb-2 font-semibold">Transactions / jour</div>
                <div className="h-[140px]">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-white/60">Chargement…</div>
                  ) : !hasSeriesData ? (
                    <div className="h-full flex items-center justify-center text-white/50">Données insuffisantes.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" hide />
                        <YAxis stroke="rgba(255,255,255,0.4)" hide />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(10,25,50,0.9)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            color: "white",
                          }}
                        />
                        <Line type="monotone" dataKey="transactions" stroke="#2ec5ff" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="col-span-12 md:col-span-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/70 mb-2 font-semibold">Fraude confirmée / jour</div>
                <div className="h-[140px]">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-white/60">Chargement…</div>
                  ) : !hasSeriesData ? (
                    <div className="h-full flex items-center justify-center text-white/50">Données insuffisantes.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" hide />
                        <YAxis stroke="rgba(255,255,255,0.4)" hide />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(10,25,50,0.9)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            color: "white",
                          }}
                        />
                        <Line type="monotone" dataKey="fraude_confirmee" stroke="#00d084" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="col-span-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Alertes récentes</div>
              <div className="text-white/60 text-sm">Dernières 7 alertes</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3">N°</th>
                    <th className="text-left py-3">Date</th>
                    <th className="text-left py-3">Criticité</th>
                    <th className="text-left py-3">Statut</th>
                    <th className="text-left py-3">Score</th>
                    <th className="text-left py-3">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent_alerts || []).map((a, index) => (
                    <tr key={a.idAlerte} className="border-b border-white/10">
                      <td className="py-3 text-white/85 font-semibold">{index + 1}</td>
                      <td className="py-3 text-white/85">{new Date(a.date_creation).toLocaleString()}</td>
                      <td className="py-3">
                        <Badge criticite={a.criticite} />
                      </td>
                      <td className="py-3 text-white/85">{a.statut}</td>
                      <td className="py-3 text-white/85">{Number(a.score_final || 0).toFixed(4)}</td>
                      <td className="py-3 text-white/85">T-{index + 1}</td>
                    </tr>
                  ))}

                  {!loading && (data?.recent_alerts || []).length === 0 && (
                    <tr>
                      <td className="py-6 text-white/60" colSpan={6}>
                        Aucune alerte récente.
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

function Kpi({
  title,
  value,
  variant,
}: {
  title: string;
  value: any;
  variant: "blue" | "red" | "green" | "cyan";
}) {
  const bg =
    variant === "blue"
      ? "bg-blue-500/20"
      : variant === "red"
      ? "bg-red-500/20"
      : variant === "green"
      ? "bg-emerald-500/20"
      : "bg-cyan-500/20";

  return (
    <div className={`rounded-2xl border border-white/10 ${bg} p-5 mb-4`}>
      <div className="text-xs text-white/70 mb-2">{title}</div>
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