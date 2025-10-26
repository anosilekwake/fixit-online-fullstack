const API_URL = "http://localhost:4000/api/admin";

export async function loginAdmin(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export async function fetchSubmissions(token) {
  const res = await fetch(`${API_URL}/submissions`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
}
