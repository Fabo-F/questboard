import { useEffect, useState, useRef } from "react";
import { getDashboard, createTask, completeTask, deleteTask } from "./api";
import "./App.css";


const USER_ID = 1;

export default function App() {
  const [dash, setDash] = useState(null);
  const [title, setTitle] = useState("");
  const [size, setSize] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const XP_BY_SIZE = {
    SMALL: 25,
    MEDIUM: 50,
    BIG: 100,
  }
  const toastIdRef = useRef(1);

  async function refresh() {
    const data = await getDashboard(USER_ID);
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
    let cancelled = false;

    (async () => {
      try {
        const data = await getDashboard(USER_ID);
        data.tasks = sortTasks(data.tasks);
        if (!cancelled) setDash(data);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addTask(e) {
    e.preventDefault();

    if (!size) {
      showToast({ message: "Pick a quest size first 👇" });
      return;
    }

    await createTask({
      userId: USER_ID,
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

      {/* Page */}
      <div className="page">
        <header className="header">
          <div className="headerLeft">
            QuestBoard
          </div>

          <div className="headerRight">
            <span className="headerUser">
              Logged in as <b>{dash.username}</b>
            </span>

            <button className="btn btn-ghost">
              Profile
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
                onClick={() => setConfirmDelete({ id: t.id, title: t.title })}
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
