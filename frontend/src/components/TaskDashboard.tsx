import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { authApi, productivityApi, tasksApi } from '../services/api';
import type { ChecklistItem, ProductivitySummary, Task, TaskDetails, TaskDifficulty, TaskInput, TaskStatus, TaskType, User } from '../types';
import { formatDueDate, isOverdue, localIsoDate } from '../utils/dates';
import { productivityMilestone } from '../utils/celebrations';
import { Celebration, type CelebrationEvent } from './Celebration';
import { ChecklistEditor, type ChecklistDraftItem } from './ChecklistEditor';
import { StudyChecklist } from './StudyChecklist';

type Props = { user: User; onLogout: () => void };
type TaskForm = Omit<TaskInput, 'checklist'> & { checklist: ChecklistDraftItem[] };

const emptyDetails: TaskDetails = {
  subject: '', usefulLinks: [], reviewLinks: [], participants: '', meetingLink: '',
  location: '', project: '', area: '', plannedMinutes: 0, meetingTime: '', agenda: '', notes: '',
  preferredTime: ''
};
const emptyForm = (): TaskForm => ({
  title: '', description: '', status: 'todo', type: 'general', difficulty: 'medium', details: { ...emptyDetails },
  habitDays: [], dueDate: null, checklist: []
});
const statusLabels: Record<TaskStatus, string> = { todo: 'A fazer', in_progress: 'Em andamento', done: 'Concluída' };
const typeLabels: Record<TaskType, string> = {
  general: 'Geral', study: 'Estudo', meeting: 'Reunião', work: 'Trabalho', habit: 'Hábito'
};
const difficultyLabels: Record<TaskDifficulty, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
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

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short' })
    .format(new Date(`${value}T00:00:00Z`));
}

