import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { getTransaction, listTransactions, type TxItem } from "../api/transactions";
import { simulateFlux, downloadAlertsCsv } from "../api/actions";

export function TransactionsPage() {
  const { user, logout } = useAuth();
  const [sp, setSp] = useSearchParams();

  const page = Number(sp.get("page") || "1");
  const q = sp.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TxItem[]>([]);
  const [total, setTotal] = useState(0);

  // ✅ détails affichés uniquement si "Voir" est cliqué
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TxItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function load() {
    setLoading(true);
    try {
      const res = await listTransactions({ page, page_size: pageSize, q: q || undefined });
      setRows(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  async function openDetails(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const d = await getTransaction(id);
      setSelected(d);
    } catch {
      // fallback si endpoint absent
      const r = rows.find((x) => x.idTransac === id) || null;
      setSelected(r);
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeDetails() {
    setSelectedId(null);
    setSelected(null);
  }

  function goto(p: number) {
    const next = new URLSearchParams(sp);
    next.set("page", String(p));
    setSp(next);
  }

  const pills = useMemo(() => {
    const accepted = rows.filter((r) => r.statut === "ACCEPTEE").length;
    const refused = rows.filter((r) => r.statut === "REFUSEE").length;
    const pending = rows.filter((r) => r.statut === "EN_ATTENTE").length;
    return { accepted, refused, pending };
  }, [rows]);

  return (
    <AppShell
      user={user || undefined}
      onLogout={logout}
      onSimulate={async () => {
        await simulateFlux(30);
        await load();
      }}
      onExport={async () => {
        await downloadAlertsCsv();
      }}
      onOpenCritical={() => setSp(new URLSearchParams({ q, page: "1" }))}
    >
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight">Transactions</h1>
            <div className="text-white/60 text-sm">
              Recherche: <span className="text-white/85">{q || "—"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* TABLE */}
          <section className="col-span-12 xl:col-span-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Pill label="Total" value={total} />
              <Pill label="Acceptées" value={pills.accepted} />
              <Pill label="Refusées" value={pills.refused} />
              <Pill label="En attente" value={pills.pending} />
            </div>

            {/* ✅ Desktop table (NO horizontal scroll) */}
            <div className="hidden lg:block">
              <table className="w-full text-sm table-fixed">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 w-[14%]">ID</th>
                    <th className="text-left py-3 w-[22%]">Client</th>
                    <th className="text-left py-3 w-[14%]">Canal</th>
                    <th className="text-left py-3 w-[16%]">Montant</th>
                    <th className="text-left py-3 w-[20%]">Commerçant</th>
                    <th className="text-left py-3 w-[14%]">Statut</th>
                    <th className="text-right py-3 w-[10%]">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-white/60">
                        Chargement…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-white/60">
                        Aucune transaction trouvée.
                      </td>
                    </tr>
                  ) : (
                    rows.map((t) => (
                      <tr key={t.idTransac} className="border-b border-white/10">
                        <td className="py-3 text-white/85 truncate">
                          {t.idTransac.slice(0, 6)}…
                        </td>
                        <td className="py-3 text-white/85 truncate">
                          {t.client ? `${t.client.nom} ${t.client.prenom || ""}` : "—"}
                        </td>
                        <td className="py-3 text-white/85 truncate">{t.canal}</td>
                        <td className="py-3 text-white/85 truncate">
                          € {Number(t.montant).toFixed(2)}
                        </td>
                        <td className="py-3 text-white/85 truncate">
                          {t.commercant?.nom || "—"}
                        </td>
                        <td className="py-3">
                          <StatusBadge statut={t.statut} />
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openDetails(t.idTransac)}
                            className="rounded-full px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs"
                          >
                            Voir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ✅ Mobile layout (cards, NO horizontal scroll) */}
            <div className="lg:hidden space-y-3">
              {loading ? (
                <div className="py-10 text-center text-white/60">Chargement…</div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-white/60">Aucune transaction trouvée.</div>
              ) : (
                rows.map((t) => (
                  <div
                    key={t.idTransac}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white/85 font-semibold truncate">
                          {t.client ? `${t.client.nom} ${t.client.prenom || ""}` : "—"}
                        </div>
                        <div className="text-white/60 text-xs truncate">
                          {t.idTransac.slice(0, 12)}…
                        </div>
                      </div>
                      <StatusBadge statut={t.statut} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="text-white/70">Montant</div>
                      <div className="text-white/90 text-right">€ {Number(t.montant).toFixed(2)}</div>

                      <div className="text-white/70">Canal</div>
                      <div className="text-white/90 text-right">{t.canal}</div>

                      <div className="text-white/70">Commerçant</div>
                      <div className="text-white/90 text-right truncate">{t.commercant?.nom || "—"}</div>
                    </div>

                    <button
                      onClick={() => openDetails(t.idTransac)}
                      className="mt-3 w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
                    >
                      Voir détails
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-sm text-white/70">
              <div>
                Page {page} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goto(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="rounded-lg px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-50"
                >
                  ←
                </button>
                <button
                  onClick={() => goto(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          </section>

          {/* DETAILS */}
          <section className="col-span-12 xl:col-span-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Détails de la transaction</div>
              {selectedId && (
                <button
                  onClick={closeDetails}
                  className="rounded-lg px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
                >
                  Fermer
                </button>
              )}
            </div>

            {!selectedId ? (
              <div className="text-white/60 text-sm">
                Clique sur <span className="text-white/85 font-semibold">Voir</span> pour afficher les détails.
              </div>
            ) : loadingDetail ? (
              <div className="text-white/60 text-sm">Chargement des détails…</div>
            ) : !selected ? (
              <div className="text-white/60 text-sm">Détails introuvables.</div>
            ) : (
              <TxDetails tx={selected} />
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Pill({ label, value }: { label: string; value: any }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-white/5 border border-white/10">
      <span className="text-xs text-white/60">{label}</span>
      <span className="text-sm font-semibold text-white/90">{value}</span>
    </div>
  );
}

function StatusBadge({ statut }: { statut: string }) {
  const cls =
    statut === "ACCEPTEE"
      ? "bg-emerald-500/25 border-emerald-300/20 text-emerald-100"
      : statut === "REFUSEE"
      ? "bg-red-500/25 border-red-300/20 text-red-100"
      : "bg-yellow-500/25 border-yellow-300/20 text-yellow-100";

  const label =
    statut === "ACCEPTEE" ? "Acceptée" : statut === "REFUSEE" ? "Refusée" : "En attente";

  return <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${cls}`}>{label}</span>;
}

function RiskBadge({ criticite, score }: { criticite?: string | null; score?: number | null }) {
  const c = criticite || "—";
  const s = score == null ? null : Number(score);
  const cls =
    c === "ELEVE"
      ? "bg-red-500/20 border-red-300/20 text-red-100"
      : c === "MOYEN"
      ? "bg-yellow-500/20 border-yellow-300/20 text-yellow-100"
      : c === "FAIBLE"
      ? "bg-emerald-500/20 border-emerald-300/20 text-emerald-100"
      : "bg-white/5 border-white/10 text-white/70";

  return (
    <div className={`rounded-xl border ${cls} px-4 py-3`}>
      <div className="text-xs opacity-80 mb-1">Risque</div>
      <div className="text-2xl font-bold">{s == null ? "—" : s.toFixed(2)}</div>
      <div className="text-xs opacity-80 mt-1">{c}</div>
    </div>
  );
}

function TxDetails({ tx }: { tx: any }) {
  const score = tx?.alerte?.score_final ?? null;
  const criticite = tx?.alerte?.criticite ?? null;
  const reasons: string[] = tx?.reason_codes || [];
  const features = tx?.features || null;

  return (
    <div className="space-y-4">
      <div className="text-white/70 text-sm">
        #{tx.idTransac.slice(0, 10)} • {new Date(tx.date_heure).toLocaleString()}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/70 text-sm mb-2">Montant</div>
        <div className="text-2xl font-extrabold">
          € {Number(tx.montant).toFixed(2)} <span className="text-white/60 text-base">{tx.devise}</span>
        </div>
        <div className="text-white/70 text-sm mt-2">
          Canal : <span className="text-white/90">{tx.canal}</span>
        </div>
        <div className="text-white/70 text-sm">
          Statut : <span className="text-white/90">{tx.statut}</span>
        </div>
      </div>

      <RiskBadge criticite={criticite} score={score} />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/70 text-sm mb-2">Reason codes</div>
        {reasons.length === 0 ? (
          <div className="text-white/60 text-sm">—</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <span key={r} className="text-xs rounded-full px-3 py-1 bg-white/5 border border-white/10 text-white/85">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/70 text-sm mb-2">Features</div>
        {!features ? (
          <div className="text-white/60 text-sm">—</div>
        ) : (
          <div className="text-xs text-white/80 space-y-1">
            {Object.entries(features).slice(0, 14).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <div className="text-white/60">{k}</div>
                <div className="text-white/90 truncate">{String(v)}</div>
              </div>
            ))}
            {Object.keys(features).length > 14 && (
              <div className="text-white/50 mt-2">+ {Object.keys(features).length - 14} autres…</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}