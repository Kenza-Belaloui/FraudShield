import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { listAlerts, type AlertItem } from "../api/alerts";
import { simulateFlux, downloadAlertsCsv } from "../api/actions";
import { Search, Download, Plus } from "lucide-react";

export function AlertsPage() {
  const { user, logout } = useAuth();
  const [sp, setSp] = useSearchParams();

  const page = Number(sp.get("page") || "1");
  const criticite = sp.get("criticite") || "";
  const statut = sp.get("statut") || "";
  const search = sp.get("search") || "";

  const [loading, setLoading] = useState(true);
  const [busySim, setBusySim] = useState(false);
  const [rows, setRows] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AlertItem | null>(null);

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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, criticite, statut, search]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (!value) next.delete(key);
    else next.set(key, value);
    next.set("page", "1");
    setSp(next);
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

        {/* Filters */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 mb-5">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-5">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  value={search}
                  onChange={(e) => setParam("search", e.target.value)}
                  placeholder="ID transaction, nom client…"
                  className="w-full rounded-xl pl-10 pr-4 py-3 bg-white/5 border border-white/10 outline-none placeholder:text-white/40 text-sm"
                />
              </div>
            </div>

            <div className="col-span-6 lg:col-span-3">
              <select
                value={criticite}
                onChange={(e) => setParam("criticite", e.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-sm"
              >
                <option value="">Criticité (toutes)</option>
                <option value="FAIBLE">Faible</option>
                <option value="MOYEN">Moyen</option>
                <option value="ELEVE">Élevé</option>
              </select>
            </div>

            <div className="col-span-6 lg:col-span-3">
              <select
                value={statut}
                onChange={(e) => setParam("statut", e.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 outline-none text-sm"
              >
                <option value="">Statut (tous)</option>
                <option value="OUVERTE">Ouverte</option>
                <option value="EN_COURS">En cours</option>
                <option value="CLOTUREE">Clôturée</option>
              </select>
            </div>

            <div className="col-span-12 lg:col-span-1 flex items-center justify-end text-white/60 text-sm">
              {total} total
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="text-white/70">
                <tr className="border-b border-white/10">
                  <th className="text-left py-3">ID Transaction</th>
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
                  rows.map((a) => (
                    <tr key={a.idAlerte} className="border-b border-white/10">
                      <td className="py-3 text-white/85">{a.transaction.idTransac.slice(0, 10)}…</td>
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
                          onClick={() => setSelected(a)}
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
        </div>

        {/* Drawer */}
        {selected && (
          <AlertDrawer alert={selected} onClose={() => setSelected(null)} />
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

function AlertDrawer({ alert, onClose }: { alert: AlertItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-[#081a33]/90 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto">
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

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
          <div className="text-white/70 text-sm mb-2">Criticité</div>
          <Badge criticite={alert.criticite} />
          <div className="mt-4 text-white/70 text-sm mb-2">Statut</div>
          <div className="text-white/90">{alert.statut}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
          <div className="text-white/70 text-sm mb-2">Transaction</div>
          <div className="text-white/90 text-sm">ID: {alert.transaction.idTransac}</div>
          <div className="text-white/90 text-sm">Montant: € {alert.transaction.montant.toFixed(2)} {alert.transaction.devise}</div>
          <div className="text-white/90 text-sm">Canal: {alert.transaction.canal}</div>
          <div className="text-white/90 text-sm">Date: {new Date(alert.transaction.date_heure).toLocaleString()}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
          <div className="text-white/70 text-sm mb-2">Client</div>
          <div className="text-white/90 text-sm">
            {alert.client.nom} {alert.client.prenom || ""}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-white/70 text-sm mb-2">Raison</div>
          <div className="text-white/90 text-sm whitespace-pre-wrap">
            {alert.raison || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}