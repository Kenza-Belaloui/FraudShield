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
        <aside className="w-[300px] shrink-0 border-r border-white/10 bg-white/5 backdrop-blur-xl flex flex-col">

          {/* TOP */}
          <div className="px-5 py-5 flex items-center gap-2">
            <img src={logo} className="h-8 w-8" />
            <div className="font-extrabold text-[20px]" style={{ color: "#B3EAFF" }}>
              FraudShield
            </div>
          </div>

          {/* NAV */}
          <nav className="px-3 space-y-2">
            <SideLink to="/dashboard" icon={<LayoutDashboard size={16} />} label="Tableau de bord" />
            <SideLink to="/alerts" icon={<Bell size={16} />} label="Alertes" />
            <SideLink to="/transactions" icon={<CreditCard size={16} />} label="Transactions" />
            <SideLink to="/users" icon={<Users size={16} />} label="Utilisateurs" />
          </nav>

          <div className="mx-4 my-12 border-t border-white/10" />

          {/* ACTIONS */}
          <div className="px-3">
            <div className="text-[11px] tracking-widest text-white/50 mb-2">
              ALERTES CRITIQUES
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-3">
              <div className="text-white/70 mb-2 text-sm">Actions rapides</div>

              <button
                onClick={onSimulate}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
              >
                <PlayCircle size={16} />
                Simuler un flux
              </button>

              <button
                onClick={onExport}
                className="mt-2 w-full flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
              >
                <FileDown size={16} />
                Exporter rapport
              </button>

              <button
                onClick={onOpenCritical}
                className="mt-2 w-full flex items-center gap-2 rounded-lg px-3 py-2 bg-red-500/15 border border-red-300/20 hover:bg-red-500/20 transition text-sm"
              >
                <Flame size={16} />
                Ouvrir alertes critiques
              </button>
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-auto px-4 pb-5">
            <div className="mb-3 border-t border-white/10" />
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
            >
              <LogOut size={16} />
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