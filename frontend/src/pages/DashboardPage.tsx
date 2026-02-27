import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { getDashboardStats } from "../api/dashboard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getDashboardSummary();
        setData(res);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = useMemo(() => {
    const d = data?.criticite_distribution_7j || {};
    // ordre pro
    const order = ["FAIBLE", "MOYEN", "ELEVE"];
    return order
      .filter((k) => k in d)
      .map((k) => ({ criticite: k, count: d[k] }));
  }, [data]);

  return (
    <AppShell user={user || undefined} onLogout={logout}>
      <div className="pt-6">
        <h1 className="text-center text-[26px] font-bold mb-6">Tableau de bord</h1>

        {/* GRID */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT - CHART */}
          <section className="col-span-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="text-lg font-semibold mb-4">Volume d’alertes par criticité (7 jours)</div>

            <div className="h-[360px] rounded-2xl border border-white/10 bg-white/5 p-4">
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
          </section>

          {/* RIGHT - STATS */}
          <section className="col-span-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="text-lg font-semibold mb-4">Statistiques</div>

            <StatCard title="Transactions analysées (24h)" value={data?.transactions_24h ?? 0} variant="blue" />
            <StatCard title="Alertes actives" value={data?.alertes_actives ?? 0} variant="red" />
            <StatCard title="Taux de fraude (7j)" value={`${(data?.taux_fraude_7j ?? 0).toFixed(2)} %`} variant="green" />
            <StatCard
              title="Temps moyen d’analyse"
              value={`${Math.round((data?.temps_moyen_analyse_ms ?? 0) / 1000)}s`}
              variant="cyan"
            />
          </section>

          {/* BOTTOM - RECENT ALERTS */}
          <section className="col-span-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="text-lg font-semibold mb-4">Alertes récentes</div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
                      <td className="py-3 text-white/85">{a.score_final.toFixed(4)}</td>
                      <td className="py-3 text-white/85">{a.idTransac.slice(0, 10)}…</td>
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

function StatCard({
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