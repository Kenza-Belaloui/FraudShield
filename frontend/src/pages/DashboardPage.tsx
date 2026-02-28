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

        {/* GRID */}
        <div className="grid grid-cols-12 gap-6">
          {/* KPI */}
          <section className="col-span-12 lg:col-span-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="text-sm text-white/70 mb-3 font-semibold flex items-center justify-between">
              <span>Indicateurs clés</span>
              {busySim && <span className="text-xs text-white/60">Simulation…</span>}
            </div>

            <Kpi title="Transactions analysées (24h)" value={data?.transactions_24h ?? 0} variant="blue" />
            <Kpi title="Alertes actives" value={data?.alertes_actives ?? 0} variant="red" />
            <Kpi title="Taux de fraude (7j)" value={`${(data?.taux_fraude_7j ?? 0).toFixed(2)} %`} variant="green" />
            <Kpi title="Temps moyen d’analyse" value={`${Math.round(data?.temps_moyen_analyse_ms ?? 0)} ms`} variant="cyan" />
          </section>

          {/* Main bar chart */}
          <section className="col-span-12 lg:col-span-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Alertes par criticité (7 jours)</div>
              <div className="text-xs text-white/55">FAIBLE • MOYEN • ÉLEVÉ</div>
            </div>

            <div className="h-[300px] rounded-2xl border border-white/10 bg-white/5 p-4">
              {loading ? (
                <div className="h-full flex items-center justify-center text-white/60">Chargement…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="criticite" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,25,50,0.9)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ✅ 2 mini-charts (sans casser ton design) */}
            <div className="grid grid-cols-12 gap-4 mt-5">
              <div className="col-span-12 md:col-span-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/70 mb-2 font-semibold">Transactions / jour</div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
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
                      <Line type="monotone" dataKey="transactions" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-12 md:col-span-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/70 mb-2 font-semibold">Taux fraude (ÉLEVÉ) / jour</div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
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
                      <Line type="monotone" dataKey="taux_fraude" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Recent alerts */}
          <section className="col-span-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Alertes récentes</div>
              <div className="text-white/60 text-sm">Dernières 7 alertes</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3">ID alerte</th>
                    <th className="text-left py-3">Date</th>
                    <th className="text-left py-3">Criticité</th>
                    <th className="text-left py-3">Statut</th>
                    <th className="text-left py-3">Score</th>
                    <th className="text-left py-3">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent_alerts || []).map((a) => (
                    <tr key={a.idAlerte} className="border-b border-white/10">
                      <td className="py-3 text-white/85">{a.idAlerte.slice(0, 10)}…</td>
                      <td className="py-3 text-white/85">{new Date(a.date_creation).toLocaleString()}</td>
                      <td className="py-3">
                        <Badge criticite={a.criticite} />
                      </td>
                      <td className="py-3 text-white/85">{a.statut}</td>
                      <td className="py-3 text-white/85">{Number(a.score_final || 0).toFixed(4)}</td>
                      <td className="py-3 text-white/85">{(a.idTransac || "").slice(0, 10)}…</td>
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