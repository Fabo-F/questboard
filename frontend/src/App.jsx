import { useEffect, useState, useRef, useCallback } from "react";
import {
  getDashboard,
  createTask,
  completeTask,
  deleteTask,
  login,
  register,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,
  getProjects,
  createProject,
  getProjectTasks,
  deleteProject,
  updateTask,
  updateProject,
  createFeedback,
  getFeedback,
  deleteFeedback,
} from "./api";
import "./App.css";
import { FiEdit, FiEye, FiEyeOff, FiCheck, FiSun, FiMoon } from "react-icons/fi";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";

// --- HELPER COMPONENTS (Moved outside App to fix Hook errors) ---

async function compressAvatar(file, opts = {}) {
  const { size = 256, quality = 0.82, mime = "image/jpeg" } = opts;
  const bitmap = await createImageBitmap(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const side = Math.min(srcW, srcH);
  const sx = Math.floor((srcW - side) / 2);
  const sy = Math.floor((srcH - side) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  if (!blob) throw new Error("Could not compress image");
  const ext = mime === "image/png" ? "png" : "jpg";
  return new File([blob], `avatar.${ext}`, { type: mime });
}

function SortableTaskRow({ t, complete, setConfirmDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: t.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 999 : "auto",
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} className="taskRow">
      <button
        type="button"
        className="btn btn-ghost"
        style={{ cursor: "grab", marginRight: 8, padding: "4px 8px" }}
        {...attributes}
        {...listeners}
        aria-label="Drag quest"
      >
        ⠿
      </button>

      <div className="taskInfo" style={{ flex: 1 }}>
        <div className="taskTitle">{t.title}</div>
        <div className="taskMeta">
          {t.status} • {t.xp} XP
        </div>
      </div>

      {t.status !== "DONE" && (
        <button
          className="btn btn-ghost"
          onClick={() => complete(t.id)}
          title="Complete quest"
        >
          <FiCheck size={16} />
        </button>
      )}

      {t.status !== "DONE" && (
        <button
          className="btn btn-ghost"
          onClick={() => onEdit(t)}
          title="Edit quest"
        >
          <FiEdit size={16} />
        </button>
      )}

      <button
        className="btn btn-ghost"
        onClick={() => setConfirmDelete({ type: "task", id: t.id, title: t.title })}
        title="Delete quest"
      >
        X
      </button>
    </div>
  );
}

function taskOrderKey(projectId) {
  return `qb_taskOrder_${projectId}`;
}

function loadTaskOrder(projectId) {
  try {
    const raw = localStorage.getItem(taskOrderKey(projectId));
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      openIds: Array.isArray(parsed?.openIds) ? parsed.openIds : [],
      doneIds: Array.isArray(parsed?.doneIds) ? parsed.doneIds : [],
    };
  } catch {
    return { openIds: [], doneIds: [] };
  }
}

function saveTaskOrder(projectId, order) {
  localStorage.setItem(taskOrderKey(projectId), JSON.stringify(order));
}

function applyOrderWithStatusGrouping(tasks, savedOrder) {
  const open = tasks.filter((t) => t.status !== "DONE");
  const done = tasks.filter((t) => t.status === "DONE");

  const openMap = new Map(open.map((t) => [t.id, t]));
  const doneMap = new Map(done.map((t) => [t.id, t]));

  const orderedOpen = [];
  const usedOpen = new Set();

  const savedOpenSet = new Set(savedOrder.openIds || []);
  const unknownOpen = open.filter((t) => !savedOpenSet.has(t.id));
  unknownOpen.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  for (const t of unknownOpen) {
    orderedOpen.push(t);
    usedOpen.add(t.id);
  }

  for (const id of savedOrder.openIds || []) {
    const t = openMap.get(id);
    if (t && !usedOpen.has(id)) {
      orderedOpen.push(t);
      usedOpen.add(id);
    }
  }

  const orderedDone = [];
  const usedDone = new Set();

  for (const id of savedOrder.doneIds || []) {
    const t = doneMap.get(id);
    if (t && !usedDone.has(id)) {
      orderedDone.push(t);
      usedDone.add(id);
    }
  }

  const leftoverDone = done.filter((t) => !usedDone.has(t.id));
  leftoverDone.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  orderedDone.push(...leftoverDone);

  return [...orderedOpen, ...orderedDone];
}

function ProjectRouteLoader({
  projects,
  setActiveProject,
  setProjectTasks,
  setProjectLoading,
  showToast,
}) {
  const { projectId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const id = String(projectId);
    if (!id || !projects || projects.length === 0) return;

    const p = projects.find((x) => String(x.id) === id);
    if (!p) {
      navigate("/");
      return;
    }

    setActiveProject(p);
    setProjectLoading(true);

    (async () => {
      try {
        const tasks = await getProjectTasks(p.id);
        const saved = loadTaskOrder(p.id);
        setProjectTasks(applyOrderWithStatusGrouping(tasks, saved));
      } catch (e) {
        console.error(e);
        showToast({ message: e.message || "Failed to load tasks ❌" });
      } finally {
        setProjectLoading(false);
      }
    })();
  }, [projectId, projects, navigate, setActiveProject, setProjectTasks, setProjectLoading, showToast]);

  return null;
}

