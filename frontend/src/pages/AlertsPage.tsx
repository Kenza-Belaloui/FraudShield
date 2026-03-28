import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { getAlert, listAlerts, takeAlert, type AlertDetail, type AlertItem } from "../api/alerts";
import { simulateFlux, downloadAlertsCsv } from "../api/actions";
import { Search, Download, Plus } from "lucide-react";

export function AlertsPage() {
  const { user, logout } = useAuth();
  const [sp, setSp] = useSearchParams();

  const page = Number(sp.get("page") || "1");
  const criticite = sp.get("criticite") || "";
  const statut = sp.get("statut") || "";
  const search = sp.get("search") || "";

  const [searchInput, setSearchInput] = useState(search);
  const [loading, setLoading] = useState(true);
  const [busySim, setBusySim] = useState(false);
  const [rows, setRows] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AlertDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [taking, setTaking] = useState(false);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function load() {
    setLoading(true);
    try {
      const res = await listAlerts({
        page,
        page_size: pageSize,
        criticite: criticite || undefined,
        statut: statut || undefined,
        search: search || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, criticite, statut, search]);

  async function openDetail(id: string) {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const detail = await getAlert(id);
      setSelected(detail);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleTakeAlert() {
    if (!selectedId) return;
    try {
      setTaking(true);
      await takeAlert(selectedId);
      const refreshed = await getAlert(selectedId);
      setSelected(refreshed);
      await load();
    } finally {
      setTaking(false);
    }
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (!value) next.delete(key);
    else next.set(key, value);
    next.set("page", "1");
    setSp(next);
  }

  function submitSearch() {
    setParam("search", searchInput.trim());
  }

  function goto(p: number) {
    const next = new URLSearchParams(sp);
    next.set("page", String(p));
    setSp(next);
  }

  async function onSimulate() {
    try {
      setBusySim(true);
      await simulateFlux(30);
      await load();
    } finally {
      setBusySim(false);
    }
  }

  async function onExport() {
    await downloadAlertsCsv();
  }

  return (
    <AppShell
      user={user || undefined}
      onLogout={logout}
      onSimulate={onSimulate}
      onExport={onExport}
      onOpenCritical={() => {
        const next = new URLSearchParams(sp);
        next.set("criticite", "ELEVE");
        next.set("page", "1");
        setSp(next);
      }}
    >
      <div className="pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight">Alertes</h1>
            <div className="text-white/60">Surveillance et traitement des alertes de fraude.</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
            >
              <Download size={16} />
              Extraire CSV
            </button>

            <button
              onClick={onSimulate}
              disabled={busySim}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm disabled:opacity-60"
            >
              <Plus size={16} />
              {busySim ? "Génération…" : "Nouvel échantillon"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 mb-5">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-5">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                    placeholder="Rechercher par client ou transaction…"
                    className="w-full rounded-xl pl-10 pr-4 py-3 bg-white/5 border border-white/10 outline-none placeholder:text-white/40 text-sm text-white"
                  />
                </div>
                <button
                  onClick={submitSearch}
                  className="rounded-xl px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
                >
                  Rechercher
                </button>
              </div>
            </div>

            <div className="col-span-6 lg:col-span-3">
              <select
                value={criticite}
                onChange={(e) => setParam("criticite", e.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-[#11284d] border border-white/10 outline-none text-sm text-white"
              >
                <option value="" className="bg-[#11284d] text-white">Criticité (toutes)</option>
                <option value="FAIBLE" className="bg-[#11284d] text-white">Faible</option>
                <option value="MOYEN" className="bg-[#11284d] text-white">Moyen</option>
                <option value="ELEVE" className="bg-[#11284d] text-white">Élevé</option>
              </select>
            </div>

            <div className="col-span-6 lg:col-span-3">
              <select
                value={statut}
                onChange={(e) => setParam("statut", e.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-[#11284d] border border-white/10 outline-none text-sm text-white"
              >
                <option value="" className="bg-[#11284d] text-white">Statut (tous)</option>
                <option value="OUVERTE" className="bg-[#11284d] text-white">Ouverte</option>
                <option value="EN_COURS" className="bg-[#11284d] text-white">En cours</option>
                <option value="CLOTUREE" className="bg-[#11284d] text-white">Clôturée</option>
              </select>
            </div>

            <div className="col-span-12 lg:col-span-1 flex items-center justify-end text-white/60 text-sm">
              {total} total
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="text-white/70">
                <tr className="border-b border-white/10">
                  <th className="text-left py-3">N°</th>
                  <th className="text-left py-3">Montant</th>
                  <th className="text-left py-3">Score</th>
                  <th className="text-left py-3">Criticité</th>
                  <th className="text-left py-3">Client</th>
                  <th className="text-left py-3">Commerçant</th>
                  <th className="text-left py-3">Statut</th>
                  <th className="text-right py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-white/60">
                      Chargement…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-white/60">
                      Aucune alerte trouvée.
                    </td>
                  </tr>
                ) : (
                  rows.map((a, index) => (
                    <tr key={a.idAlerte} className="border-b border-white/10">
                      <td className="py-3 text-white/85 font-semibold">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="py-3 text-white/85">
                        € {a.transaction.montant.toFixed(2)}
                      </td>
                      <td className="py-3 text-white/85">
                        {a.score_final == null ? "—" : a.score_final.toFixed(4)}
                      </td>
                      <td className="py-3">
                        <Badge criticite={a.criticite} />
                      </td>
                      <td className="py-3 text-white/85">
                        {a.client.nom} {a.client.prenom || ""}
                      </td>
                      <td className="py-3 text-white/85">{a.commercant.nom}</td>
                      <td className="py-3 text-white/85">{a.statut}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => openDetail(a.idAlerte)}
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
        </div>

        {selectedId && (
          <AlertDrawer
            alert={selected}
            loading={loadingDetail}
            taking={taking}
            onTake={handleTakeAlert}
            onClose={() => {
              setSelectedId(null);
              setSelected(null);
            }}
          />
        )}
      </div>
    </AppShell>
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

function AlertDrawer({
  alert,
  loading,
  taking,
  onTake,
  onClose,
}: {
  alert: AlertDetail | null;
  loading: boolean;
  taking: boolean;
  onTake: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-[#081a33]/90 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto">
        {loading || !alert ? (
          <div className="text-white/70">Chargement…</div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xl font-bold">Détails de l’alerte</div>
                <div className="text-white/60 text-sm">{new Date(alert.date_creation).toLocaleString()}</div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
              >
                Fermer
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              {alert.statut !== "CLOTUREE" && (
                <button
                  onClick={onTake}
                  disabled={taking}
                  className="rounded-xl px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm disabled:opacity-60"
                >
                  {taking ? "Prise en charge…" : "Prendre en charge"}
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <div className="text-white/70 text-sm mb-2">Criticité</div>
              <Badge criticite={alert.criticite} />
              <div className="mt-4 text-white/70 text-sm mb-2">Statut</div>
              <div className="text-white/90">{alert.statut}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <div className="text-white/70 text-sm mb-2">Transaction</div>
              <div className="text-white/90 text-sm">Montant: € {alert.transaction.montant.toFixed(2)} {alert.transaction.devise}</div>
              <div className="text-white/90 text-sm">Canal: {alert.transaction.canal}</div>
              <div className="text-white/90 text-sm">Statut transaction: {alert.transaction.statut}</div>
              <div className="text-white/90 text-sm">Date: {new Date(alert.transaction.date_heure).toLocaleString()}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <div className="text-white/70 text-sm mb-2">Client & commerçant</div>
              <div className="text-white/90 text-sm">
                Client: {alert.client.nom} {alert.client.prenom || ""}
              </div>
              <div className="text-white/90 text-sm">Commerçant: {alert.commercant.nom}</div>
              {alert.commercant.categorie && (
                <div className="text-white/90 text-sm">Catégorie: {alert.commercant.categorie}</div>
              )}
              {alert.commercant.pays && (
                <div className="text-white/90 text-sm">Pays: {alert.commercant.pays}</div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <div className="text-white/70 text-sm mb-2">Reason codes</div>
              {!alert.reason_details?.length ? (
                <div className="text-white/60 text-sm">—</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {alert.reason_details.map((r) => (
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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <div className="text-white/70 text-sm mb-2">Raison</div>
              <div className="text-white/90 text-sm whitespace-pre-wrap">{alert.raison || "—"}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-white/70 text-sm mb-3">Historique analyste</div>
              {!alert.validations?.length ? (
                <div className="text-white/60 text-sm">Aucune validation enregistrée.</div>
              ) : (
                <div className="space-y-3">
                  {alert.validations.map((v) => (
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
          </>
        )}
      </div>
    </div>
  );
}