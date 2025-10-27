import { useState } from "react";
import supabase from "../../utils/supabase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      console.log(error.message);
    } else {
      setMessage("Login successful!");
      console.log("Login successful!");
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
        <button type="submit" disabled={loading} style={{ padding: "8px" }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {message && <p style={{ color: "gray", marginTop: "10px" }}>{message}</p>}
    </div>
  );
}

export default Login;
