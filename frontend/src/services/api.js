import axios from "axios";

const baseURL ="https://finflow-g8bp.onrender.com/api"|| "http://localhost:5000/api";
const api = axios.create({
  baseURL,
  timeout: 10000,
});
// "https://finflow-g8bp.onrender.com/api"
// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ff_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ff_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
