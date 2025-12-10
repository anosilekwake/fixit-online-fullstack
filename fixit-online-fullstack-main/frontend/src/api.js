import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export async function submitForm(payload) {
  const res = await axios.post(`${API_BASE}/submit`, payload);
  return res.data;
}

export async function adminLogin(email, password) {
  const res = await axios.post(`${API_BASE.replace('/api','')}/api/auth/login`, { email, password });
  return res.data;
}

export async function fetchSubmissions(token) {
  const res = await axios.get(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
