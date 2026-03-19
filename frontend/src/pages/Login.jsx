import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";
import { FormGroup, Button } from "../components/ui";
import "./Login.css";

export default function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      addToast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.token, data.user);
      addToast("Welcome back, " + data.user.name + "!", "success");
      navigate("/app/dashboard");
    } catch (err) {
      addToast(err.response?.data?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">FinFlow</div>
        <h2 className="login-heading">Welcome back</h2>
        <p className="login-subtitle">Sign in to your account securely</p>

        <form onSubmit={handleSubmit} className="login-form">
          <FormGroup label="Email or Phone">
            <input
              value={form.identifier}
              onChange={set("identifier")}
              placeholder="you@example.com"
            />
          </FormGroup>
          <FormGroup label="Password">
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="Your password"
            />
          </FormGroup>
          <Button
            variant="primary"
            full
            loading={loading}
            className="login-btn"
          >
            Sign In
          </Button>
        </form>

        <p className="login-note">
          New to FinFlow?{" "}
          <Link to="/register" className="login-link">
            Create account
          </Link>
        </p>
        <p className="login-back">
          <Link to="/" className="login-back-link">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
