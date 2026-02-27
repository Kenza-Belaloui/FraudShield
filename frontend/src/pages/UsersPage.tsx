import { AppShell } from "../layout/AppShell";
import { useAuth } from "../auth/AuthContext";

export function UsersPage() {
  const { user, logout } = useAuth();
  return (
    <AppLayout user={user || undefined} onLogout={logout}>
      <div className="pt-6">
        <h1 className="text-[22px] font-bold mb-4">Utilisateurs</h1>
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-white/70">
          Page Utilisateurs prête. Ensuite on branche /auth/users si tu l’as, sinon on la crée.
        </div>
      </div>
    </AppLayout>
  );
}