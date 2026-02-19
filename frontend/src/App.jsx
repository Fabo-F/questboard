import { useEffect, useState, useRef } from "react";
import { getDashboard, createTask, completeTask, deleteTask, login, register, updateProfile, changePassword, uploadAvatar, deleteAvatar,getProjects, createProject, getProjectTasks, deleteProject } from "./api";
import "./App.css";
import { FiEdit, FiEye, FiEyeOff, FiCheck, FiSun, FiMoon } from "react-icons/fi";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";



async function compressAvatar(file, opts = {}) {
  const {
    size = 256,
    quality = 0.82,
    mime = "image/jpeg",
  } = opts;

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

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, mime, quality)
  );

  if (!blob) throw new Error("Could not compress image");

  const ext = mime === "image/png" ? "png" : "jpg";
  return new File([blob], `avatar.${ext}`, { type: mime });
}

function SortableTaskRow({ t, complete, setConfirmDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: t.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="taskRow">
      <button
        type="button"
        className="btn btn-ghost"
        style={{ cursor: "grab", marginRight: 8 }}
        {...attributes}
        {...listeners}
        aria-label="Drag quest"
        onClick={(e) => e.preventDefault()}
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
        <button className="btn btn-ghost" onClick={() => complete(t.id)}>
          <FiCheck size={16} />
        </button>
      )}

      <button
        className="btn btn-ghost"
        onClick={() =>
          setConfirmDelete({ type: "task", id: t.id, title: t.title })
        }
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
  const open = tasks.filter(t => t.status !== "DONE");
  const done = tasks.filter(t => t.status === "DONE");

  const openMap = new Map(open.map(t => [t.id, t]));
  const doneMap = new Map(done.map(t => [t.id, t]));

  const orderedOpen = [];
  const usedOpen = new Set();

  const savedOpenSet = new Set(savedOrder.openIds || []);
  const unknownOpen = open.filter(t => !savedOpenSet.has(t.id));
  unknownOpen.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  for (const t of unknownOpen) {
    orderedOpen.push(t);
    usedOpen.add(t.id);
  }

  for (const id of (savedOrder.openIds || [])) {
    const t = openMap.get(id);
    if (t && !usedOpen.has(id)) {
      orderedOpen.push(t);
      usedOpen.add(id);
    }
  }

  const orderedDone = [];
  const usedDone = new Set();
  for (const id of (savedOrder.doneIds || [])) {
    const t = doneMap.get(id);
    if (t && !usedDone.has(id)) {
      orderedDone.push(t);
      usedDone.add(id);
    }
  }
  const leftoverDone = done.filter(t => !usedDone.has(t.id));
  leftoverDone.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  orderedDone.push(...leftoverDone);

  return [...orderedOpen, ...orderedDone];
}


