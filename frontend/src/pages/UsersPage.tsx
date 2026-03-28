import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";

export function UsersPage() {
  const { user, logout } = useAuth();

  const mockUsers = [
    { nom: "Admin FraudShield", role: "ADMIN", statut: "Actif" },
    { nom: "Analyste Senior", role: "ANALYSTE", statut: "Actif" },
    { nom: "Responsable Risque", role: "RESP_RISQUE", statut: "Actif" },
  ];

  return (
    <AppShell user={user || undefined} onLogout={logout}>
      <div className="pt-6">
        <div className="mb-5">
          <h1 className="text-[28px] font-extrabold tracking-tight">Utilisateurs</h1>
          <div className="text-white/60">Gestion des accès et rôles de la plateforme.</div>
        </div>

        <div className="grid grid-cols-12 gap-6 mb-6">
          <div className="col-span-12 md:col-span-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="text-white/60 text-sm mb-1">Utilisateurs actifs</div>
            <div className="text-3xl font-bold text-white">3</div>
          </div>

          <div className="col-span-12 md:col-span-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="text-white/60 text-sm mb-1">Rôles disponibles</div>
            <div className="text-3xl font-bold text-white">3</div>
          </div>

          <div className="col-span-12 md:col-span-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="text-white/60 text-sm mb-1">Administration</div>
            <div className="text-sm text-white/80 mt-2">Module préparé pour RBAC et gestion future des accès.</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="text-lg font-semibold mb-4">Liste des utilisateurs</div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-white/70">
                <tr className="border-b border-white/10">
                  <th className="text-left py-3">Nom complet</th>
                  <th className="text-left py-3">Rôle</th>
                  <th className="text-left py-3">Statut</th>
                  <th className="text-left py-3">Niveau d'accès</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((u) => (
                  <tr key={u.nom} className="border-b border-white/10">
                    <td className="py-3 text-white/90">{u.nom}</td>
                    <td className="py-3 text-white/80">{u.role}</td>
                    <td className="py-3">
                      <span className="px-3 py-1 rounded-full border text-xs font-semibold bg-emerald-500/25 border-emerald-300/20 text-emerald-100">
                        {u.statut}
                      </span>
                    </td>
                    <td className="py-3 text-white/70">
                      {u.role === "ADMIN"
                        ? "Administration complète"
                        : u.role === "ANALYSTE"
                        ? "Investigation et validation"
                        : "Supervision et reporting"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}