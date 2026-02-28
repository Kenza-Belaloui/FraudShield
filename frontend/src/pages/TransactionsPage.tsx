import { useSearchParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";

export function TransactionsPage() {
  const { user, logout } = useAuth();
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";

  return (
    <AppShell user={user || undefined} onLogout={logout}>
      <div className="pt-6">
        <h1 className="text-[22px] font-bold mb-2">Transactions</h1>
        <div className="text-white/60 mb-4">
          Recherche: <span className="text-white/85">{q || "—"}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-white/70">
          Étape 1 OK ✅. Étape 2 : on branche table + détails + pagination + responsive.
        </div>
      </div>
    </AppShell>
  );
}