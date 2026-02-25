import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setToken } = useAuth();
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      setToken(data.access_token);
      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.35),transparent_45%)]" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_70%,rgba(236,72,153,0.25),transparent_45%)]" />

      <div className="relative w-[1100px] max-w-[95vw] h-[620px] rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl flex">
        {/* Left */}
        <div className="w-[48%] p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30" />
            <div className="text-2xl font-semibold">FraudShield</div>
          </div>

          <div className="mt-8 text-3xl font-semibold leading-tight">
            Connexion sécurisée <br /> à la plateforme
          </div>
          <div className="mt-3 text-sm text-white/70">
            Accédez au tableau de bord, alertes et transactions en temps réel.
          </div>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div>
              <label className="text-sm text-white/80">Email</label>
              <input
                className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-blue-400/60"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: analyste@fraudshield.com"
              />
            </div>

            <div>
              <label className="text-sm text-white/80">Mot de passe</label>
              <input
                type="password"
                className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-blue-400/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {err && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl p-3">
                {err}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-blue-600/70 hover:bg-blue-600 transition px-4 py-3 font-semibold disabled:opacity-60"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>

        {/* Right visual */}
        <div className="w-[52%] relative">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,132,199,0.18),rgba(15,23,42,0.0))]" />
          <div className="absolute right-10 top-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-white/10 bg-white/5" />
        </div>
      </div>
    </div>
  );
}