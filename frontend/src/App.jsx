import { useEffect, useState } from "react";
import { getDashboard, createTask, completeTask, deleteTask } from "./api";


const USER_ID = 1;

export default function App() {
  const [dash, setDash] = useState(null);
  const [title, setTitle] = useState("");
  const [xp, setXp] = useState(25);

  async function refresh() {
    const data = await getDashboard(USER_ID);
    setDash(data);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getDashboard(USER_ID);
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
    await createTask({
      userId: USER_ID,
      title,
      description: "",
      xp: Number(xp),
    });
    setTitle("");
    await refresh();
  }

  async function complete(id) {
    await completeTask(id);
    await refresh();
  }

  async function remove(id) {
    if (!confirm("Delete this quest?")) return;
    await deleteTask(id);
    await refresh();
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

  const tasksSorted = [...dash.tasks].sort((a, b) => {
    const order = { OPEN: 0, DONE: 1 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.id - a.id;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "64px 24px",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h1>QuestBoard</h1>

      <h3>User: {dash.username}</h3>

      <div style={{ marginTop: 24, marginBottom: 24}}>
        <div style={{ marginTop: 10 }}>
          Level: <b>{levelInfo.level}</b>
        </div>

        <div
          style={{
            height: 10,
            background: "#333",
            borderRadius: 6,
            overflow: "hidden",
            marginTop: 6,
            width: 300,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${levelInfo.progress * 100}%`,
              background: "#4cafef",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
          {levelInfo.next - dash.totalXp} XP to next level
        </div>
      </div>

      <form onSubmit={addTask} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New quest"
          required
        />

        <input
          type="number"
          value={xp}
          onChange={(e) => setXp(e.target.value)}
          min={1}
          max={500}
          style={{ width: 90 }}
        />

        <button type="submit">Add</button>
      </form>

      <h2>Quests</h2>

      {tasksSorted.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ flex: 1 }}>
            {t.title} — {t.status} — {t.xp} XP
          </div>

          {t.status !== "DONE" && (
            <button onClick={() => complete(t.id)}>Complete</button>
          )}

          <button
            onClick={() => remove(t.id)}
            style={{ opacity: 0.8 }}
            title="Delete quest"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
