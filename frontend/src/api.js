const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function parseError(res) {
  const text = await res.text();

  if (res.status === 401) return "Invalid password";
  if (res.status === 404) return "User not found";
  if (res.status === 409) return "Username already taken";

  return text || `HTTP ${res.status}`;
}

// ===== Dashboard / Tasks =====
export async function getDashboard(userId) {
  const res = await fetch(`${API}/api/users/${userId}/dashboard`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createTask(payload) {
  const res = await fetch(`${API}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function completeTask(id) {
  const res = await fetch(`${API}/api/tasks/${id}/complete`, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deleteTask(taskId) {
  const res = await fetch(`${API}/api/tasks/${taskId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}

// ===== Auth =====
export async function login(username, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function register(username, password) {
  const res = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function changePassword(userId, currentPassword, newPassword) {
  const res = await fetch(`${API}/api/auth/users/${userId}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!res.ok) throw new Error(await parseError(res));
}

// ===== Profile (username only now) =====
export async function updateProfile(userId, { username }) {
  const res = await fetch(`${API}/api/users/${userId}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// ===== Avatar upload/remove (multipart) =====
export async function uploadAvatar(userId, file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API}/api/users/${userId}/avatar`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteAvatar(userId) {
  const res = await fetch(`${API}/api/users/${userId}/avatar`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getProjects(userId) {
  const res = await fetch(`${API}/api/projects/user/${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createProject(payload) {
  const res = await fetch(`${API}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProjectTasks(projectId) {
  const res = await fetch(`${API}/api/tasks/project/${projectId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteProject(projectId) {
  const res = await fetch(`${API}/api/projects/${projectId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function updateProject(projectId, payload) {
  const res = await fetch(`${API}/api/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateTask(taskId, payload) {
  const res = await fetch(`${API}/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createFeedback(payload) {
  const res = await fetch(`${API}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getFeedback(userId) {
  const res = await fetch(`${API}/api/feedback?userId=${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteFeedback(feedbackId, userId) {
  const res = await fetch(`${API}/api/feedback/${feedbackId}?userId=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}