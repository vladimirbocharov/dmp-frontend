import React, { useState, useEffect, useCallback } from "react";

const API = process.env.REACT_APP_API_URL || "";

const fmt = (n) => (n ?? 0).toLocaleString("ru");
const fmtR = (n) => "₽" + fmt(Math.round(n ?? 0));
const fmtPct = (n) => ((n ?? 0).toFixed(1)) + "%";

const EMPTY_FORM = {
  project: "", operator: "", type: "Звонки", tag: "", competitor: "",
  limit: 0, status: "Активен", month: "", date_created: "",
};

export default function App() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({});
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState(-1);

  const [modal, setModal] = useState(null); // null | "add" | "edit" | "import"
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (fType) params.set("type", fType);
    if (fStatus) params.set("status", fStatus);
    if (fMonth) params.set("month", fMonth);

    const [pRes, sRes, mRes] = await Promise.all([
      fetch(`${API}/projects?${params}`),
      fetch(`${API}/stats`),
      fetch(`${API}/months`),
    ]);
    setProjects(await pRes.json());
    setStats(await sRes.json());
    setMonths(await mRes.json());
    setLoading(false);
  }, [search, fType, fStatus, fMonth]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...projects].sort((a, b) => {
    const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
    return av > bv ? sortDir : av < bv ? -sortDir : 0;
  });

  const doSort = (k) => {
    if (sortKey === k) setSortDir(d => -d);
    else { setSortKey(k); setSortDir(-1); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (p) => {
    setEditProject(p);
    setForm({ ...p, date_created: p.date_created || "" });
    setModal("edit");
  };

  const saveAdd = async () => {
    await fetch(`${API}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, limit: +form.limit }),
    });
    setModal(null);
    load();
  };

  const saveEdit = async () => {
    await fetch(`${API}/projects/${editProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, limit: +form.limit }),
    });
    setModal(null);
    load();
  };

  const deleteProject = async (p) => {
    if (!window.confirm(`Удалить проект "${p.project}"?`)) return;
    await fetch(`${API}/projects/${p.id}`, { method: "DELETE" });
    load();
  };

  const syncWR = async () => {
    setSyncing(true); setSyncMsg("");
    const res = await fetch(`${API}/sync/wantresult`, { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    setSyncMsg(data.error ? `Ошибка: ${data.error}` : `Обновлено ${data.updated_projects} проектов`);
    setTimeout(() => setSyncMsg(""), 4000);
    load();
  };

  const doImport = async () => {
    if (!importFile) return;
    const fd = new FormData();
    fd.append("file", importFile);
    const res = await fetch(`${API}/import/csv`, { method: "POST", body: fd });
    const data = await res.json();
    setImportResult(data);
    load();
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const SortTh = ({ k, children, cls = "" }) => (
    <th onClick={() => doSort(k)} style={{ cursor: "pointer", whiteSpace: "nowrap" }} className={cls}>
      {children} {sortKey === k ? (sortDir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "16px 20px", maxWidth: 1400, margin: "0 auto" }}>
      <style>{`
        * { box-sizing: border-box; }
        table { border-collapse: collapse; width: 100%; font-size: 13px; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; }
        th { background: #f8f8f8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
        tr:hover td { background: #fafafa; }
        .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
        .active { background: #e8f5e9; color: #2e7d32; }
        .paused { background: #fff8e1; color: #f57f17; }
        .sms { background: #ede7f6; color: #4527a0; }
        .calls { background: #e3f2fd; color: #1565c0; }
        .btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 13px; }
        .btn:hover { background: #f5f5f5; }
        .btn-primary { background: #1565c0; color: white; border-color: #1565c0; }
        .btn-primary:hover { background: #0d47a1; }
        .input { padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px; }
        .metric { background: #f8f8f8; border-radius: 8px; padding: 12px 16px; }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal { background: white; border-radius: 12px; padding: 24px; width: 520px; max-width: 95vw; }
        .form-row { margin-bottom: 12px; }
        .form-row label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
        .form-row input, .form-row select { width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .num { text-align: right; }
        .icon-btn { border: none; background: none; cursor: pointer; color: #999; padding: 2px 4px; border-radius: 4px; font-size: 15px; }
        .icon-btn:hover { color: #333; background: #f0f0f0; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, flex: 1 }}>Проекты DMP</h1>
        {syncMsg && <span style={{ fontSize: 13, color: "#2e7d32" }}>✓ {syncMsg}</span>}
        <button className="btn" onClick={syncWR} disabled={syncing}>
          {syncing ? "⟳ Синхронизация..." : "⟳ Синх. WR"}
        </button>
        <button className="btn" onClick={() => { setImportResult(null); setModal("import"); }}>
          ↑ Загрузить CSV
        </button>
        <button className="btn btn-primary" onClick={openAdd}>+ Добавить проект</button>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          ["Проектов", stats.total_projects ?? 0, `активных: ${stats.active ?? 0}`],
          ["Лиды", fmt(stats.total_leads), ""],
          ["Встречи", fmt(stats.total_meets), ""],
          ["Договоры", fmt(stats.total_contracts), ""],
          ["Расход", fmtR(stats.total_spend), ""],
        ].map(([label, val, sub]) => (
          <div className="metric" key={label}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>{val}</div>
            {sub && <div style={{ fontSize: 12, color: "#aaa" }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input className="input" placeholder="Поиск по проекту..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
        <select className="input" value={fType} onChange={e => setFType(e.target.value)}>
          <option value="">Все типы</option>
          <option>Звонки</option>
          <option>СМС</option>
        </select>
        <select className="input" value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">Все статусы</option>
          <option>Активен</option>
          <option>Пауза</option>
        </select>
        <select className="input" value={fMonth} onChange={e => setFMonth(e.target.value)}>
          <option value="">Все месяцы</option>
          {months.map(m => <option key={m}>{m}</option>)}
        </select>
        <button className="btn" onClick={load}>Обновить</button>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #eee", borderRadius: 8, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <SortTh k="project">Проект</SortTh>
              <SortTh k="type">Тип</SortTh>
              <SortTh k="status">Статус</SortTh>
              <SortTh k="limit" cls="num">Лимит</SortTh>
              <SortTh k="rows" cls="num">Строки</SortTh>
              <SortTh k="leads" cls="num">Лиды</SortTh>
              <SortTh k="cv_lead" cls="num">CV лид</SortTh>
              <SortTh k="price_lead" cls="num">Цена лида</SortTh>
              <SortTh k="meets_zarya" cls="num">Встречи</SortTh>
              <SortTh k="contracts_zarya" cls="num">Дог-ры</SortTh>
              <SortTh k="spend_total" cls="num">Расход</SortTh>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={12} style={{ textAlign: "center", color: "#aaa", padding: 32 }}>Загрузка...</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={12} style={{ textAlign: "center", color: "#aaa", padding: 32 }}>Проектов не найдено</td></tr>
            )}
            {sorted.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.project}>{p.project}</td>
                <td><span className={`badge ${p.type === "СМС" ? "sms" : "calls"}`}>{p.type}</span></td>
                <td><span className={`badge ${p.status === "Активен" ? "active" : "paused"}`}>{p.status}</span></td>
                <td className="num">{fmt(p.limit)}</td>
                <td className="num">{fmt(p.rows)}</td>
                <td className="num">{fmt(p.leads)}</td>
                <td className="num">{fmtPct(p.cv_lead)}</td>
                <td className="num">{p.price_lead ? fmtR(p.price_lead) : "—"}</td>
                <td className="num">{fmt(p.meets_zarya)}</td>
                <td className="num">{fmt(p.contracts_zarya)}</td>
                <td className="num">{p.spend_total ? fmtR(p.spend_total) : "—"}</td>
                <td>
                  <button className="icon-btn" onClick={() => openEdit(p)} title="Редактировать">✏️</button>
                  <button className="icon-btn" onClick={() => deleteProject(p)} title="Удалить">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {modal === "add" && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 500 }}>Новый проект</h2>
            <div className="form-grid">
              <div className="form-row"><label>Название *</label><input value={form.project} onChange={f("project")} /></div>
              <div className="form-row"><label>Оператор</label><input value={form.operator} onChange={f("operator")} /></div>
              <div className="form-row"><label>Тип</label>
                <select value={form.type} onChange={f("type")}><option>Звонки</option><option>СМС</option></select>
              </div>
              <div className="form-row"><label>Лимит</label><input type="number" value={form.limit} onChange={f("limit")} /></div>
              <div className="form-row"><label>Тег</label><input value={form.tag} onChange={f("tag")} /></div>
              <div className="form-row"><label>Статус</label>
                <select value={form.status} onChange={f("status")}><option>Активен</option><option>Пауза</option></select>
              </div>
              <div className="form-row"><label>Месяц</label><input value={form.month} onChange={f("month")} placeholder="06.2025" /></div>
              <div className="form-row"><label>Дата создания</label><input type="date" value={form.date_created} onChange={f("date_created")} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setModal(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveAdd}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === "edit" && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 500 }}>Редактировать</h2>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888" }}>{editProject?.project}</p>
            <div className="form-grid">
              <div className="form-row"><label>Лимит</label><input type="number" value={form.limit} onChange={f("limit")} /></div>
              <div className="form-row"><label>Статус</label>
                <select value={form.status} onChange={f("status")}><option>Активен</option><option>Пауза</option></select>
              </div>
              <div className="form-row"><label>Тег</label><input value={form.tag || ""} onChange={f("tag")} /></div>
              <div className="form-row"><label>Тип</label>
                <select value={form.type} onChange={f("type")}><option>Звонки</option><option>СМС</option></select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setModal(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveEdit}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {modal === "import" && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 500 }}>Загрузить данные из Битрикса</h2>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>
              Скачайте CSV из Битрикса и загрузите сюда. Данные обновятся по ключу "Проект".
            </p>
            <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files[0])} style={{ marginBottom: 16 }} />
            {importResult && (
              <div style={{ background: "#f8f8f8", borderRadius: 6, padding: 12, marginBottom: 12, fontSize: 13 }}>
                <div>✓ Создано: {importResult.created}</div>
                <div>✓ Обновлено: {importResult.updated}</div>
                {importResult.skipped > 0 && <div>⚠ Пропущено: {importResult.skipped}</div>}
                {importResult.errors?.length > 0 && (
                  <div style={{ color: "#c62828", marginTop: 4 }}>
                    {importResult.errors.slice(0, 3).map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={() => setModal(null)}>Закрыть</button>
              <button className="btn btn-primary" onClick={doImport} disabled={!importFile}>Загрузить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