export default function App() {
  const [dash, setDash] = useState(null);
  const [page, setPage] = useState("home");

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

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const [projectTasks, setProjectTasks] = useState([]);

  const XP_BY_SIZE = {
    SMALL: 25,
    MEDIUM: 50,
    BIG: 100,
  }
  const toastIdRef = useRef(1);
  const openTasksCount = dash?.tasks?.filter(t => t.status !== "DONE").length ?? 0;
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("qb_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("qb_theme", theme);
  }, [theme]);

  function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({ message: "Only images allowed 🖼️" });
      return;
    }

    if (file.size > 5_000_000) {
      showToast({ message: "Max 5MB image" });
      return;
    }

    setAvatarFile(file);

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function refreshProjects() {
    if (!userId) return;
    const projs = await getProjects(userId);
    console.log("projects from API:", projs);
    setProjects(projs);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDragLeave() {
    setDragActive(false);
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    try {
      const p = await createProject({
        userId,
        title: projectTitle.trim(),
        description: projectDesc.trim(),
      });

      setProjects(prev => [p, ...prev]);
      setShowCreateProject(false);
      setProjectTitle("");
      setProjectDesc("");

      showToast({ message: "Project created ✅" });
    } catch (e2) {
      console.error(e2);
      showToast({ message: e2.message || "Create failed ❌" });
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();

    if (!size) {
      showToast({ message: "Pick a quest size first" });
      return;
    }

    try {
      const t = await createTask({
        userId,
        projectId: activeProject.id,
        title: title.trim(),
        size: size.trim(),
        xp: XP_BY_SIZE[size],
      });
      setDash(prev => prev ? { ...prev, tasks: [t, ...prev.tasks] } : prev);

      setProjectTasks(prev => [t, ...prev]);

      const order = loadTaskOrder(activeProject.id);
      saveTaskOrder(activeProject.id, {
        openIds: [t.id, ...order.openIds.filter(id => id !== t.id)],
        doneIds: order.doneIds,
      });

      setShowCreateTask(false);
      setTitle("");
      setSize(null);
      await refreshProjects();

      showToast({ message: "Quest created ✅" });
    } catch (e2) {
      console.error(e2);
      showToast({ message: e2.message || "Create failed ❌" });
    }
  }

  function handleTaskDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!activeProject?.id) return;

    setProjectTasks((prev) => {
      const activeTask = prev.find(t => t.id === active.id);
      const overTask = prev.find(t => t.id === over.id);
      if (!activeTask || !overTask) return prev;

      const activeGroup = activeTask.status === "DONE" ? "DONE" : "OPEN";
      const overGroup = overTask.status === "DONE" ? "DONE" : "OPEN";

      if (activeGroup !== overGroup) return prev;

      const next = arrayMove(
        prev,
        prev.findIndex(t => t.id === active.id),
        prev.findIndex(t => t.id === over.id)
      );

      // const order = loadTaskOrder(activeProject.id);
      const openIds = next.filter(t => t.status !== "DONE").map(t => t.id);
      const doneIds = next.filter(t => t.status === "DONE").map(t => t.id);

      saveTaskOrder(activeProject.id, { openIds, doneIds });

      return next;
    });
  }

  // function orderKey(projectId) {
  //   return `qb_taskOrder_${projectId}`;
  // }

  // function applySavedOrder(tasks, savedIds) {
  //   if (!Array.isArray(savedIds) || savedIds.length === 0) return tasks;

  //   const map = new Map(tasks.map(t => [t.id, t]));
  //   const ordered = [];

  //   for (const id of savedIds) {
  //     const t = map.get(id);
  //     if (t) {
  //       ordered.push(t);
  //       map.delete(id);
  //     }
  //   }

  //   for (const t of tasks) {
  //     if (map.has(t.id)) ordered.push(t);
  //   }

  //   return ordered;
  // }

  async function openProject(p) {
    setActiveProject(p);
    setPage("project");

    try {
      const tasks = await getProjectTasks(p.id);

      const saved = loadTaskOrder(p.id);
      setProjectTasks(applyOrderWithStatusGrouping(tasks, saved));
    } catch (e) {
      console.error(e);
      showToast({ message: e.message || "Failed to load tasks ❌" });
    }
  }

  async function handleConfirmDelete() {
    const { type, id } = confirmDelete;
    setConfirmDelete(null);

    if (type === "task") {
      setProjectTasks((prev) => prev.filter((t) => t.id !== id));
      setDash((prev) =>
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev
      );
    }

    if (type === "project") {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject === id) {
        setActiveProject(null);
        setPage("home");
      }
    }

    try {
      if (type === "task") {
        await deleteTask(id);
        await refreshProjects();
        showToast({ message: "Quest deleted 🗑️" });
      } else {
        await deleteProject(id);
        showToast({ message: "Project deleted 🗑️" });
      }
    } catch (e) {
      console.error(e);
      showToast({ message: e.message || "Delete failed ❌" });
      await refresh();
    }
  }

  async function handleAuth(e) {
    e.preventDefault();

    try {
      const u =
        authMode === "login"
          ? await login(username, password)
          : await register(username, password);

      localStorage.setItem("qb_userId", String(u.id));
      setUserId(u.id);

      setUsername("");
      setPassword("");
      setPage("home")

      showToast({
        message: authMode === "login" ? `Welcome back, ${u.username} 👋` : `Account created ✅ Welcome, ${u.username}!`,
      });
    } catch (err) { 
      console.error(err); 
      showToast({ message: err.message || "Auth failed ❌" }); 
    }
  }

  async function saveEditProfile() {
    try {
      // 1) username
      const newName = profileUsername.trim();
      if (newName && newName !== dash.username) {
        const updated = await updateProfile(userId, { username: newName });
        setDash((prev) => (prev ? { ...prev, ...updated } : prev));
      }

      // 2) avatar: compress + upload if file selected
      if (avatarFile) {
        const compressed = await compressAvatar(avatarFile, {
          size: 256,
          quality: 0.82,
          mime: "image/jpeg",
        });
        setDash((prev) => (prev ? { ...prev, ...compressed } : prev));

        await uploadAvatar(userId, compressed);

        setAvatarFile(null);
        setAvatarPreview(null);
        
        setAvatarOk(true);
        setAvatarVersion((v) => v + 1);
      }

      // 3) password: only if both filled
      if (currentPw && newPw) {
        await changePassword(userId, currentPw, newPw);
        setCurrentPw("");
        setNewPw("");
      }

      await refresh();

      showToast({ message: "Saved ✅" });

      // close everything after success
      setShowEditProfile(false);
      setShowProfile(false);
      await refresh()
    } catch (e) {
      console.error(e);
      showToast({ message: e.message || "Save failed ❌" });
    }
  }

  async function savePassword() {
    try {
      if (!currentPw || !newPw) {
        showToast({ message: "Fill current + new password" });
        return;
      }

      await changePassword(userId, currentPw, newPw);

      setCurrentPw("");
      setNewPw("");

      showToast({ message: "Password changed 🔒" });
    } catch (e) {
      console.error(e);
      showToast({ message: e.message || "Password change failed ❌" });
    }
  }

  
  function logout() {
    localStorage.removeItem("qb_userId");
    setUserId(null);
    setDash(null);

    setAuthMode("login");
    setShowProfile(false);
    setShowEditProfile(false);
    setConfirmDelete(null);

    setProfileUsername("");
    setCurrentPw("");
    setNewPw("");
  }

  async function refresh() {
    if (!userId) return;
    const data = await getDashboard(userId);
    data.tasks = sortTasks(data.tasks);
    setDash(data);
    setAvatarVersion(v => v + 1);
  }

  function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
      if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;

      return b.id - a.id;
    });
  }

  function showToast(toastObj, duration = 2200) {
    const id = toastIdRef.current++;
    const newToast = { id, ...toastObj };

    setToasts((prev) => [newToast, ...prev]);

    if (duration !== null) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getDashboard(userId);
        data.tasks = sortTasks(data.tasks);

        if (!cancelled) {
          setDash(data);

          const projs = await getProjects(userId);
          setProjects(projs);

          setProfileUsername(data.username || "");
          setCurrentPw("");
          setNewPw("");
          setShowProfile(false);
          setShowEditProfile(false);
          setAvatarOk(true);
          setAvatarVersion(Date.now());
          setAvatarFile(null);
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function complete(id) {
    setProjectTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, status: "DONE" } : t
      )
    );

    if (activeProject?.id) {
      const order = loadTaskOrder(activeProject.id);

      saveTaskOrder(activeProject.id, {
        openIds: order.openIds.filter(x => x !== id),
        doneIds: [...order.doneIds.filter(x => x !== id), id],
      });

      setProjectTasks(prev => applyOrderWithStatusGrouping(prev, loadTaskOrder(activeProject.id)));
    }

    setDash(prev =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map(t =>
              t.id === id ? { ...t, status: "DONE" } : t
            ),
          }
        : prev
    );

    try {
      await completeTask(id);
      await refreshProjects();
      showToast({ message: "Quest completed 🎉" });
      await refresh();
    } catch (e) {
      console.error(e);
      showToast({ message: "Complete failed ❌" });
      await refresh();
    }
  }

  function getLevel(totalXp) {
    const maxLevel = 20;
    const base = 100;
    const growth = 1.35;

    const levels = [0];
    for (let lvl = 2; lvl <= maxLevel + 1; lvl++) {
      const prev = levels[levels.length - 1];
      const cost = Math.round(base * Math.pow(growth, lvl - 2));
      levels.push(prev + cost);
    }

    let level = 1;
    for (let i = 0; i < levels.length; i++) {
      if (totalXp >= levels[i]) level = i + 1;
    }
    if (level > maxLevel) level = maxLevel;

    const current = levels[level - 1];
    const next = levels[level] ?? current;

    const progress =
      next === current ? 1 : Math.min(1, (totalXp - current) / (next - current));

    return { level, progress, current, next };
  }
  
  if (!userId) {
    return (
      <div className="page">
        <div className="card authCard">
          <h1>QuestBoard</h1>
          <p style={{ opacity: 0.75 }}>
            {authMode === "login" ? "Login to continue" : "Create your account"}
          </p>

          <form onSubmit={handleAuth} className="authInner">
            <div className="fieldBlock">
              <div className="fieldLabel">Username</div>
              <input
                className="textInput"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. fabio"
                required
              />
            </div>

            <div className="fieldBlock">
              <div className="fieldLabel">Password</div>
              
              <div className="inputWithBtn">
                <input
                  type={showPassword ? "text" : "password"}
                  className="textInput"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="pwToggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                </button>
              </div>
            </div>

            <div className="addRow" style={{ gap: 10 }}>
              <button className="btn btn-primary btn-add" type="submit">
                {authMode === "login" ? "Login" : "Create account"}
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setAuthMode((m) => (m === "login" ? "register" : "login"));
                  setPassword("");
                }}
              >
                {authMode === "login" ? "Create account" : "Back to login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!dash) return <div>Loading…</div>;

  const levelInfo = getLevel(dash.totalXp);
  
  const welcomeText =
    authMode === "login"
      ? `Welcome back ${dash.username} 👋`
      : `Welcome ${dash.username}`;
  
  const AVATAR_URL = `http://localhost:8080/api/users/${userId}/avatar`;


  return (
    <>
      {/* Toasts */}
      <div className="toastStack">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <div className="toastMessage">{t.message}</div>

            {t.secondaryLabel && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  t.onSecondary?.();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                {t.secondaryLabel}
              </button>
            )}

            {t.actionLabel && (
              <button
                className="btn"
                onClick={() => {
                  t.onAction?.();
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
      
      {/* Create Project */}
      {showCreateProject && (
        <div className="modalOverlay" onClick={() => setShowCreateProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">New project</div>

            <form onSubmit={handleCreateProject}>
              <div className="fieldBlock" style={{ marginTop: 12 }}>
                <div className="fieldLabel">Title</div>
                <input
                  className="textInput"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  required
                />
              </div>

              <div className="fieldBlock" style={{ marginTop: 12 }}>
                <div className="fieldLabel">Description</div>
                <textarea
                  className="textInput"
                  rows={4}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Optional…"
                />
              </div>

              <div className="modalFooter" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateProject(false)}
                >
                  Cancel
                </button>

                <button className="btn btn-primary" type="submit">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task */}
      {showCreateTask && (
        <div className="modalOverlay" onClick={() => setShowCreateTask(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">New project</div>

            <form onSubmit={handleCreateTask}>
              <div className="fieldBlock" style={{ marginTop: 12 }}>
                <div className="fieldLabel">Title</div>
                <input
                  className="textInput"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              
              <div className="fieldLabel">Quest size</div>
              <div className="sizeSelector">
                {["SMALL", "MEDIUM", "BIG"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`sizeBtn btn btn-ghost ${size === s ? "active" : ""}`}
                    onClick={() => setSize(s)}
                  >
                    <span className="sizeName">{s}</span>
                    <span className="sizeXp">{XP_BY_SIZE[s]} XP</span>
                  </button>
                ))}
              </div>

              <div className="modalFooter" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateTask(false)}
                >
                  Cancel
                </button>

                <button className="btn btn-primary" type="submit">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="modalOverlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Delete quest?</div>
            <div className="modalText" style={{ marginBottom: 18}}>
              Are you sure you want to delete <b>{confirmDelete.title}</b>?
            </div>

            <div className="modalActions">
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>

              <button className="btn btn-danger" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && (
        <div className="modalOverlay" onClick={() => setShowProfile(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Profile</span>

              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowProfile(false);
                  setShowEditProfile(true);
                }}
                title="Edit profile">
                <FiEdit/>
              </button>
            </div>

            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12 }}>
              <div>
                {avatarOk ? (
                  <img
                    src={`${AVATAR_URL}?v=${avatarVersion}`}
                    alt="avatar"
                    style={{ width: 56, height: 56, borderRadius: 999, objectFit: "cover" }}
                    onError={() => setAvatarOk(false)}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: 999,
                    display: "grid", placeItems: "center",
                    background: "rgba(0,0,0,0.12)", fontWeight: 800
                  }}>
                    {(dash.username?.[0] || "?").toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{dash.username}</div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>
                  Level {levelInfo.level} • {openTasksCount} open quests
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
              <div className="modal">
                <div style={{ opacity: 0.7, fontSize: 12 }}>Total XP</div>
                <div className="profileStatNumber">{dash.totalXp}</div>
              </div>
              <div className="modal">
                <div style={{ opacity: 0.7, fontSize: 12 }}>XP to next</div>
                <div className="profileStatNumber">{levelInfo.next - dash.totalXp}</div>
              </div>
            </div>

            <div className="modalFooter" style={{ marginTop: 16 }}>
              <button className="btn btn-danger" onClick={logout}>Logout</button>
              <div className="modalActions">
                <button className="btn btn-ghost" onClick={() => setShowProfile(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile modal */}
      {showEditProfile && (
        <div className="modalOverlay" onClick={() => setShowEditProfile(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Edit profile</div>

            <div className="fieldBlock" style={{ marginTop: 12 }}>
              <div className="fieldLabel">Username</div>
              <input
                className="textInput"
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
              />
            </div>

            <div className="fieldBlock" style={{ marginTop: 12 }}>
              <div className="fieldLabel">Avatar</div>

              <div
                className={`uploadZone ${dragActive ? "active" : ""}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => document.getElementById("avatarInput").click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} className="uploadPreview" />
                ) : (
                  <div className="uploadHint">
                    Drag image here or click to upload
                  </div>
                )}

                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
              
              {avatarFile && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  New avatar selected — click <b>Save</b> to apply.
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteAvatar(userId);
                      setAvatarOk(false);
                      setAvatarVersion((v) => v + 1);
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      await refresh();
                      showToast({ message: "Avatar removed 🗑️" });
                    } catch (e) {
                      console.error(e);
                      showToast({ message: e.message || "Remove failed ❌" });
                    }
                  }}
                >
                  Remove avatar
                </button>
              </div>
            </div>

            <hr style={{ margin: "14px 0", opacity: 0.2 }} />

            <div className="modalTitle">Change password</div>

            <div className="fieldBlock">
              <div className="fieldLabel">Current password</div>
              <div className="inputWithBtn">
                <input
                  className="textInput"
                  type={showPassword ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
                <button
                  type="button"
                  className="pwToggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                </button>
              </div>
            </div>

            <div className="fieldBlock" style={{ marginTop: 12 }}>
              <div className="fieldLabel">New password</div>
              <div className="inputWithBtn">
                <input
                  className="textInput"
                  type={showPassword ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                <button
                  type="button"
                  className="pwToggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                </button>
              </div>
            </div>

            <div className="modalFooter" style={{ marginTop: 16 }}>
              <button
                className="btn"
                onClick={savePassword}
                disabled={!currentPw || !newPw}
              >
                Change password
              </button>

              <div className="modalActions">
                <button className="btn btn-ghost" onClick={() => setShowEditProfile(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={saveEditProfile}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Home */}
      {page == "home" && (
        <div className="page">
          <header className="header">
            <div className="headerLeft">
              QuestBoard
            </div>

            <div className="headerRight">
              <span className="headerUser">
                <b>{dash.username}</b>
              </span>
              <button className="avatarBtn" onClick={() => setShowProfile(true)} title="Profile">
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
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
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
                <div>Level: <b>{levelInfo.level}</b></div>

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
            </div>
          </div>

          <div className="tasks card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h2 className="sectionTitle">Projects</h2>
              <button className="btn btn-primary" onClick={() => setShowCreateProject(true)}>
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

                    <div className="projectRight" onClick={(e) => e.stopPropagation()}>
                      <div className="projectProgressWrap">
                        <div className="projectPct">{pct}%</div>

                        <div className="projectBar">
                          <div
                            className={`projectBarFill ${pct === 100 ? "isDone" : ""}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          setConfirmDelete({ type: "project", id: p.id, title: p.title })
                        }
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
      )}

      {/* Project */}
      {page == "project" && (
        <div className="page">
          <header className="header">
            <div className="headerLeft">
              QuestBoard
            </div>

            <div className="headerRight">
              <span className="headerUser">
                <b>{dash.username}</b>
              </span>
              <button className="avatarBtn" onClick={() => setShowProfile(true)} title="Profile">
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
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </header>

          <div className="card">
            <div className="panel">
              <div style={{ display:"flex", justifyContent:"space-between", width:"100%" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{activeProject?.title}</div>
                  <div style={{ opacity: 0.7 }}>{activeProject?.description}</div>
                </div>

                <button className="btn btn-ghost" onClick={async () => {
                  setPage("home");
                  await refreshProjects();
                  }}>
                  ← Back
                </button>
              </div>
              <div className="levelBlock">
                <div>Level: <b>{levelInfo.level}</b></div>

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
            </div>
          </div>

          <div className="tasks card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h2 className="sectionTitle">Quests</h2>
                <button className="btn btn-primary" onClick={() => setShowCreateTask(true)}>
                  + New
                </button>
            </div>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
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
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}
      
    </>
  );
}