import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-login.png";
import logo from "../assets/logo-shield.png";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    try {
      setError(null);
      setLoading(true);
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: "rgba(17,44,74,0.45)" }} />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center justify-center lg:justify-start px-6 sm:px-10 lg:pl-24 py-10">
          <div className="w-full max-w-[560px]">
            <div className="flex items-center gap-3 mb-10">
              <img src={logo} alt="FraudShield" className="w-12 h-12" />
              <span className="font-extrabold tracking-tight text-[32px]" style={{ color: "#B3EAFF" }}>
                FraudShield
              </span>
            </div>

            <h2 className="font-semibold leading-tight text-[25px]" style={{ lineHeight: "1.12" }}>
              Plateforme intelligente de
              <br />
              detection de fraude bancaire
            </h2>

            <div className="mt-6 flex items-center gap-5 text-[16px] text-white/70">
              <span>IA</span>
              <span>•</span>
              <span>Temps reele</span>
              <span>•</span>
              <span>Securite</span>
            </div>

            <div
              className="mt-10 w-full max-w-[520px] rounded-2xl p-8 border border-white/10 backdrop-blur-xl shadow-2xl"
              style={{ background: "rgba(21,47,82,0.10)" }}
            >
              <label className="text-[18px] font-semibold text-white/90">Email</label>
              <div className="relative mt-3 mb-8">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-5 py-4 pr-12 text-white placeholder-white/40 outline-none border border-white/10"
                  style={{ background: "rgba(28,75,121,0.10)" }}
                  placeholder="Enter email"
                />
              </div>

              <label className="text-[18px] font-semibold text-white/90">Mot de passe</label>
              <div className="relative mt-3 mb-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl px-5 py-4 pr-12 text-white placeholder-white/40 outline-none border border-white/10"
                  style={{ background: "rgba(28,75,121,0.15)" }}
                  placeholder="••••••••••••"
                />
              </div>

              {error && <div className="mb-4 text-red-300 text-sm">{error}</div>}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-[18px] transition disabled:opacity-60"
                style={{
                  background: "rgba(46,125,201,0.55)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {loading ? "Connexion..." : "🔒 Connexion securise"}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block" />
      </div>
    </div>
  );
}