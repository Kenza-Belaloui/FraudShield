// src/pages/LoginPage.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bg from "../assets/bg-login.png";
import logo from "../assets/logo-shield.png";

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

async function handleLogin() {
  try {
    setError(null);
    setLoading(true);

    const response = await fetch(
      "http://127.0.0.1:8000/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();

    localStorage.setItem("access_token", data.access_token);

    navigate("/dashboard");

  } catch (err) {
    setError("Email ou mot de passe incorrect.");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      {/* BACKGROUND IMAGE */}
      <img
        src={bg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover scale-100"
      />

      {/* GLASS OVERLAY */}
      <div
        className="absolute inset-0 backdrop-blur-[1px]"
        style={{ background: "rgba(17,44,74,0.45)" }}
      />

      <div className="relative z-10 flex min-h-screen items-center pl-24">
        <div className="w-full max-w-[560px]">
          {/* LOGO */}
          <div className="flex items-center gap-3 mb-10">
            <img src={logo} alt="FraudShield" className="w-12 h-12" />
            <span
              className="font-extrabold tracking-tight"
              style={{
                fontSize: "32px",
                color: "#B3EAFF",
              }}
            >
              FraudShield
            </span>
          </div>

          {/* TITLE */}
          <h2
            className="font-semibold leading-tight"
            style={{
              fontSize: "25px",
              lineHeight: "1.12",
            }}
          >
            Plateforme intelligente de
            <br />
            détection de fraude bancaire
          </h2>

          <div className="mt-6 flex items-center gap-5 text-[16px] text-white/70">
            <span>IA</span>
            <span>•</span>
            <span>Temps réel</span>
            <span>•</span>
            <span>Sécurité</span>
          </div>

          {/* LOGIN CARD */}
          <div
            className="mt-10 w-[520px] rounded-2xl p-8 border border-white/10 backdrop-blur-xl shadow-2xl"
            style={{
              background: "rgba(21,47,82,0.10)",
            }}
          >
            {/* EMAIL */}
            <label className="text-[18px] font-semibold text-white/90"> Email </label>
            <div className="relative mt-3 mb-8">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl px-5 py-4 pr-12 text-white placeholder-white/40 outline-none border border-white/10"
                style={{
                  background: "rgba(28,75,121,0.1)",
                }}
                placeholder="Enter email"
              />
            </div>

            {/* PASSWORD */}
            <label className="text-[18px] font-semibold text-white/90">
              Mot de passe
            </label>
            <div className="relative mt-3 mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl px-5 py-4 pr-12 text-white placeholder-white/40 outline-none border border-white/10"
                style={{
                  background: "rgba(28,75,121,0.15)",
                }}
                placeholder="••••••••••••"
              />
            </div>

            {error && (
              <div className="mb-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* BUTTON */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-[18px] transition disabled:opacity-60"
              style={{
                background: "rgba(46,125,201,0.55)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {loading ? "Connexion..." : "🔒 Connexion securisée"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}