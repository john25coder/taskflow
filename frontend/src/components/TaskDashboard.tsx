import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { authApi, tasksApi } from '../services/api';
import type { Task, TaskDetails, TaskInput, TaskStatus, TaskType, User } from '../types';
import { formatDueDate, isOverdue, localIsoDate } from '../utils/dates';

type Props = { user: User; onLogout: () => void };

const emptyDetails: TaskDetails = {
  subject: '', usefulLinks: [], reviewLinks: [], participants: '', meetingLink: '',
  location: '', project: '', area: '', preferredTime: ''
};
const emptyForm = (): TaskInput => ({
  title: '', description: '', status: 'todo', type: 'general', details: { ...emptyDetails },
  habitDays: [], dueDate: null
});
const statusLabels: Record<TaskStatus, string> = { todo: 'A fazer', in_progress: 'Em andamento', done: 'Concluída' };
const typeLabels: Record<TaskType, string> = {
  general: 'Geral', study: 'Estudo', meeting: 'Reunião', work: 'Trabalho', habit: 'Hábito'
};
const weekDays = [
  { value: 0, label: 'Dom' }, { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' }, { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' }
];

function lines(value: string): string[] {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function linkName(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

function TaskExtraDetails({ task }: { task: Task }) {
  if (task.type === 'study') {
    const allLinks = [
      ...task.details.usefulLinks.map((url) => ({ url, label: 'Material' })),
      ...task.details.reviewLinks.map((url) => ({ url, label: 'Revisão' }))
    ];
    return <div className="task-details">
      {task.details.subject && <span><b>Matéria:</b> {task.details.subject}</span>}
      {allLinks.length > 0 && <div className="task-links">{allLinks.map(({ url, label }) =>
        <a key={`${label}-${url}`} href={url} target="_blank" rel="noreferrer">{label}: {linkName(url)}</a>)}</div>}
    </div>;
  }
  if (task.type === 'meeting') {
    return <div className="task-details">
      {task.details.participants && <span><b>Participantes:</b> {task.details.participants}</span>}
      {task.details.location && <span><b>Local:</b> {task.details.location}</span>}
      {task.details.meetingLink && <a href={task.details.meetingLink} target="_blank" rel="noreferrer">Abrir reunião</a>}
    </div>;
  }
  if (task.type === 'work') {
    return <div className="task-details">
      {task.details.project && <span><b>Projeto:</b> {task.details.project}</span>}
      {task.details.area && <span><b>Área/cliente:</b> {task.details.area}</span>}
    </div>;
  }
  if (task.type === 'habit') {
    return <div className="task-details">
      <span><b>Repete:</b> {weekDays.filter((day) => task.habitDays.includes(day.value)).map((day) => day.label).join(', ')}</span>
      {task.details.preferredTime && <span><b>Horário:</b> {task.details.preferredTime}</span>}
    </div>;
  }
  return null;
}

export function TaskDashboard({ user, onLogout }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [type, setType] = useState<TaskType | 'all'>('all');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<TaskInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const today = localIsoDate();
  const todayWeekDay = new Date().getDay();

  async function loadTasks() {
    setLoading(true);
    try {
      const result = await tasksApi.list(status, type, query, today);
      setTasks(result.tasks);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao buscar tarefas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(loadTasks, 200);
    return () => window.clearTimeout(timeout);
  }, [status, type, query]);

  const completed = useMemo(() => tasks.filter((task) =>
    task.type === 'habit' ? task.habitCompletedToday : task.status === 'done').length, [tasks]);

  function updateDetails(values: Partial<TaskDetails>) {
    setForm((current) => ({ ...current, details: { ...current.details, ...values } }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingId) await tasksApi.update(editingId, form);
      else await tasksApi.create(form);
      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
      await loadTasks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao salvar a tarefa.');
    }
  }

  function edit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title, description: task.description, status: task.status, type: task.type,
      details: { ...task.details }, habitDays: [...task.habitDays], dueDate: task.dueDate
    });
    setShowForm(true);
  }

  async function remove(task: Task) {
    if (!window.confirm(`Excluir “${task.title}”?`)) return;
    try {
      await tasksApi.remove(task.id);
      await loadTasks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao excluir a tarefa.');
    }
  }

  async function toggleHabit(task: Task) {
    try {
      if (task.habitCompletedToday) await tasksApi.undoHabit(task.id, today);
      else await tasksApi.completeHabit(task.id, today);
      await loadTasks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao atualizar o hábito.');
    }
  }

  async function logout() {
    await authApi.logout();
    onLogout();
  }

  function changeType(nextType: TaskType) {
    setForm((current) => ({
      ...current,
      type: nextType,
      status: nextType === 'habit' ? 'in_progress' : current.status,
      dueDate: nextType === 'habit' ? null : current.dueDate,
      habitDays: nextType === 'habit' ? current.habitDays : []
    }));
  }

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      habitDays: current.habitDays.includes(day)
        ? current.habitDays.filter((item) => item !== day)
        : [...current.habitDays, day].sort()
    }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">T</span> TaskFlow</div>
        <div className="user-area"><span><strong>{user.name}</strong><small>{user.email}</small></span><button className="icon-button" onClick={logout} aria-label="Sair">↗</button></div>
      </header>
      <main className="dashboard">
        <section className="dashboard-heading">
          <div><p className="eyebrow">MINHAS TAREFAS</p><h1>Olá, {user.name.split(' ')[0]}.</h1><p className="muted">Organize o próximo passo e mantenha o ritmo.</p></div>
          <button className="button primary" onClick={() => { setEditingId(null); setForm(emptyForm()); setShowForm(true); }}>+ Nova tarefa</button>
        </section>
        <section className="summary-grid" aria-label="Resumo">
          <div className="summary-card"><span>VISÍVEIS</span><strong>{tasks.length}</strong><small>com os filtros atuais</small></div>
          <div className="summary-card accent"><span>CONCLUÍDAS</span><strong>{completed}</strong><small>tarefas ou hábitos de hoje</small></div>
          <div className="summary-card"><span>PROGRESSO</span><strong>{tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%</strong><small>dos itens visíveis</small></div>
        </section>
        <section className="toolbar">
          <div className="status-tabs">
            {(['all', 'todo', 'in_progress', 'done'] as const).map((item) => <button className={status === item ? 'active' : ''} onClick={() => setStatus(item)} key={item}>{item === 'all' ? 'Todas' : statusLabels[item]}</button>)}
          </div>
          <div className="toolbar-fields">
            <select value={type} onChange={(event) => setType(event.target.value as TaskType | 'all')} aria-label="Filtrar por tipo">
              <option value="all">Todos os tipos</option>
              {(Object.keys(typeLabels) as TaskType[]).map((item) => <option value={item} key={item}>{typeLabels[item]}</option>)}
            </select>
            <input className="search" placeholder="Buscar tarefa..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar tarefa" />
          </div>
        </section>
        {message && <p className="form-error" role="alert">{message}</p>}
        <section className="task-grid" aria-live="polite">
          {loading ? <p className="empty-state">Carregando tarefas...</p> : tasks.length === 0 ? <div className="empty-state"><strong>Nenhuma tarefa encontrada.</strong><span>Crie uma tarefa ou ajuste os filtros.</span></div> : tasks.map((task) => {
            const habitScheduledToday = task.type === 'habit' && task.habitDays.includes(todayWeekDay);
            return <article className={`task-card type-${task.type}`} key={task.id}>
              <div className="task-card-top"><div className="card-pills"><span className={`type-pill ${task.type}`}>{typeLabels[task.type]}</span><span className={`status-pill ${task.status}`}>{task.type === 'habit' ? (task.habitCompletedToday ? 'Feito hoje' : habitScheduledToday ? 'Para hoje' : 'Recorrente') : statusLabels[task.status]}</span></div><button className="more-button" onClick={() => edit(task)} aria-label={`Editar ${task.title}`}>•••</button></div>
              <h3>{task.title}</h3><p>{task.description || 'Sem descrição.'}</p>
              <TaskExtraDetails task={task} />
              {task.type === 'habit' && <button className={`habit-button ${task.habitCompletedToday ? 'completed' : ''}`} disabled={!habitScheduledToday} onClick={() => toggleHabit(task)}>
                {task.habitCompletedToday ? '✓ Concluído hoje — desfazer' : habitScheduledToday ? 'Marcar como feito hoje' : 'Não programado para hoje'}
              </button>}
              <footer className={isOverdue(task.dueDate, task.status) ? 'overdue' : ''}><span>{task.type === 'habit' ? 'Rotina recorrente' : `${isOverdue(task.dueDate, task.status) ? 'Atrasada · ' : ''}${formatDueDate(task.dueDate)}`}</span><button onClick={() => remove(task)}>Excluir</button></footer>
            </article>;
          })}
        </section>
      </main>
      {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
          <button className="modal-close" onClick={() => setShowForm(false)} aria-label="Fechar">×</button>
          <p className="eyebrow">{editingId ? 'EDITAR' : 'NOVA'}</p><h2 id="task-form-title">{editingId ? 'Atualize a tarefa' : 'Adicione uma tarefa'}</h2>
          <form onSubmit={submit}>
            <label>Tipo<select value={form.type} onChange={(event) => changeType(event.target.value as TaskType)}>{(Object.keys(typeLabels) as TaskType[]).map((item) => <option value={item} key={item}>{typeLabels[item]}</option>)}</select></label>
            <label>Título<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={120} required /></label>
            <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={1000} rows={3} /></label>

            {form.type === 'study' && <div className="type-fields">
              <label>Matéria<input value={form.details.subject} onChange={(event) => updateDetails({ subject: event.target.value })} maxLength={100} /></label>
              <label>Links úteis <small>um por linha</small><textarea value={form.details.usefulLinks.join('\n')} onChange={(event) => updateDetails({ usefulLinks: lines(event.target.value) })} rows={3} placeholder="https://..." /></label>
              <label>Listas de revisão <small>um link por linha</small><textarea value={form.details.reviewLinks.join('\n')} onChange={(event) => updateDetails({ reviewLinks: lines(event.target.value) })} rows={3} placeholder="https://..." /></label>
            </div>}

            {form.type === 'meeting' && <div className="type-fields">
              <label>Participantes<input value={form.details.participants} onChange={(event) => updateDetails({ participants: event.target.value })} placeholder="Ana, Carlos..." /></label>
              <div className="form-row"><label>Link da reunião<input type="url" value={form.details.meetingLink} onChange={(event) => updateDetails({ meetingLink: event.target.value })} placeholder="https://..." /></label><label>Local<input value={form.details.location} onChange={(event) => updateDetails({ location: event.target.value })} /></label></div>
            </div>}

            {form.type === 'work' && <div className="form-row type-fields">
              <label>Projeto<input value={form.details.project} onChange={(event) => updateDetails({ project: event.target.value })} /></label>
              <label>Área ou cliente<input value={form.details.area} onChange={(event) => updateDetails({ area: event.target.value })} /></label>
            </div>}

            {form.type === 'habit' && <div className="type-fields">
              <fieldset className="day-fieldset"><legend>Dias da semana</legend><div className="day-selector">{weekDays.map((day) => <button type="button" className={form.habitDays.includes(day.value) ? 'active' : ''} aria-pressed={form.habitDays.includes(day.value)} onClick={() => toggleDay(day.value)} key={day.value}>{day.label}</button>)}</div></fieldset>
              <label>Horário preferido <small>opcional</small><input type="time" value={form.details.preferredTime} onChange={(event) => updateDetails({ preferredTime: event.target.value })} /></label>
              <p className="field-help">Cada dia concluído fica salvo separadamente. Isso permitirá calcular sequências e metas sem perder o histórico.</p>
            </div>}

            {form.type !== 'habit' && <div className="form-row"><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}><option value="todo">A fazer</option><option value="in_progress">Em andamento</option><option value="done">Concluída</option></select></label><label>Prazo<input type="date" value={form.dueDate ?? ''} onChange={(event) => setForm({ ...form, dueDate: event.target.value || null })} /></label></div>}
            <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>Cancelar</button><button className="button primary">Salvar tarefa</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
