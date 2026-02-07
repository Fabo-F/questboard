const API = "http://localhost:8080";

export async function getDashboard(userId) {
  const res = await fetch(`${API}/api/users/${userId}/dashboard`);
  if (!res.ok) throw new Error("Dashboard load failed");
  return res.json();
}

export async function createTask(payload) {
  const res = await fetch(`${API}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function completeTask(id) {
  await fetch(`${API}/api/tasks/${id}/complete`, { method: "POST" });
}

export async function deleteTask(taskId) {
  const res = await fetch(`${API}/api/tasks/${taskId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

async function parseError(res) {
  const text = await res.text();
  return text || `HTTP ${res.status}`;
}

export async function login(username, password) {
  const res = await fetch("http://localhost:8080/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function register(username, password) {
  const res = await fetch("http://localhost:8080/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}