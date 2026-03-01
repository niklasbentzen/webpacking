// src/components/AdminLayout/AdminLayout.jsx
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { pb } from "../../lib/pb";
import s from "./AdminLayout.module.css";
import a from "../../pages/admin/Admin.module.css";

export default function AdminLayout({ requireAuth = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(pb.authStore.isValid);

  useEffect(() => {
    // keep in sync with login/logout
    return pb.authStore.onChange(() => {
      setIsLoggedIn(pb.authStore.isValid);
    });
  }, []);

  useEffect(() => {
    if (!requireAuth) return;
    if (!isLoggedIn) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
    }
  }, [isLoggedIn, requireAuth, navigate, location.pathname]);

  function handleLogout() {
    pb.authStore.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className={s.adminWrap}>
      <header className={s.header}>
        <Link to="/admin" className={s.brand}>
          Admin
        </Link>

        <nav className={s.nav}>
          {!isLoggedIn ? (
            <Link to="/login" state={{ from: location.pathname }}>
              Login
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className={a.secondary}
            >
              Logout
            </button>
          )}
        </nav>
      </header>

      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}
