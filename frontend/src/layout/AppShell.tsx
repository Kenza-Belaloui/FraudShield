import { ReactNode, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  CreditCard,
  Users,
  Search,
  Mail,
  LogOut,
  PlayCircle,
  FileDown,
  Flame,
} from "lucide-react";

import bg from "../assets/bg-dashboard.png";
import logo from "../assets/logo-shield.png";

export function AppShell({
  children,
  user,
  onLogout,
  onSimulate,
  onExport,
  onOpenCritical,
}: {
  children: ReactNode;
  user?: { nom?: string; prenom?: string };
  onLogout: () => void;
  onSimulate?: () => void;
  onExport?: () => void;
  onOpenCritical?: () => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const fullName = useMemo(() => {
    const nom = user?.nom?.trim() || "";
    const prenom = user?.prenom?.trim() || "";
    const v = `${nom} ${prenom}`.trim();
    return v || "Nom prenom";
  }, [user]);

  function submitSearch() {
    const query = q.trim();
    if (!query) return;
    navigate(`/transactions?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="relative h-screen w-full overflow-hidden text-white">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: "rgba(5,18,40,0.55)" }} />

      <div className="relative z-10 flex h-screen w-full">
        {/* SIDEBAR */}
        <aside className="w-[300px] shrink-0 border-r border-white/10 bg-white/5 backdrop-blur-xl relative">
          <div className="px-6 py-6 flex items-center gap-3">
            <img src={logo} className="h-9 w-9" />
            <div className="font-extrabold text-[22px]" style={{ color: "#B3EAFF" }}>
              FraudShield
            </div>
          </div>

          <nav className="px-4 space-y-3">
            <SideLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="Tableau de bord" />
            <SideLink to="/alerts" icon={<Bell size={18} />} label="Alertes" />
            <SideLink to="/transactions" icon={<CreditCard size={18} />} label="Transactions" />
            <SideLink to="/users" icon={<Users size={18} />} label="Utilisateurs" />
          </nav>

          <div className="mx-4 my-6 border-t border-white/10" />

          <div className="px-4">
            <div className="text-xs tracking-widest text-white/50 mb-3">ALERTES CRITIQUES</div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
              <div className="text-white/70 mb-3">Actions rapides</div>

              <button
                onClick={onSimulate}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                <PlayCircle size={18} />
                Simuler un flux
              </button>

              <button
                onClick={onExport}
                className="mt-3 w-full flex items-center gap-2 rounded-xl px-3 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                <FileDown size={18} />
                Exporter rapport
              </button>

              <button
                onClick={onOpenCritical}
                className="mt-3 w-full flex items-center gap-2 rounded-xl px-3 py-3 bg-red-500/15 border border-red-300/20 hover:bg-red-500/20 transition"
              >
                <Flame size={18} />
                Ouvrir alertes critiques
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-[300px] px-4 pb-6">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 min-w-0 flex flex-col h-screen">
          {/* TOP BAR (comme Figma) */}
          <header className="h-[74px] px-8 flex items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/20 px-3 py-1 text-emerald-200 text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Actif
            </span>

            <div className="flex-1">
              <div className="relative max-w-[720px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                  placeholder="Transaction ID , Client, Merchant..."
                  className="w-full rounded-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 outline-none placeholder:text-white/40"
                />
              </div>
            </div>

            <button className="h-11 w-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
              <Mail size={18} className="text-white/70" />
            </button>

            <div className="flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-4 py-2">
              <div className="text-sm text-white/85">{fullName}</div>
              <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10" />
            </div>
          </header>

          {/* CONTENT */}
          <main className="flex-1 min-h-0 overflow-y-auto px-8 pb-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function SideLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-4 border transition
         ${
           isActive
             ? "bg-white/10 border-white/15"
             : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
         }`
      }
    >
      <div className="text-white/80">{icon}</div>
      <div className="font-semibold">{label}</div>
    </NavLink>
  );
}