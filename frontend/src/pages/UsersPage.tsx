import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";

export function UsersPage() {
  const { user, logout } = useAuth();
  return (
    <AppShell user={user || undefined} onLogout={logout}>
      <div className="pt-6">
        <h1 className="text-[22px] font-bold mb-4">Utilisateurs</h1>
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-white/70">
          Étape 1 OK ✅. Étape 3 : RBAC + page users (ADMIN).
        </div>
      </div>
    </AppShell>
  );
}