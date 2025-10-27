import "./App.css";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./pages/home";
import Page from "./pages/trips";
import Admin from "./pages/admin/admin";
import AdminSegments from "./pages/admin/admin-segments";
import Login from "./pages/admin/login";

import { useSupabaseAuth } from "./utils/service";

function App() {
  const { user } = useSupabaseAuth();

  return (
    <div>
      <nav>
        <Link to="/" style={{ marginRight: "10px" }}>
          Home
        </Link>
        <Link to="/trips" style={{ marginRight: "10px" }}>
          Trips
        </Link>
        {user ? <Link to="/admin">Admin</Link> : <Link to="/login">Login</Link>}
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trips" element={<Page />} />

        {/* Login always exists */}
        <Route
          path="/login"
          element={user ? <Navigate to="/admin" replace /> : <Login />}
        />

        {/* Admin route is protected */}
        <Route
          path="/admin"
          element={user ? <Admin /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin-segments/:id"
          element={user ? <AdminSegments /> : <Navigate to="/login" replace />}
        />

        {/* Catch-all route (optional) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