function getLevel(totalXp) {
  const base = 100;
  const growth = 1.35;
  const maxLevel = 20;

  const levels = [0];
  for (let i = 2; i <= maxLevel + 1; i++) {
    levels.push(levels[levels.length - 1] + Math.round(base * Math.pow(growth, i - 2)));
  }

  let level = 1;
  for (let i = 0; i < levels.length; i++) {
    if (totalXp >= levels[i]) {
      level = i + 1;
    }
  }
  level = Math.min(level, maxLevel);

  const current = levels[level - 1];
  const next = levels[level] || current;
  const progress = next === current ? 1 : Math.min(1, (totalXp - current) / (next - current));

  return { level, progress, next };
}

// --- MAIN APP COMPONENT ---

export default function App() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const [dash, setDash] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [title, setTitle] = useState("");
  const [size, setSize] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [userId, setUserId] = useState(() => {
    const v = localStorage.getItem("qb_userId");
    return v ? Number(v) : null;
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarOk, setAvatarOk] = useState(true);

  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectTasks, setProjectTasks] = useState([]);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskSize, setEditTaskSize] = useState(null);

  const [showEditProject, setShowEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectTitle, setEditProjectTitle] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");

  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("qb_isAdmin") === "true";
  });
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [createProjectLoading, setCreateProjectLoading] = useState(false);
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);

  const navigate = useNavigate();
  const XP_BY_SIZE = { SMALL: 25, MEDIUM: 50, BIG: 100 };
  const toastIdRef = useRef(1);

  const showToast = useCallback((toastObj, duration = 2200) => {
    const id = toastIdRef.current++;
    setToasts((prev) => [{ id, ...toastObj }, ...prev]);
    if (duration !== null) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
  }, []);

  const [theme, setTheme] = useState(() => localStorage.getItem("qb_theme") || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("qb_theme", theme);
  }, [theme]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getDashboard(userId);
      data.tasks = [...data.tasks].sort((a, b) => {
        if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
        return b.id - a.id;
      });
      setDash(data);
      setAvatarVersion((v) => v + 1);
      setAvatarOk(true);
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  const loadFeedback = useCallback(async () => {
    if (!userId || !isAdmin) return;

    try {
      setFeedbackLoading(true);
      const data = await getFeedback(userId);
      setFeedbackList(data);
    } catch (err) {
      showToast({ message: err.message || "Failed to load feedback ❌" });
    } finally {
      setFeedbackLoading(false);
    }
  }, [userId, isAdmin, showToast]);

  useEffect(() => {
    if (isAdmin) {
      loadFeedback();
    }
  }, [isAdmin, loadFeedback]);

  const refreshProjects = useCallback(async () => {
    if (!userId) return;
    try {
      const projs = await getProjects(userId);
      setProjects(projs);
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getDashboard(userId);
        if (!cancelled) {
          data.tasks = [...data.tasks].sort((a, b) => {
            if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
            return b.id - a.id;
          });
          setDash(data);
          const projs = await getProjects(userId);
          setProjects(projs);
          setProfileUsername(data.username || "");
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Handlers
  async function handleAuth(e) {
    e.preventDefault();
    setAuthLoading(true);

    try {
      const u = authMode === "login"
        ? await login(username, password)
        : await register(username, password);

      localStorage.setItem("qb_userId", String(u.id));
      localStorage.setItem("qb_isAdmin", String(!!u.isAdmin));
      setUserId(u.id);
      setIsAdmin(!!u.isAdmin);

      setUsername("");
      setPassword("");
      navigate("/");
    } catch (err) {
      if (authMode === "login") {
        showToast({ message: "Wrong username or password ❌" });
        return;
      }

      if (err.message?.toLowerCase().includes("already")) {
        showToast({ message: "Username already taken ❌" });
        return;
      }

      showToast({ message: "Registration failed ❌" });
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("qb_userId");
    localStorage.removeItem("qb_isAdmin");
    setUserId(null);
    setIsAdmin(false);
    setDash(null);
    setProjects([]);
    setShowProfile(false);
    navigate("/");
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault();

    if (!feedbackName.trim() || !feedbackMessage.trim()) {
      showToast({ message: "Please fill in name and message" });
      return;
    }

    try {
      await createFeedback({
        name: feedbackName.trim(),
        email: feedbackEmail.trim(),
        message: feedbackMessage.trim(),
      });

      showToast({ message: "Feedback sent ✅" });

      setFeedbackName("");
      setFeedbackEmail("");
      setFeedbackMessage("");
    } catch (err) {
      showToast({ message: err.message || "Failed to send feedback ❌" });
    }
  }

  async function handleDeleteFeedback(feedbackId) {
    if (!userId || !isAdmin) return;

    try {
      await deleteFeedback(feedbackId, userId);
      setFeedbackList((prev) => prev.filter((item) => item.id !== feedbackId));
      showToast({ message: "Feedback deleted 🗑️" });
    } catch (err) {
      showToast({ message: err.message || "Failed to delete feedback ❌" });
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!projectTitle.trim()) return;

    setCreateProjectLoading(true);

    try {
      const p = await createProject({
        userId,
        title: projectTitle.trim(),
        description: projectDesc.trim(),
      });

      setProjects((prev) => [p, ...prev]);
      setShowCreateProject(false);
      setProjectTitle("");
      setProjectDesc("");
      showToast({ message: "Project created ✅" });
    } catch (err) {
      showToast({ message: err.message || "Create failed ❌" });
    } finally {
      setCreateProjectLoading(false);
    }
  }

  async function openProject(p) {
    setActiveProject(p);
    navigate(`/project/${p.id}`);
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!size) return showToast({ message: "Pick a quest size first" });

    setCreateTaskLoading(true);

    try {
      const t = await createTask({
        userId,
        projectId: activeProject.id,
        title: title.trim(),
        size: size.trim(),
        xp: XP_BY_SIZE[size],
      });

      setDash((prev) => (prev ? { ...prev, tasks: [t, ...prev.tasks] } : prev));
      setProjectTasks((prev) => [t, ...prev]);

      const order = loadTaskOrder(activeProject.id);
      saveTaskOrder(activeProject.id, {
        openIds: [t.id, ...order.openIds],
        doneIds: order.doneIds,
      });

      setShowCreateTask(false);
      setTitle("");
      setSize(null);
      await refreshProjects();
      showToast({ message: "Quest created ✅" });
    } catch (err) {
      showToast({ message: err.message || "Create failed ❌" });
    } finally {
      setCreateTaskLoading(false);
    }
  }

  function openEditTaskModal(task) {
    setEditingTask(task);
    setEditTaskTitle(task.title || "");
    setEditTaskSize(task.size || null);
    setShowEditTask(true);
  }

  function openEditProjectModal(project) {
    setEditingProject(project);
    setEditProjectTitle(project.title || "");
    setEditProjectDesc(project.description || "");
    setShowEditProject(true);
  }

  async function handleEditTask(e) {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTaskTitle.trim()) return;
    if (!editTaskSize) {
      showToast({ message: "Pick a quest size first" });
      return;
    }

    try {
      const updated = await updateTask(editingTask.id, {
        title: editTaskTitle.trim(),
        size: editTaskSize,
        xp: XP_BY_SIZE[editTaskSize],
      });

      setProjectTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...updated } : t))
      );

      setDash((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === editingTask.id ? { ...t, ...updated } : t
              ),
            }
          : prev
      );

      setShowEditTask(false);
      setEditingTask(null);
      setEditTaskTitle("");
      setEditTaskSize(null);

      await refreshProjects();
      await refresh();

      showToast({ message: "Quest updated ✅" });
    } catch (err) {
      showToast({ message: err.message || "Update failed ❌" });
    }
  }

  async function handleEditProject(e) {
    e.preventDefault();
    if (!editingProject) return;
    if (!editProjectTitle.trim()) return;

    try {
      const updated = await updateProject(editingProject.id, {
        title: editProjectTitle.trim(),
        description: editProjectDesc.trim(),
      });

      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? { ...p, ...updated } : p))
      );

      if (activeProject?.id === editingProject.id) {
        setActiveProject((prev) =>
          prev ? { ...prev, ...updated } : prev
        );
      }

      setShowEditProject(false);
      setEditingProject(null);
      setEditProjectTitle("");
      setEditProjectDesc("");

      await refreshProjects();

      showToast({ message: "Project updated ✅" });
    } catch (err) {
      showToast({ message: err.message || "Update failed ❌" });
    }
  }

  function handleTaskDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeProject?.id) return;

    setProjectTasks((prev) => {
      const activeIdx = prev.findIndex((t) => t.id === active.id);
      const overIdx = prev.findIndex((t) => t.id === over.id);

      if (prev[activeIdx].status !== prev[overIdx].status) return prev;

      const next = arrayMove(prev, activeIdx, overIdx);
      saveTaskOrder(activeProject.id, {
        openIds: next.filter((t) => t.status !== "DONE").map((t) => t.id),
        doneIds: next.filter((t) => t.status === "DONE").map((t) => t.id),
      });
      return next;
    });
  }

  async function complete(id) {
    try {
      await completeTask(id);
      setProjectTasks((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, status: "DONE" } : t));
        const order = loadTaskOrder(activeProject.id);
        const newOrder = {
          openIds: order.openIds.filter((x) => x !== id),
          doneIds: [...order.doneIds, id],
        };
        saveTaskOrder(activeProject.id, newOrder);
        return applyOrderWithStatusGrouping(updated, newOrder);
      });
      showToast({ message: "Quest completed 🎉" });
      await refresh();
      await refreshProjects();
    } catch (e) {
      showToast({ message: "Complete failed ❌" });
    }
  }

  async function handleConfirmDelete() {
    const { type, id } = confirmDelete;
    setConfirmDelete(null);

    try {
      if (type === "task") {
        await deleteTask(id);
        setProjectTasks((prev) => prev.filter((t) => t.id !== id));
        showToast({ message: "Quest deleted 🗑️" });
      } else if (type === "project") {
        await deleteProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (activeProject?.id === id) navigate("/");
        showToast({ message: "Project deleted 🗑️" });
      } else if (type === "feedback") {
        await deleteFeedback(id, userId);
        setFeedbackList((prev) => prev.filter((item) => item.id !== id));
        showToast({ message: "Feedback deleted 🗑️" });
      }

      await refresh();
      await refreshProjects();
    } catch (err) {
      showToast({ message: err.message || "Delete failed ❌" });
    }
  }

  async function saveEditProfile() {
    setSaveProfileLoading(true);

    try {
      if (profileUsername.trim() && profileUsername !== dash.username) {
        await updateProfile(userId, { username: profileUsername.trim() });
      }

      if (avatarFile) {
        const compressed = await compressAvatar(avatarFile);
        await uploadAvatar(userId, compressed);
        setAvatarFile(null);
        setAvatarPreview(null);
      }

      if (currentPw && newPw) {
        await changePassword(userId, currentPw, newPw);
        setCurrentPw("");
        setNewPw("");
      }

      await refresh();
      setShowEditProfile(false);
      setShowProfile(false);
      showToast({ message: "Profile updated ✅" });
    } catch (e) {
      showToast({ message: e.message || "Save failed ❌" });
    } finally {
      setSaveProfileLoading(false);
    }
  }

  async function handleRemoveAvatar() {
    try {
      await deleteAvatar(userId);
      setAvatarOk(false);
      await refresh();
      showToast({ message: "Avatar removed 🗑️" });
    } catch (e) {
      showToast({ message: "Failed to remove avatar ❌" });
    }
  }

  if (!userId) {
    return (
      <div className="page" style={{ justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div className="card authCard" style={{ width: "100%", maxWidth: 360 }}>
          <h1 style={{ textAlign: "center", marginBottom: 24, fontSize: 32, fontWeight: 900 }}>QuestBoard</h1>
          <form onSubmit={handleAuth} className="authInner">
            <div style={{ marginBottom: 16 }}>
              <label className="inputLabel">Username</label>
              <input className="textInput" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="inputLabel">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="textInput"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  style={{ paddingRight: 40 }}
                />
                <button type="button" className="pwToggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              style={{ width: "100%", height: 44, fontSize: 16 }}
              disabled={authLoading}
            >
              {authLoading
                ? authMode === "login"
                  ? "Logging in..."
                  : "Creating account..."
                : authMode === "login"
                  ? "Login"
                  : "Sign Up"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              style={{ width: "100%", marginTop: 12 }}
              disabled={authLoading}
            >
              {authMode === "login" ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </form>
        </div>
        <div className="toastStack">
          {toasts.map((t) => <div key={t.id} className={`toast ${t.type || ""}`}>{t.message}</div>)}
        </div>
      </div>
    );
  }

  if (!dash) return <div className="page" style={{ justifyContent: "center", alignItems: "center" }}><div className="card">Loading dash…</div></div>;

  const levelInfo = getLevel(dash.totalXp);
  const welcomeText = `Welcome back, ${dash.username}!`;
  const inProgressProjects = projects.filter((p) => (p.openTasks ?? 0) > 0).length;
  const totalOpenQuests = projects.reduce((acc, p) => acc + (p.openTasks ?? 0), 0);
  const totalDoneQuests = projects.reduce((acc, p) => acc + ((p.totalTasks ?? 0) - (p.openTasks ?? 0)), 0);
  const nextUp = dash.tasks.filter((t) => t.status !== "DONE").slice(0, 3);
  const AVATAR_URL = `${API}/api/users/${userId}/avatar?v=${avatarVersion}`;

  return (
    <>
      <div className="toastStack">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.type || ""}`}>{t.message}</div>)}
      </div>

      {showProfile && (
        <div className="modalOverlay" onClick={() => setShowProfile(false)}>
          <div 
            className="modal profileModal" 
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", paddingTop: "40px" }}
          >
            {/* --- TOP ACTION BAR --- */}
            <button 
              className="btn" // Removed btn-ghost to allow custom colors
              style={{ 
                position: "absolute", 
                top: "16px", 
                left: "16px", 
                backgroundColor: "#dc3545", // Solid Red
                color: "white",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "600",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                zIndex: 10
              }} 
              onClick={logout}
            >
              Logout
            </button>

            <button 
              className="btn" // Removed btn-ghost
              style={{ 
                position: "absolute", 
                top: "16px", 
                right: "16px",
                backgroundColor: "var(--primary, #007bff)", // Your theme's blue
                color: "white",
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10
              }} 
              onClick={() => setShowEditProfile(true)}
            >
              <FiEdit size={18} />
            </button>

            {/* --- MAIN CONTENT --- */}
            <div className="profileHeader" style={{ textAlign: "center" }}>
              <div className="profileAvatarSmall" style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                overflow: "hidden",
                margin: "0 auto",
                border: "3px solid var(--primary-light, #e0e0e0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {avatarOk ? (
                  <img
                    className="avatarImg"
                    src={`${AVATAR_URL}?v=${avatarVersion}`}
                    alt="avatar"
                    onError={() => setAvatarOk(false)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span className="avatarFallbackSmall" style={{ fontSize: 28 }}>
                    {(dash.username?.[0] || "?").toUpperCase()}
                  </span>
                )}
              </div>
              
              <h2 style={{ margin: "16px 0 4px 0", fontSize: 24, fontWeight: 900 }}>
                {dash.username}
              </h2>
              <div style={{ opacity: 0.7, fontSize: 14, marginBottom: 20 }}>
                Level {levelInfo.level} Adventurer
              </div>
            </div>

            {/* --- STATS SECTION --- */}
            <div className="profileStats" style={{ 
              display: "flex", 
              gap: "40px", 
              justifyContent: "center", 
              borderTop: "1px solid #eee",
              paddingTop: "20px",
              marginTop: "10px"
            }}>
              <div className="pStat" style={{ textAlign: "center" }}>
                <div className="pStatVal" style={{ fontSize: 28, fontWeight: 900 }}>{dash.totalXp}</div>
                <div className="pStatLab" style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase" }}>Total XP</div>
              </div>
              <div className="pStat" style={{ textAlign: "center" }}>
                <div className="pStatVal" style={{ fontSize: 28, fontWeight: 900 }}>{totalDoneQuests}</div>
                <div className="pStatLab" style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase" }}>Quests</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div className="modalOverlay" onClick={() => setShowEditProfile(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>Edit Profile</h3>
            <div style={{ marginBottom: 16 }}>
              <label className="inputLabel">Username</label>
              <input className="textInput" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="inputLabel">Avatar</label>
              <div
                className={`avatarUploadArea ${dragActive ? "active" : ""}`}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
                }}
                onClick={() => document.getElementById("avatarInput").click()}
                style={{
                  border: `2px dashed ${dragActive ? "var(--primary)" : "#dcdcdc"}`,
                  borderRadius: 12,
                  padding: 20,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  color: dragActive ? "var(--primary)" : "#6c757d"
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} className="avatarPreview" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8 }} />
                ) : (
                  <div className="uploadHint">
                    <div style={{ fontSize: 24, marginBottom: 4 }}>☁️</div>
                    <div style={{ fontSize: 14 }}>Click or drag to upload</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>(Max 5MB)</div>
                  </div>
                )}
                <input id="avatarInput" type="file" hidden accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
                }} />
              </div>
              {avatarOk && !avatarPreview && <button className="btn btn-ghost" style={{ width: "100%", marginTop: 10, fontSize: 12 }} onClick={handleRemoveAvatar}>Remove current avatar</button>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="inputLabel">Change Password (optional)</label>
              
              {/* Current Password Field */}
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input
                  type={showCurrentPw ? "text" : "password"}
                  className="textInput"
                  placeholder="Current password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button 
                  type="button" 
                  className="pwToggle" 
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                >
                  {showCurrentPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              {/* New Password Field */}
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPw ? "text" : "password"}
                  className="textInput"
                  placeholder="New password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button 
                  type="button" 
                  className="pwToggle" 
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                  onClick={() => setShowNewPw(!showNewPw)}
                >
                  {showNewPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <div className="modalFooter" style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowEditProfile(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ minWidth: 120, height: 40 }}
                onClick={saveEditProfile}
                disabled={saveProfileLoading}
              >
                {saveProfileLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateProject && (
        <div className="modalOverlay" onClick={() => setShowCreateProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: 16 }}>
                <label className="inputLabel">Project Title</label>
                <input className="textInput" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="e.g. Build a Treehouse" required autoFocus />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="inputLabel">Description (optional)</label>
                <textarea className="textInput" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="What is this project about?" style={{ minHeight: 80, resize: "vertical" }} />
              </div>
              <div className="modalFooter">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateProject(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createProjectLoading}>
                  {createProjectLoading ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateTask && (
        <div className="modalOverlay" onClick={() => setShowCreateTask(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Add New Quest</h3>
            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: 16 }}>
                <label className="inputLabel">Quest Title</label>
                <input className="textInput" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" required autoFocus />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="inputLabel">Quest Size</label>
                <div className="sizeSelector" style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  {Object.entries(XP_BY_SIZE).map(([s, xp]) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "all 0.1s ease",
                        // The Logic: Blue if selected, White if not
                        backgroundColor: size === s ? "var(--primary, #007bff)" : "#ffffff",
                        color: size === s ? "#ffffff" : "#333333",
                        border: size === s ? "1px solid var(--primary, #007bff)" : "1px solid #dcdcdc",
                        fontWeight: size === s ? "700" : "500"
                      }}
                    >
                      {s} ({xp} XP)
                    </button>
                  ))}
                </div>
              </div>
              <div className="modalFooter">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateTask(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createTaskLoading}>
                  {createTaskLoading ? "Creating..." : "Add Quest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditProject && editingProject && (
        <div className="modalOverlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Edit Project</h3>

            <form onSubmit={handleEditProject}>
              <div style={{ marginBottom: 16 }}>
                <label className="inputLabel">Project Title</label>
                <input
                  className="textInput"
                  value={editProjectTitle}
                  onChange={(e) => setEditProjectTitle(e.target.value)}
                  placeholder="e.g. Build a Treehouse"
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="inputLabel">Description (optional)</label>
                <textarea
                  className="textInput"
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  placeholder="What is this project about?"
                  style={{ minHeight: 80, resize: "vertical" }}
                />
              </div>

              <div className="modalFooter">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowEditProject(false);
                    setEditingProject(null);
                    setEditProjectTitle("");
                    setEditProjectDesc("");
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditTask && editingTask && (
        <div className="modalOverlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Edit Quest</h3>

            <form onSubmit={handleEditTask}>
              <div style={{ marginBottom: 16 }}>
                <label className="inputLabel">Quest Title</label>
                <input
                  className="textInput"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="inputLabel">Quest Size</label>
                <div
                  className="sizeSelector"
                  style={{ display: "flex", gap: "10px", marginTop: "8px" }}
                >
                  {Object.entries(XP_BY_SIZE).map(([s, xp]) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditTaskSize(s)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "all 0.1s ease",
                        backgroundColor:
                          editTaskSize === s ? "var(--primary, #007bff)" : "#ffffff",
                        color: editTaskSize === s ? "#ffffff" : "#333333",
                        border:
                          editTaskSize === s
                            ? "1px solid var(--primary, #007bff)"
                            : "1px solid #dcdcdc",
                        fontWeight: editTaskSize === s ? "700" : "500",
                      }}
                    >
                      {s} ({xp} XP)
                    </button>
                  ))}
                </div>
              </div>

              <div className="modalFooter">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowEditTask(false);
                    setEditingTask(null);
                    setEditTaskTitle("");
                    setEditTaskSize(null);
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modalOverlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ marginTop: 0 }}>Delete {confirmDelete.type}?</h3>
            <p style={{ opacity: 0.7, marginBottom: 24 }}>Are you sure you want to delete "<b>{confirmDelete.title}</b>"? This cannot be undone.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <div className="page">
              <header className="header">
                <div className="headerLeft">QuestBoard</div>

                <div className="headerRight">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => navigate("/about")}
                  >
                    About
                  </button>
                  <span className="headerUser">
                    <b>{dash.username}</b>
                  </span>

                  <button
                    className="avatarBtn"
                    onClick={() => setShowProfile(true)}
                    title="Profile"
                  >
                    {avatarOk ? (
                      <img
                        className="avatarImg"
                        src={`${AVATAR_URL}?v=${avatarVersion}`}
                        alt="avatar"
                        onError={() => setAvatarOk(false)}
                      />
                    ) : (
                      <span className="avatarFallback">
                        {(dash.username?.[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </button>

                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  >
                    {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
                  </button>
                </div>
              </header>

              <div className="card">
                <div className="panel">
                  <div>
                    <h2 className="sectionTitle">{welcomeText}</h2>
                  </div>

                  <div className="levelBlock">
                    <div>
                      Level: <b>{levelInfo.level}</b>
                    </div>

                    <div className="progressBar">
                      <div
                        className="progressFill"
                        style={{ width: `${levelInfo.progress * 100}%` }}
                      />
                    </div>

                    <div className="levelHint">
                      {levelInfo.next - dash.totalXp} XP to next level
                    </div>
                  </div>

                  <div className="panel">
                    <h2
                      className="sectionTitle"
                      style={{ fontSize: 18, marginBottom: 6 }}
                    >
                      Dashboard
                    </h2>

                    <div className="dashGrid">
                      <div className="dashStat">
                        <div className="dashLabel">Projects in progress</div>
                        <div className="dashValue">{inProgressProjects}</div>
                      </div>

                      <div className="dashStat">
                        <div className="dashLabel">Open quests to complete</div>
                        <div className="dashValue">{totalOpenQuests}</div>
                      </div>

                      <div className="dashStat">
                        <div className="dashLabel">Completed quests</div>
                        <div className="dashValue">{totalDoneQuests}</div>
                      </div>
                    </div>

                    <div className="dashNextUp">
                      <div className="dashLabel" style={{ marginBottom: 8 }}>
                        Next up
                      </div>

                      {nextUp.length === 0 ? (
                        <div style={{ opacity: 0.7 }}>No open quests 🎉</div>
                      ) : (
                        <div className="dashNextList">
                          {nextUp.map((t) => (
                            <div key={t.id} className="dashNextItem">
                              <div className="taskTitle">{t.title}</div>
                              <div className="taskMeta">
                                {t.status} • {t.xp} XP
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="tasks card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h2 className="sectionTitle">Projects</h2>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateProject(true)}
                  >
                    + New
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div style={{ opacity: 0.7, marginTop: 10 }}>No projects yet.</div>
                ) : (
                  projects.map((p) => {
                    const pct = p.totalTasks
                      ? Math.round(((p.totalTasks - p.openTasks) / p.totalTasks) * 100)
                      : 0;

                    return (
                      <div
                        key={p.id}
                        className="taskRow projectRow"
                        style={{ cursor: "pointer" }}
                        onClick={() => openProject(p)}
                      >
                        <div className="taskInfo" style={{ flex: 1 }}>
                          <div className="taskTitle">{p.title}</div>
                          <div className="taskMeta">
                            {p.openTasks ?? 0} open • {p.totalTasks ?? 0} total
                          </div>
                        </div>

                        <div
                          className="projectRight"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="projectProgressWrap">
                            <div className="projectPct">{pct}%</div>
                            <div className="projectBar">
                              <div
                                className={`projectBarFill ${
                                  pct === 100 ? "isDone" : ""
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <button
                            className="btn btn-ghost"
                            onClick={() => openEditProjectModal(p)}
                            title="Edit project"
                          >
                            <FiEdit size={16} />
                          </button>

                          <button
                            className="btn btn-ghost"
                            onClick={() =>
                              setConfirmDelete({
                                type: "project",
                                id: p.id,
                                title: p.title,
                              })
                            }
                            title="Delete project"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          }
        />

        <Route
          path="/project/:projectId"
          element={
            <>
              <ProjectRouteLoader
                projects={projects}
                setActiveProject={setActiveProject}
                setProjectTasks={setProjectTasks}
                setProjectLoading={setProjectLoading}
                showToast={showToast}
              />

              <div className="page">
                <header className="header">
                  <div className="headerLeft">QuestBoard</div>

                  <div className="headerRight">
                    <div className="headerLevel">
                      <div className="headerLevelText">
                        Lvl: <b>{levelInfo.level}</b>
                      </div>
                      <div className="headerLevelBar">
                        <div
                          className="headerLevelFill"
                          style={{ width: `${levelInfo.progress * 100}%` }}
                        />
                      </div>
                    </div>

                    <span className="headerUser">
                      <b>{dash.username}</b>
                    </span>

                    <button
                      className="avatarBtn"
                      onClick={() => setShowProfile(true)}
                      title="Profile"
                    >
                      {avatarOk ? (
                        <img
                          className="avatarImg"
                          src={`${AVATAR_URL}?v=${avatarVersion}`}
                          alt="avatar"
                          onError={() => setAvatarOk(false)}
                        />
                      ) : (
                        <span className="avatarFallback">
                          {(dash.username?.[0] || "?").toUpperCase()}
                        </span>
                      )}
                    </button>

                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                    >
                      {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
                    </button>
                  </div>
                </header>

                <div className="card">
                  <div className="panel">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        width: "100%",
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>
                          {activeProject?.title}
                        </div>
                        <div style={{ opacity: 0.7 }}>
                          {activeProject?.description}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => openEditProjectModal(activeProject)}
                          title="Edit project"
                        >
                          <FiEdit size={16} />
                        </button>

                        <button
                          className="btn btn-ghost"
                          onClick={() => navigate("/")}
                        >
                          ← Back
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tasks card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h2 className="sectionTitle">Quests</h2>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowCreateTask(true)}
                    >
                      + New
                    </button>
                  </div>

                  {projectLoading ? (
                    <div style={{ opacity: 0.7, marginTop: 10 }}>Loading tasks…</div>
                  ) : (
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={handleTaskDragEnd}
                    >
                      <SortableContext
                        items={projectTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {projectTasks.map((t) => (
                          <SortableTaskRow
                            key={t.id}
                            t={t}
                            complete={complete}
                            setConfirmDelete={setConfirmDelete}
                            onEdit={openEditTaskModal}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            </>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />

        <Route
          path="/about"
          element={
            <div className="page">
              <header className="header">
                <div className="headerLeft">QuestBoard</div>
                <div className="headerRight">
                  <button className="btn btn-ghost" onClick={() => navigate("/")}>
                    ← Back
                  </button>
                  <span className="headerUser"><b>{dash.username}</b></span>
                  <button className="avatarBtn" onClick={() => setShowProfile(true)} title="Profile">
                    {avatarOk ? (
                      <img className="avatarImg" src={`${AVATAR_URL}?v=${avatarVersion}`} alt="avatar" onError={() => setAvatarOk(false)} />
                    ) : (
                      <span className="avatarFallback">{(dash.username?.[0] || "?").toUpperCase()}</span>
                    )}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
                    {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
                  </button>
                </div>
              </header>

              {/* --- About Section --- */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="panel">
                  <h2 className="sectionTitle">About QuestBoard</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <strong style={{ fontSize: 16, marginBottom: 4 }}>
                      A to-do app, but like a game.
                    </strong>
                    <p style={{ opacity: 0.85, lineHeight: 1.6, margin: 0 }}>
                      <strong>QuestBoard</strong> is a gamified task management app that turns everyday tasks into 
                      <strong> quests</strong>. Instead of a normal to-do list, you create projects, complete tasks 
                      for <strong>XP</strong>, and <strong>level up</strong>.
                    </p>
                    <p style={{ opacity: 0.85, lineHeight: 1.6, margin: 0 }}>
                      You can <strong>organize tasks</strong>, move them with <strong>drag-and-drop</strong>, and track 
                      your <strong>progress</strong> as you go.
                    </p>
                    <p style={{ opacity: 0.85, lineHeight: 1.6, margin: 0 }}>
                      I built this project to make productivity feel more engaging and less boring, while also 
                      showcasing my <strong>full-stack development</strong> skills.
                    </p>
                    <p style={{ opacity: 0.85, fontWeight: 600, margin: 0 }}>
                      Tech stack: React, Spring Boot, PostgreSQL, Docker.
                    </p>
                  </div>
                </div>
              </div>

              {/* --- Feedback Form --- */}
              <div className="card">
                <div className="panel">
                  <h2 className="sectionTitle">Feedback</h2>
                  <p style={{ opacity: 0.75, marginBottom: 20 }}>
                    Got ideas, feedback, or found a bug? Let me know.
                  </p>

                  <form onSubmit={handleFeedbackSubmit}>
                    <div style={{ marginBottom: 16 }}>
                      <label className="inputLabel">Name</label>
                      <input
                        className="textInput"
                        placeholder="Your name"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label className="inputLabel">Email (optional)</label>
                      <input
                        className="textInput"
                        placeholder="your@email.com"
                        value={feedbackEmail}
                        onChange={(e) => setFeedbackEmail(e.target.value)}
                      />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label className="inputLabel">Message</label>
                      <textarea
                        className="textInput"
                        placeholder="Write your feedback here..."
                        style={{ minHeight: 120, resize: "vertical" }}
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        required
                      />
                    </div>

                    <div className="modalFooter" style={{ padding: 0, border: "none" }}>
                      <button type="submit" className="btn btn-primary">
                        Send Feedback
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* --- Admin List --- */}
              {isAdmin && (
                <div className="tasks card" style={{ marginTop: 16 }}>
                  <div className="panel">
                    <h2 className="sectionTitle">Submitted Feedback</h2>
                    <div style={{ marginTop: 16 }}>
                      {feedbackLoading ? (
                        <div style={{ opacity: 0.7 }}>Loading feedback…</div>
                      ) : feedbackList.length === 0 ? (
                        <div style={{ opacity: 0.7 }}>No feedback yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {feedbackList.map((item) => (
                            <div key={item.id} className="taskRow" style={{ cursor: "default", display: "flex", alignItems: "flex-start" }}>
                              <div className="taskInfo" style={{ flex: 1 }}>
                                <div className="taskTitle">{item.name}</div>
                                <div className="taskMeta" style={{ marginBottom: 4 }}>
                                  {item.email || "No email provided"}
                                </div>
                                <div className="taskMeta" style={{ marginBottom: 8, fontSize: 11 }}>
                                  Sent: {new Date(item.createdAt).toLocaleString("de-CH")}
                                </div>
                                <div style={{ whiteSpace: "pre-wrap", opacity: 0.9, fontSize: 14 }}>
                                  {item.message}
                                </div>
                              </div>
                              <button
                                className="btn btn-ghost"
                                style={{ color: "var(--text-main)", fontWeight: "bold" }}
                                onClick={() => setConfirmDelete({
                                  type: "feedback",
                                  id: item.id,
                                  title: item.name || "this feedback",
                                })}
                              >
                                X
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
        />
      </Routes>
    </>
  );
}