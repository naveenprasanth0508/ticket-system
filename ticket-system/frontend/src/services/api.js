import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/me", data),
};

// ─── Tickets ─────────────────────────────────────────────────
export const ticketAPI = {
  create: (data) => api.post("/tickets", data),
  getAll: (params) => api.get("/tickets", { params }),
  getOne: (id) => api.get(`/tickets/${id}`),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  delete: (id) => api.delete(`/tickets/${id}`),
  addComment: (id, text) => api.post(`/tickets/${id}/comments`, { text }),
  getStats: () => api.get("/tickets/stats"),
};

export default api;