function TaskExtraDetails({ task }: { task: Task }) {
  if (task.type === 'study') {
    const allLinks = [
      ...task.details.usefulLinks.map((url) => ({ url, label: 'Material' })),
      ...task.details.reviewLinks.map((url) => ({ url, label: 'Revisão' }))
    ];
    return <div className="task-details">
      {task.details.subject && <span><b>Matéria:</b> {task.details.subject}</span>}
      {task.details.plannedMinutes > 0 && <span><b>Tempo planejado:</b> {task.details.plannedMinutes} min</span>}
      {allLinks.length > 0 && <div className="task-links">{allLinks.map(({ url, label }) =>
        <a key={`${label}-${url}`} href={url} target="_blank" rel="noreferrer">{label}: {linkName(url)}</a>)}</div>}
    </div>;
  }
  if (task.type === 'meeting') {
    return <div className="task-details">
      {task.details.participants && <span><b>Participantes:</b> {task.details.participants}</span>}
      {task.details.meetingTime && <span><b>Horário:</b> {task.details.meetingTime}</span>}
      {task.details.location && <span><b>Local:</b> {task.details.location}</span>}
      {task.details.agenda && <span><b>Pauta:</b> {task.details.agenda}</span>}
      {task.details.notes && <span><b>Anotações:</b> {task.details.notes}</span>}
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
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [productivity, setProductivity] = useState<ProductivitySummary | null>(null);
  const [weeklyGoalDraft, setWeeklyGoalDraft] = useState(100);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  async function loadProductivity(previous?: ProductivitySummary | null) {
    try {
      const result = await productivityApi.get(today);
      setProductivity(result.productivity);
      setWeeklyGoalDraft(result.productivity.weeklyGoal);
      if (previous && result.productivity.totalPoints > previous.totalPoints) {
        const milestone = productivityMilestone(previous, result.productivity);
        setCelebration({
          id: Date.now(), kind: milestone ? 'milestone' : 'points',
          message: milestone ?? `${result.productivity.totalPoints - previous.totalPoints} pontos conquistados!`
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao carregar a produtividade.');
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(loadTasks, 200);
    return () => window.clearTimeout(timeout);
  }, [status, type, query]);

  useEffect(() => {
    void loadProductivity();
  }, []);

  useEffect(() => {
    if (!celebration) return;
    const timeout = window.setTimeout(() => setCelebration(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  const completed = useMemo(() => tasks.filter((task) =>
    task.type === 'habit' ? task.habitCompletedToday : task.status === 'done').length, [tasks]);

  function updateDetails(values: Partial<TaskDetails>) {
    setForm((current) => ({ ...current, details: { ...current.details, ...values } }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const input: TaskInput = { ...form, checklist: form.checklist.map(({ id, text }) => ({ id, text })) };
      if (editingId) await tasksApi.update(editingId, input, today);
      else await tasksApi.create(input, today);
      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
      await loadTasks();
      await loadProductivity(productivity);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao salvar a tarefa.');
    } finally {
      setSaving(false);
    }
  }

  function edit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title, description: task.description, status: task.status, type: task.type,
      difficulty: task.difficulty, details: { ...task.details }, habitDays: [...task.habitDays], dueDate: task.dueDate,
      checklist: task.checklist.map(({ id, text }) => ({ id, text, key: id }))
    });
    setShowForm(true);
  }

  async function remove(task: Task) {
    if (!window.confirm(`Excluir “${task.title}”?`)) return;
    try {
      await tasksApi.remove(task.id);
      await loadTasks();
      await loadProductivity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao excluir a tarefa.');
    }
  }

  async function toggleHabit(task: Task) {
    try {
      if (task.habitCompletedToday) await tasksApi.undoHabit(task.id, today);
      else await tasksApi.completeHabit(task.id, today);
      await loadTasks();
      await loadProductivity(productivity);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao atualizar o hábito.');
    }
  }

  function replaceTask(updated: Task) {
    setTasks((current) => current.map((task) => task.id === updated.id ? updated : task)
      .filter((task) => status === 'all' || task.status === status));
  }

  async function toggleChecklistItem(task: Task, item: ChecklistItem): Promise<boolean> {
    if (updatingTaskId) return false;
    setUpdatingTaskId(task.id);
    try {
      const result = await tasksApi.updateChecklistItem(task.id, item.id, !item.completedAt);
      replaceTask(result.task);
      setMessage('');
      if (!item.completedAt && result.task.checklist.every((entry) => entry.completedAt)) {
        setCelebration({ id: Date.now(), kind: 'checklist', message: 'Checklist completo! Mais um passo conquistado.' });
      }
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao atualizar o checklist.');
      return false;
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function changeTaskStatus(task: Task) {
    if (updatingTaskId) return;
    setUpdatingTaskId(task.id);
    try {
      const result = await tasksApi.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' }, today);
      replaceTask(result.task);
      setMessage('');
      await loadProductivity(productivity);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao concluir a tarefa.');
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function logout() {
    await authApi.logout();
    onLogout();
  }

  async function saveWeeklyGoal(event: FormEvent) {
    event.preventDefault();
    try {
      await productivityApi.updateWeeklyGoal(weeklyGoalDraft);
      await loadProductivity();
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao atualizar a meta semanal.');
    }
  }

  function changeType(nextType: TaskType) {
    setForm((current) => ({
      ...current,
      type: nextType,
      status: nextType === 'habit' ? 'in_progress' : current.status,
      dueDate: nextType === 'habit' ? null : current.dueDate,
      habitDays: nextType === 'habit' ? current.habitDays : [],
      checklist: nextType === 'study' ? current.checklist : []
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
      {celebration && <Celebration event={celebration} key={celebration.id} />}
      <main className={`dashboard ${celebration?.kind === 'milestone' ? 'milestone-celebrating' : ''}`}>
        <section className="dashboard-heading">
          <div><p className="eyebrow">MINHAS TAREFAS</p><h1>Olá, {user.name.split(' ')[0]}.</h1><p className="muted">Organize o próximo passo e mantenha o ritmo.</p></div>
          <button className="button primary" onClick={() => { setEditingId(null); setForm(emptyForm()); setShowForm(true); }}>+ Nova tarefa</button>
        </section>
        {productivity && <section className="productivity-panel" aria-label="Produtividade e gamificação">
          <div className="level-card">
            <div><p className="eyebrow">SEU RITMO</p><h2>Nível {productivity.level}</h2><p>{productivity.messages[0]?.body ?? 'Cada tarefa concluída aproxima você da meta da semana.'}</p></div>
            <div className="level-progress" aria-label={`${productivity.levelProgress}% do nível atual`}>
              <span style={{ width: `${productivity.levelProgress}%` }} />
            </div>
            <small>{productivity.totalPoints} pontos no total · próximo nível em {productivity.nextLevelAt}</small>
          </div>
          <div className="productivity-stat"><span>PONTOS NA SEMANA</span><strong>{productivity.weeklyPoints}</strong><small>de {productivity.weeklyGoal} pontos</small></div>
          <div className="productivity-stat"><span>SEQUÊNCIA</span><strong>{productivity.currentStreak}</strong><small>{productivity.currentStreak === 1 ? 'dia produtivo' : 'dias produtivos'}</small></div>
          <form className="goal-card" onSubmit={saveWeeklyGoal}>
            <div className="goal-heading"><label htmlFor="weekly-goal">Meta semanal</label><strong>{productivity.weeklyProgress}%</strong></div>
            <div className="goal-progress" aria-label={`${productivity.weeklyProgress}% da meta semanal`}><span style={{ width: `${productivity.weeklyProgress}%` }} /></div>
            <div className="goal-control"><input id="weekly-goal" type="number" min="10" max="10000" step="5" value={weeklyGoalDraft} onChange={(event) => setWeeklyGoalDraft(Number(event.target.value))} /><button className="button secondary">Atualizar</button></div>
          </form>
        </section>}
        {productivity && <section className="motivation-section" aria-labelledby="motivation-title">
          <div className="motivation-heading"><p className="eyebrow">PARA MANTER O RITMO</p><h2 id="motivation-title">Sugestões para você</h2></div>
          <div className="motivation-grid">{productivity.messages.map((item) => <article className={`motivation-card ${item.tone}`} key={item.code}>
            <span aria-hidden="true">{item.tone === 'success' ? '✓' : item.tone === 'focus' ? '→' : item.tone === 'progress' ? '↑' : '•'}</span>
            <div><strong>{item.title}</strong><p>{item.body}</p></div>
          </article>)}</div>
        </section>}
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
              <div className="task-card-top"><div className="card-pills"><span className={`type-pill ${task.type}`}>{typeLabels[task.type]}</span>{task.type !== 'habit' && <span className={`difficulty-pill ${task.difficulty}`}>{difficultyLabels[task.difficulty]}</span>}<span className={`status-pill ${task.status}`}>{task.type === 'habit' ? (task.habitCompletedToday ? 'Feito hoje' : habitScheduledToday ? 'Para hoje' : 'Recorrente') : statusLabels[task.status]}</span></div><button className="more-button" onClick={() => edit(task)} aria-label={`Editar ${task.title}`}>•••</button></div>
              <h3>{task.title}</h3><p>{task.description || 'Sem descrição.'}</p>
              <TaskExtraDetails task={task} />
              {task.type === 'study' && task.checklist.length > 0 && <StudyChecklist task={task}
                busy={updatingTaskId !== null} onToggle={toggleChecklistItem} onChangeStatus={(entry) => void changeTaskStatus(entry)} />}
              {task.type === 'habit' && <button className={`habit-button ${task.habitCompletedToday ? 'completed' : ''}`} disabled={!habitScheduledToday} onClick={() => toggleHabit(task)}>
                {task.habitCompletedToday ? '✓ Concluído hoje — desfazer' : habitScheduledToday ? 'Marcar como feito hoje' : 'Não programado para hoje'}
              </button>}
              <footer className={isOverdue(task.dueDate, task.status) ? 'overdue' : ''}><span>{task.type === 'habit' ? 'Rotina recorrente' : `${isOverdue(task.dueDate, task.status) ? 'Atrasada · ' : ''}${formatDueDate(task.dueDate)}`}</span><button onClick={() => remove(task)}>Excluir</button></footer>
            </article>;
          })}
        </section>
        {productivity && productivity.recentEvents.length > 0 && <section className="recent-achievements" aria-labelledby="recent-achievements-title">
          <div><p className="eyebrow">HISTÓRICO</p><h2 id="recent-achievements-title">Conquistas recentes</h2></div>
          <ul>{productivity.recentEvents.map((event) => <li key={event.id}><span><b>{event.title}</b><small>{typeLabels[event.taskType]} · {formatEventDate(event.occurredOn)}</small></span><strong>+{event.points}</strong></li>)}</ul>
        </section>}
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
              <div className="form-row"><label>Matéria<input value={form.details.subject} onChange={(event) => updateDetails({ subject: event.target.value })} maxLength={100} /></label><label>Tempo planejado <small>minutos</small><input type="number" min="0" max="1440" value={form.details.plannedMinutes} onChange={(event) => updateDetails({ plannedMinutes: Number(event.target.value) })} /></label></div>
              <label>Links úteis <small>um por linha</small><textarea value={form.details.usefulLinks.join('\n')} onChange={(event) => updateDetails({ usefulLinks: lines(event.target.value) })} rows={3} placeholder="https://..." /></label>
              <label>Listas de revisão <small>um link por linha</small><textarea value={form.details.reviewLinks.join('\n')} onChange={(event) => updateDetails({ reviewLinks: lines(event.target.value) })} rows={3} placeholder="https://..." /></label>
              <ChecklistEditor items={form.checklist} onChange={(checklist) => setForm((current) => ({ ...current, checklist }))} />
            </div>}

            {form.type === 'meeting' && <div className="type-fields">
              <label>Participantes<input value={form.details.participants} onChange={(event) => updateDetails({ participants: event.target.value })} placeholder="Ana, Carlos..." /></label>
              <div className="form-row"><label>Horário<input type="time" value={form.details.meetingTime} onChange={(event) => updateDetails({ meetingTime: event.target.value })} /></label><label>Local<input value={form.details.location} onChange={(event) => updateDetails({ location: event.target.value })} /></label></div>
              <label>Link da reunião<input type="url" value={form.details.meetingLink} onChange={(event) => updateDetails({ meetingLink: event.target.value })} placeholder="https://..." /></label>
              <label>Pauta<textarea value={form.details.agenda} onChange={(event) => updateDetails({ agenda: event.target.value })} rows={3} maxLength={2000} /></label>
              <label>Anotações<textarea value={form.details.notes} onChange={(event) => updateDetails({ notes: event.target.value })} rows={3} maxLength={4000} /></label>
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

            {form.type !== 'habit' && <><label>Dificuldade<select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value as TaskDifficulty })}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><div className="form-row"><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}><option value="todo">A fazer</option><option value="in_progress">Em andamento</option><option value="done">Concluída</option></select></label><label>Prazo<input type="date" value={form.dueDate ?? ''} onChange={(event) => setForm({ ...form, dueDate: event.target.value || null })} /></label></div></>}
            {message && <p className="form-error" role="alert">{message}</p>}
            <div className="modal-actions"><button type="button" className="button secondary" disabled={saving} onClick={() => setShowForm(false)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar tarefa'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
