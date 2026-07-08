// src/components/AdminLayout/AdminLayout.jsx
import React, { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/hooks/useAuth";
import s from "./AdminLayout.module.css";

export default function AdminLayout({ requireAuth = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isAdmin, logout } = useAuth();

  useEffect(() => {
    if (!requireAuth) return;
    if (!isLoggedIn) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
    } else if (!isAdmin) {
      navigate("/", { replace: true });
    }
  }, [isLoggedIn, isAdmin, requireAuth, navigate, location.pathname]);

  useEffect(() => {
    const favicon = document.querySelector("link[rel='icon']");
    const previousHref = favicon?.getAttribute("href");
    favicon?.setAttribute("href", "/bagfra_admin.svg");
    return () => {
      if (previousHref) favicon?.setAttribute("href", previousHref);
    };
  }, []);

  function handleLogout() {
    logout();
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
              className={s.logoutBtn}
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
