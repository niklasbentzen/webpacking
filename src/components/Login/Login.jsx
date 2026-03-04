import { useState } from "react";
import { Link } from "react-router-dom";
import s from "./Login.module.css";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Login({ onSuccess, onError, redirectTo }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, isLoggedIn } = useAuth();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login("dotwatcher", password);

      onSuccess?.({ user, redirectTo });
    } catch (err) {
      const message = err?.message || "Login failed";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ width: "100%", display: "grid", gap: 12 }}
    >
      <label style={{ display: "grid", gap: 6 }}>
        Access Code
        <input
          type={showPw ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "start" }}>
        <div>
          <input
            type="checkbox"
            checked={showPw}
            onChange={(e) => setShowPw(e.target.checked)}
          />
          <span> Show code</span>
        </div>
      </label>

      {isLoggedIn && (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            background: "rgba(0,255,0,0.08)",
          }}
        >
          You are already logged in.
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            background: "rgba(255,0,0,0.08)",
          }}
        >
          {error}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? "Loading..." : "Enter"}
      </button>

      <div className={s.adminLoginContainer}>
        <Link to="/logn" style={{ fontSize: "0.8em" }}>
          Admin login
        </Link>
      </div>
    </form>
  );
}
