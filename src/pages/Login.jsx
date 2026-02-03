import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pb } from "../lib/pb";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // if user was redirected here from a protected page
  const next = new URLSearchParams(location.search).get("next") || "/admin";

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await pb.collection("users").authWithPassword(username.trim(), password);

      // Optional: basic "admin" gate right here
      const isAdmin = !!pb.authStore.model?.admin;
      if (!isAdmin) {
        pb.authStore.clear();
        throw new Error("Your account does not have admin access.");
      }

      navigate(next, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>Log in</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>Admin access required.</p>

        <label style={{ display: "grid", gap: 6 }}>
          Username
          <input
            type="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Password
          <input
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showPw}
            onChange={(e) => setShowPw(e.target.checked)}
          />
          Show password
        </label>

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
          {loading ? "Logging in…" : "Log in"}
        </button>

        <button
          type="button"
          onClick={() => {
            pb.authStore.clear();
            navigate("/", { replace: true });
          }}
          style={{
            background: "transparent",
            border: "1px solid rgba(0,0,0,0.15)",
          }}
        >
          Cancel
        </button>
      </form>
    </main>
  );
}
