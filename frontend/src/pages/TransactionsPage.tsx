import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { getTransaction, listTransactions, type TxItem } from "../api/transactions";
import { simulateFlux, downloadAlertsCsv } from "../api/actions";
import { createValidation } from "../api/validations";
import cardImg from "../assets/visa-card.png";

export function TransactionsPage() {
  const { user, logout } = useAuth();
  const [sp, setSp] = useSearchParams();

  const page = Number(sp.get("page") || "1");
  const q = sp.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TxItem[]>([]);
  const [total, setTotal] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TxItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function rowNumber(index: number) {
    return (page - 1) * pageSize + index + 1;
  }

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
          <section className="col-span-12 xl:col-span-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Pill label="Total" value={total} />
              <Pill label="Acceptées" value={pills.accepted} />
              <Pill label="Refusées" value={pills.refused} />
              <Pill label="En attente" value={pills.pending} />
            </div>

            <div className="hidden lg:block">
              <table className="w-full text-sm table-fixed">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 w-[10%]">N°</th>
                    <th className="text-left py-3 w-[24%]">Client</th>
                    <th className="text-left py-3 w-[14%]">Canal</th>
                    <th className="text-left py-3 w-[16%]">Montant</th>
                    <th className="text-left py-3 w-[22%]">Commerçant</th>
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
                    rows.map((t, index) => (
                      <tr key={t.idTransac} className="border-b border-white/10">
                        <td className="py-3 text-white/85 truncate">{rowNumber(index)}</td>
                        <td className="py-3 text-white/85 truncate">
                          {t.client ? `${t.client.nom} ${t.client.prenom || ""}` : "—"}
                        </td>
                        <td className="py-3 text-white/85 truncate">{t.canal}</td>
                        <td className="py-3 text-white/85 truncate">€ {Number(t.montant).toFixed(2)}</td>
                        <td className="py-3 text-white/85 truncate">{t.commercant?.nom || "—"}</td>
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

            <div className="lg:hidden space-y-3">
              {loading ? (
                <div className="py-10 text-center text-white/60">Chargement…</div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-white/60">Aucune transaction trouvée.</div>
              ) : (
                rows.map((t, index) => (
                  <div key={t.idTransac} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white/85 font-semibold truncate">
                          {t.client ? `${t.client.nom} ${t.client.prenom || ""}` : "—"}
                        </div>
                        <div className="text-white/60 text-xs truncate">
                          Transaction n° {rowNumber(index)}
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
              <TxDetails tx={selected} cardImg={cardImg} />
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

  const label = statut === "ACCEPTEE" ? "Acceptée" : statut === "REFUSEE" ? "Refusée" : "En attente";

  return <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${cls}`}>{label}</span>;
}

function CritBadge({ criticite }: { criticite: string }) {
  const cls =
    criticite === "ELEVE"
      ? "bg-red-500/25 border-red-300/20 text-red-100"
      : criticite === "MOYEN"
      ? "bg-yellow-500/25 border-yellow-300/20 text-yellow-100"
      : "bg-emerald-500/25 border-emerald-300/20 text-emerald-100";

  return <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${cls}`}>{criticite}</span>;
}

function Gauge({ percent }: { percent: number }) {
  const angle = Math.max(0, Math.min(100, percent)) * 3.6;

  return (
    <div className="relative h-[92px] w-[92px]">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(rgba(255,80,80,0.95) 0deg ${angle}deg, rgba(255,255,255,0.10) ${angle}deg 360deg)`,
        }}
      />
      <div className="absolute inset-[10px] rounded-full bg-[#081a33]/70 border border-white/10" />
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <div className="text-white font-bold text-lg">{percent}%</div>
        <div className="text-white/60 text-[10px] -mt-1">Risque</div>
      </div>
    </div>
  );
}

function TxDetails({ tx, cardImg }: { tx: any; cardImg: string }) {
  const score = tx?.alerte?.score_final ?? null;
  const criticite = tx?.alerte?.criticite ?? null;
  const reasons: Array<{ code: string; label: string }> = tx?.reason_details || [];
  const features = tx?.features || null;
  const validations: Array<any> = tx?.validations || [];

  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const score01 = score == null ? 0 : Math.max(0, Math.min(1, Number(score)));
  const percent = Math.round(score01 * 100);

  const idAlerte: string | null = tx?.alerte?.idAlerte || null;

  const featureLabels: Record<string, string> = {
    Amount: "Montant",
    is_debit: "Opération débit",
    nb_tx_24h: "Nombre de transactions sur 24h",
    heure_nuit: "Transaction nocturne",
    is_cash_in: "Type cash in",
    is_payment: "Type paiement",
    client_pays: "Pays du client",
    is_cash_out: "Type cash out",
    is_transfer: "Type transfert",
    ratio_revenu: "Ratio montant / revenu",
    avg_amount_7d: "Montant moyen sur 7 jours",
    client_segment: "Segment client",
    isFlaggedFraud: "Fraude signalée",
    depasse_plafond: "Dépassement du plafond",
  };

  async function decide(decision: "LEGITIME" | "FRAUDE") {
    if (!idAlerte) {
      setMsg("Aucune alerte liée à cette transaction.");
      return;
    }

    setMsg(null);
    setBusy(true);
    try {
      await createValidation({
        idAlerte,
        decision,
        commentaire: comment || (decision === "FRAUDE" ? "Fraude confirmée." : "Transaction légitime."),
      });
      setMsg("Décision enregistrée ✅");
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "Erreur lors de l’enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-white/70 text-sm">
        Détail transaction • {new Date(tx.date_heure).toLocaleString()}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white/80 text-sm font-semibold">{tx.statut || "En attente"}</div>
          <span className="text-white/60 text-xs">{tx.canal}</span>
        </div>

        <img src={cardImg} alt="" className="w-full rounded-xl border border-white/10" />

        <div className="mt-4 text-sm text-white/80 space-y-1">
          <div className="flex justify-between">
            <span className="text-white/60">Montant</span>
            <span className="text-white/90">€ {Number(tx.montant).toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/60">Client</span>
            <span className="text-white/90">
              {tx.client ? `${tx.client.nom} ${tx.client.prenom || ""}` : "—"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/60">Commerçant</span>
            <span className="text-white/90">{tx.commercant?.nom || "—"}</span>
          </div>

          {tx.commercant?.pays && (
            <div className="flex justify-between">
              <span className="text-white/60">Pays marchand</span>
              <span className="text-white/90">{tx.commercant.pays}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
        <div>
          <div className="text-white/70 text-sm mb-1">Score de risque</div>
          <div className="text-white/90 font-bold text-2xl">{score == null ? "—" : score01.toFixed(2)}</div>
          <div className="mt-2">
            <CritBadge criticite={criticite || "FAIBLE"} />
          </div>
          <div className="mt-3 text-xs text-white/60">
            Statut alerte : {tx?.alerte?.statut || "Aucune alerte"}
          </div>
        </div>
        <Gauge percent={percent} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/70 text-sm mb-2">Reason codes</div>
        {reasons.length === 0 ? (
          <div className="text-white/60 text-sm">—</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <span
                key={r.code}
                className="text-xs rounded-full px-3 py-1 bg-white/5 border border-white/10 text-white/85"
                title={r.code}
              >
                {r.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/70 text-sm mb-2">Commentaire analyste</div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Ex: montant élevé + pays inhabituel + activité intense…"
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none placeholder:text-white/40 text-sm"
        />

        {msg && <div className="mt-3 text-sm text-white/80">{msg}</div>}

        <div className="mt-4 flex gap-3">
          <button
            disabled={busy || !idAlerte}
            onClick={() => decide("LEGITIME")}
            className="flex-1 rounded-xl px-4 py-3 bg-emerald-500/20 border border-emerald-300/20 hover:bg-emerald-500/25 transition text-sm font-semibold disabled:opacity-60"
          >
            Valider la transaction
          </button>

          <button
            disabled={busy || !idAlerte}
            onClick={() => decide("FRAUDE")}
            className="flex-1 rounded-xl px-4 py-3 bg-red-500/20 border border-red-300/20 hover:bg-red-500/25 transition text-sm font-semibold disabled:opacity-60"
          >
            Rejeter la transaction
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/70 text-sm mb-3">Historique de validation</div>
        {validations.length === 0 ? (
          <div className="text-white/60 text-sm">Aucune validation enregistrée.</div>
        ) : (
          <div className="space-y-3">
            {validations.map((v) => (
              <div key={v.idValidation} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="text-sm text-white/90 font-semibold">{v.decision}</div>
                  <div className="text-xs text-white/50">
                    {v.date_creation ? new Date(v.date_creation).toLocaleString() : "—"}
                  </div>
                </div>
                <div className="text-sm text-white/70">{v.commentaire}</div>
                <div className="text-xs text-white/50 mt-2">
                  {v.utilisateur?.nom_complet || "Utilisateur inconnu"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/70 text-sm mb-2">Indicateurs d’analyse</div>
        {!features ? (
          <div className="text-white/60 text-sm">—</div>
        ) : (
          <div className="text-xs text-white/80 space-y-1">
            {Object.entries(features).slice(0, 12).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <div className="text-white/60">{featureLabels[k] || k}</div>
                <div className="text-white/90 truncate">
                  {typeof v === "number" ? Number(v).toFixed(2) : String(v)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}