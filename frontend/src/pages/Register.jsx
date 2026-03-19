import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import api from "../services/api";
import { FormGroup, Button } from "../components/ui";
import "./Register.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, password } = form;
    if (!name || !email || !phone || !password) {
      addToast("All fields are required", "error");
      return;
    }
    if (password.length < 8) {
      addToast("Password must be at least 8 characters", "error");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      login(data.token, data.user);
      addToast("Welcome to FinFlow, " + data.user.name + "! 🎉", "success");
      navigate("/app/dashboard");
    } catch (err) {
      addToast(err.response?.data?.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-logo">FinFlow</div>
        <h2 className="register-title">Create Account</h2>
        <p className="register-subtitle">
          Join millions managing money digitally
        </p>

        <form onSubmit={handleSubmit} className="register-form">
          <FormGroup label="Full Name">
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="Aarav Sharma"
            />
          </FormGroup>
          <FormGroup label="Email Address">
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="aarav@example.com"
            />
          </FormGroup>
          <FormGroup label="Phone Number">
            <input
              value={form.phone}
              onChange={set("phone")}
              placeholder="+91 98765 43210"
            />
          </FormGroup>
          <FormGroup label="Password">
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="Min 8 characters"
            />
          </FormGroup>
          <Button
            variant="primary"
            full
            loading={loading}
            className="register-submit-btn"
          >
            Create Account
          </Button>
        </form>

        <p className="register-login-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="register-back-link">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
