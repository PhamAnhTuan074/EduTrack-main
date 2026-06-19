// Nguoi code: Phạm Anh Tuấn. Pham vi: bao ve route theo dang nhap va vai tro.

import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

const INACTIVITY_LIMIT = 30 * 60 * 1000;

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function hasValidScope(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Boolean(payload.organizationId);
  } catch {
    return false;
  }
}

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const tokenExpiry = token ? getTokenExpiry(token) : null;
  const hasScope = token ? hasValidScope(token) : false;
  const isTokenExpired = token ? !tokenExpiry || tokenExpiry <= Date.now() || !hasScope : true;

  useEffect(() => {
    if (!token || isTokenExpired) {
      return undefined;
    }

    let timeoutId;
    let expiryTimeoutId;

    function logoutByInactivity() {
      clearSession();
      navigate("/login", { replace: true });
    }

    function resetTimer() {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(logoutByInactivity, INACTIVITY_LIMIT);
    }

    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();
    expiryTimeoutId = window.setTimeout(logoutByInactivity, Math.max(tokenExpiry - Date.now(), 0));

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(expiryTimeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [isTokenExpired, navigate, token, tokenExpiry]);

  if (!token || isTokenExpired) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  return children;
}
