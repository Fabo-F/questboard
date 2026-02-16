import { useEffect, useState, useRef } from "react";
import { getDashboard, createTask, completeTask, deleteTask, login, register, updateProfile, changePassword, uploadAvatar, deleteAvatar,getProjects, createProject, getProjectTasks } from "./api";
import "./App.css";
import { FiEdit } from "react-icons/fi";


async function compressAvatar(file, opts = {}) {
  const {
    size = 256,
    quality = 0.82,
    mime = "image/jpeg",
  } = opts;

  const bitmap = await createImageBitmap(file);

  const srcW = bitmap.width;
  const srcH = bitmap.height;

  // center-crop to square
  const side = Math.min(srcW, srcH);
  const sx = Math.floor((srcW - side) / 2);
  const sy = Math.floor((srcH - side) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  // JPEG background (avoid black for transparent PNGs)
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
      setShowCreateTask(false);
      setTitle("");
      setSize(null);

      showToast({ message: "Quest created ✅" });
    } catch (e2) {
      console.error(e2);
      showToast({ message: e2.message || "Create failed ❌" });
    }
  }

  async function handleDeleteTask() {
    if (!confirmDelete) return;
    const { id } = confirmDelete;

    setConfirmDelete(null);

    setDash((prev) =>
      prev ? { ...prev, tasks: (prev.tasks || []).filter((t) => t.id !== id) } : prev
    );

    setProjectTasks((prev) => (prev || []).filter((t) => t.id !== id));

    try {
      await deleteTask(id);
      showToast({ message: "Quest deleted 🗑️" });
    } catch (err) {
      console.error(err);
      showToast({ message: err.message || "Delete failed ❌" });
      await refresh();
    }
  }

  async function openProject(p) {
    setActiveProject(p);
    setPage("project");

    try {
      const tasks = await getProjectTasks(p.id);
      setProjectTasks(sortTasks(tasks));
    } catch (e) {
      console.error(e);
      showToast({ message: e.message || "Failed to load tasks ❌" });
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

  // async function addTask(e) {
  //   e.preventDefault();

  //   if (!size) {
  //     showToast({ message: "Pick a quest size first" });
  //     return;
  //   }

  //   const created = await createTask({
  //     userId,
  //     projectId: activeProject.id,
  //     title,
  //     description: "",
  //     xp: XP_BY_SIZE[size],
  //   });
  //   setDash(prev => prev ? { ...prev, tasks: [created, ...prev.tasks] } : prev);

  //   setTitle("");
  //   setSize(null);
  //   await refresh();
  //   showToast({message: "Quest created ✅"});
  // }

  async function complete(id) {
    await completeTask(id);
    await refresh();
    showToast({message: "Quest completed 🎉"});
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
              <input
                type="password"
                className="textInput"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
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

              <button className="btn btn-danger" onClick={handleDeleteTask}>
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
              <div style={{ padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.2)" }}>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Total XP</div>
                <div className="profileStatNumber">{dash.totalXp}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.2)" }}>
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
              <input
                className="textInput"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
            </div>

            <div className="fieldBlock" style={{ marginTop: 12 }}>
              <div className="fieldLabel">New password</div>
              <input
                className="textInput"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
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
                {theme === "dark" ? "Light" : "Dark"}
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
              projects.map((p) => (
                <div
                  key={p.id}
                  className="taskRow"
                  style={{ cursor: "pointer" }}
                  onClick={() => openProject(p)}
                >
                  <div className="taskInfo">
                    <div className="taskTitle">{p.title}</div>
                    <div className="taskMeta">{p.description || "No description"}</div>
                  </div>

                  <button className="btn btn-ghost" type="button">
                    Open
                  </button>
                </div>
              ))
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

                <button className="btn btn-ghost" onClick={() => setPage("home")}>
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

            {projectTasks.map((t) => (
              <div key={t.id} className="taskRow">
                <div className="taskInfo">
                  <div className="taskTitle">{t.title}</div>
                  <div className="taskMeta">
                    {t.status} • {t.xp} XP
                  </div>
                </div>

                {t.status !== "DONE" && (
                  <button className="btn btn-ghost" onClick={() => complete(t.id)}>
                    Complete
                  </button>
                )}

                <button
                  className="btn btn-danger"
                  onClick={() =>
                    setConfirmDelete({ id: t.id, title: t.title })
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
    </>
  );
}