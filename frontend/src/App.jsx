import { useEffect, useState, useRef } from "react";
import { getDashboard, createTask, completeTask, deleteTask, login, register, updateProfile, changePassword } from "./api";
import "./App.css";


export default function App() {
  const [dash, setDash] = useState(null);
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
  const [avatarInput, setAvatarInput] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");

  const XP_BY_SIZE = {
    SMALL: 25,
    MEDIUM: 50,
    BIG: 100,
  }

  const toastIdRef = useRef(1);

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

      showToast({
        message: authMode === "login" ? `Welcome back, ${u.username} 👋` : `Account created ✅ Welcome, ${u.username}!`,
      });
    } catch (err) { 
      console.error(err); 
      showToast({ message: err.message || "Auth failed ❌" }); 
    }
  }

  // async function saveAvatar() {
  //   try {
  //     await updateAvatar(userId, avatarInput.trim() || null);
  //     await refresh();
  //     showToast({ message: "Avatar updated ✅" });
  //     setShowProfile(false);
  //   } catch (e) {
  //     console.error(e);
  //     showToast({ message: e.message || "Avatar update failed ❌" });
  //   }
  // }

  async function saveProfile() {
    try {
      const updated = await updateProfile(userId, {
        username: profileUsername.trim(),
        avatarUrl: avatarInput.trim() || null,
      });

      setDash((prev) => (prev ? { ...prev, ...updated } : prev));

      showToast({ message: "Profile saved ✅" });
      setShowProfile(false);
    } catch (e) {
      console.error(e);
      showToast({ message: e.message || "Profile update failed ❌" });
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

  
  function logout(){
    localStorage.removeItem("qb_userId");
    setUserId(null);
    setDash(null);
    showToast({ message: "Logged out" })
  }

  function openProfile() {
    setProfileUsername(dash?.username || "");
    setAvatarInput(dash?.avatarUrl || "");
    setCurrentPw("");
    setNewPw("");
    setShowProfile(true);
  }

  async function refresh() {
    if (!userId) return;
    const data = await getDashboard(userId);
    data.tasks = sortTasks(data.tasks);
    setDash(data);
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
          setAvatarInput(data.avatarUrl || "");
        }

      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function addTask(e) {
    e.preventDefault();

    if (!size) {
      showToast({ message: "Pick a quest size first" });
      return;
    }

    await createTask({
      userId: userId,
      title,
      description: "",
      xp: XP_BY_SIZE[size],
    });

    setTitle("");
    setSize(null);
    await refresh();
    showToast({message: "Quest created ✅"});
  }

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

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="modalOverlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTitle">Delete quest?</div>
            <div className="modalText">
              Are you sure you want to delete <b>{confirmDelete.title}</b>?
            </div>

            <div className="modalActions">
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                onClick={async () => {
                  const { id } = confirmDelete;
                  setConfirmDelete(null);
                  await deleteTask(id);
                  await refresh();
                  showToast({ message: "Quest deleted 🗑️" });
                }}
              >
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
            <div className="modalTitle">Profile</div>
            <div className="modalText" style={{ marginBottom: 12 }}>
              Logged in as <b>{dash.username}</b>
            </div>

            <div className="fieldBlock">
              <div className="fieldLabel">Username</div>
              <input
                className="textInput"
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value)}
                placeholder="New username"
              />
            </div>

            <div className="fieldBlock" style={{ marginTop: 12 }}>
              <div className="fieldLabel">Avatar image URL</div>
              <input
                className="textInput"
                value={avatarInput}
                onChange={(e) => setAvatarInput(e.target.value)}
                placeholder="https://…"
              />
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Tip: Use a direct image link (.png/.jpg). Leave empty to remove.
              </div>
            </div>

            <hr style={{ margin: "14px 0", opacity: 0.2 }} />

            <div className="fieldBlock">
              <div className="fieldLabel">Current password</div>
              <input
                className="textInput"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="fieldBlock" style={{ marginTop: 12 }}>
              <div className="fieldLabel">New password</div>
              <input
                className="textInput"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min 6 chars"
              />
            </div>

            <div className="modalFooter">
              <button className="btn btn-danger" onClick={logout}>
                Logout
              </button>

              <div className="modalActions">
                <button className="btn" onClick={savePassword}>
                  Change password
                </button>

                <button className="btn btn-ghost" onClick={() => setShowProfile(false)}>
                  Close
                </button>

                <button className="btn btn-primary" onClick={saveProfile}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page */}
      <div className="page">
        <header className="header">
          <div className="headerLeft">
            QuestBoard
          </div>

          <div className="headerRight">
            <span className="headerUser">
              <b>{dash.username}</b>
            </span>
            <button className="avatarBtn" onClick={openProfile} title="Profile">
              {dash.avatarUrl ? (
                <img className="avatarImg" src={dash.avatarUrl} alt="avatar" />
              ) : (
                <span className="avatarFallback">
                  {(dash.username?.[0] || "?").toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="card">
          <div className="panel">
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

            <form onSubmit={addTask} className="taskFormCol">
              <div className="fieldBlock">
                <div className="fieldLabel">Title</div>

                <input
                  className="textInput"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="New quest"
                  required
                />
              </div>

              <div className="sizeRow">
                <span className="fieldLabel">Quest size</span>

                <div className="sizeSelector">
                  {["SMALL", "MEDIUM", "BIG"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`sizeBtn ${size === s ? "active" : ""}`}
                      onClick={() => setSize(s)}
                    >
                      <span className="sizeName">{s}</span>
                      <span className="sizeXp">{XP_BY_SIZE[s]} XP</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="addRow">
                <button
                  className="btn btn-primary btn-add"
                  type="submit"
                  disabled={!title.trim() || !size}
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="tasks card">
          <h2 className="sectionTitle">Quests</h2>

          {dash.tasks.map((t) => (
            <div key={t.id} className="taskRow">
              <div className="taskInfo">
                <div className="taskTitle">{t.title}</div>
                <div className="taskMeta">
                  {t.status} • {t.xp} XP
                </div>
              </div>

              {t.status !== "DONE" && (
                <button className="btn" onClick={() => complete(t.id)}>
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
    </>
  );
}