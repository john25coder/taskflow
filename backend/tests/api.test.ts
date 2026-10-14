import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = ':memory:';
  process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  ({ app } = await import('../src/app.js'));
});

describe('TaskFlow API', () => {
  it('protege rotas de tarefas sem autenticação', async () => {
    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(401);
  });

  it('registra usuário e executa o ciclo CRUD de uma tarefa', async () => {
    const agent = request.agent(app);
    const registration = await agent.post('/api/auth/register').send({
      name: 'João Teste',
      email: 'joao@example.com',
      password: 'senhaSegura123'
    });
    expect(registration.status).toBe(201);
    expect(registration.body.user.email).toBe('joao@example.com');

    const creation = await agent.post('/api/tasks').send({
      title: 'Preparar demonstração',
      description: 'Revisar o fluxo principal',
      status: 'todo',
      difficulty: 'low'
    });
    expect(creation.status).toBe(201);
    expect(creation.body.task.difficulty).toBe('low');
    const taskId = creation.body.task.id;

    const update = await agent.patch(`/api/tasks/${taskId}`).send({ status: 'done' });
    expect(update.status).toBe(200);
    expect(update.body.task.status).toBe('done');

    const filtered = await agent.get('/api/tasks?status=done&q=demonstração');
    expect(filtered.status).toBe(200);
    expect(filtered.body.tasks).toHaveLength(1);

    expect((await agent.delete(`/api/tasks/${taskId}`)).status).toBe(204);
    expect((await agent.get('/api/tasks')).body.tasks).toHaveLength(0);
  });

  it('rejeita senha fraca e tarefa sem título', async () => {
    const weakPassword = await request(app).post('/api/auth/register').send({
      name: 'Teste', email: 'weak@example.com', password: '12345678'
    });
    expect(weakPassword.status).toBe(400);
  });

  it('cria os cinco tipos de tarefa e registra a conclusão diária de um hábito', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'Maria Teste',
      email: 'maria@example.com',
      password: 'senhaSegura456'
    });

    const payloads = [
      { title: 'Tarefa simples', type: 'general' },
      {
        title: 'Estudar TypeScript', type: 'study',
        details: { subject: 'Programação', usefulLinks: ['https://www.typescriptlang.org/docs/'], reviewLinks: ['https://example.com/revisao'], plannedMinutes: 90 }
      },
      {
        title: 'Reunião do projeto', type: 'meeting',
        details: { participants: 'João e Maria', meetingLink: 'https://meet.google.com/', location: 'Online', meetingTime: '14:30', agenda: 'Revisar entregas', notes: 'Definir próximos passos' }
      },
      { title: 'Preparar relatório', type: 'work', details: { project: 'TaskFlow', area: 'Produto' } },
      { title: 'Ler por 20 minutos', type: 'habit', habitDays: [2, 4], details: { preferredTime: '19:30' } }
    ];

    const created = [];
    for (const payload of payloads) {
      const response = await agent.post('/api/tasks').send(payload);
      expect(response.status).toBe(201);
      created.push(response.body.task);
    }
    expect(created.map((task) => task.type)).toEqual(['general', 'study', 'meeting', 'work', 'habit']);
    expect(created[1].details.plannedMinutes).toBe(90);
    expect(created[2].details.meetingTime).toBe('14:30');
    expect(created[2].details.agenda).toBe('Revisar entregas');

    const habit = created[4];
    expect(habit.status).toBe('in_progress');
    expect(habit.habitDays).toEqual([2, 4]);

    const completion = await agent.post(`/api/tasks/${habit.id}/habit-completions`).send({ date: '2026-10-13' });
    expect(completion.status).toBe(200);
    expect(completion.body.task.habitCompletedToday).toBe(true);

    const habits = await agent.get('/api/tasks?type=habit&date=2026-10-13');
    expect(habits.status).toBe(200);
    expect(habits.body.tasks).toHaveLength(1);
    expect(habits.body.tasks[0].habitCompletedToday).toBe(true);

    const undo = await agent.delete(`/api/tasks/${habit.id}/habit-completions/2026-10-13`);
    expect(undo.status).toBe(200);
    expect(undo.body.task.habitCompletedToday).toBe(false);

    const invalidHabit = await agent.post('/api/tasks').send({ title: 'Sem dias', type: 'habit', habitDays: [] });
    expect(invalidHabit.status).toBe(400);
  });

  it('registra pontos sem duplicar, calcula sequência e permite configurar a meta', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'Pedro Produtivo',
      email: 'pedro@example.com',
      password: 'senhaSegura789'
    });

    const study = await agent.post('/api/tasks').send({
      title: 'Estudar banco de dados',
      type: 'study',
      status: 'done',
      completionDate: '2026-10-13',
      details: { subject: 'Banco de Dados', plannedMinutes: 60 }
    });
    expect(study.status).toBe(201);

    await agent.patch(`/api/tasks/${study.body.task.id}`).send({
      title: 'Estudar banco de dados relacional',
      status: 'done',
      completionDate: '2026-10-13'
    });

    const habit = await agent.post('/api/tasks').send({
      title: 'Revisar o planejamento',
      type: 'habit',
      habitDays: [1, 2]
    });
    expect(habit.status).toBe(201);
    await agent.post(`/api/tasks/${habit.body.task.id}/habit-completions`).send({ date: '2026-10-12' });
    await agent.post(`/api/tasks/${habit.body.task.id}/habit-completions`).send({ date: '2026-10-13' });
    await agent.post(`/api/tasks/${habit.body.task.id}/habit-completions`).send({ date: '2026-10-13' });

    let productivity = await agent.get('/api/productivity?date=2026-10-13');
    expect(productivity.status).toBe(200);
    expect(productivity.body.productivity.totalPoints).toBe(25);
    expect(productivity.body.productivity.weeklyPoints).toBe(25);
    expect(productivity.body.productivity.currentStreak).toBe(2);
    expect(productivity.body.productivity.recentEvents).toHaveLength(3);

    await agent.patch(`/api/tasks/${study.body.task.id}`).send({ status: 'todo' });
    productivity = await agent.get('/api/productivity?date=2026-10-13');
    expect(productivity.body.productivity.totalPoints).toBe(10);

    await agent.patch(`/api/tasks/${study.body.task.id}`).send({ status: 'done', completionDate: '2026-10-13' });
    const goal = await agent.patch('/api/productivity/settings').send({ weeklyGoal: 150 });
    expect(goal.status).toBe(200);

    productivity = await agent.get('/api/productivity?date=2026-10-13');
    expect(productivity.body.productivity.totalPoints).toBe(25);
    expect(productivity.body.productivity.weeklyGoal).toBe(150);
    expect(productivity.body.productivity.level).toBe(1);
  });

  it('gera mensagens contextuais sem depender de uma API externa', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'Clara Motivada',
      email: 'clara@example.com',
      password: 'senhaSegura987'
    });

    await agent.patch('/api/productivity/settings').send({ weeklyGoal: 50 });
    for (const title of ['Revisar algoritmos', 'Estudar redes', 'Praticar SQL']) {
      const response = await agent.post('/api/tasks').send({
        title,
        type: 'study',
        status: 'done',
        completionDate: '2026-10-13'
      });
      expect(response.status).toBe(201);
    }

    const easyTask = await agent.post('/api/tasks').send({
      title: 'Organizar anotações',
      difficulty: 'low'
    });
    expect(easyTask.status).toBe(201);

    const productivity = await agent.get('/api/productivity?date=2026-10-13');
    expect(productivity.status).toBe(200);
    expect(productivity.body.productivity.weeklyPoints).toBe(45);
    expect(productivity.body.productivity.messages.map((item: { code: string }) => item.code))
      .toEqual(['goal_close', 'study_momentum', 'low_difficulty_suggestion']);
    expect(productivity.body.productivity.messages[2].taskId).toBe(easyTask.body.task.id);
  });

  it('persiste checklist ordenado e concede pontos apenas pela conclusão explícita da tarefa', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      name: 'Ana Estudante', email: 'checklist@example.com', password: 'senhaSegura987'
    });
    const creation = await agent.post('/api/tasks').send({
      title: 'Lista de exercícios', type: 'study',
      details: { subject: 'Estruturas de dados', usefulLinks: ['https://example.com/exercicios'] },
      checklist: [{ text: 'Ler enunciados' }, { text: 'Resolver questões' }]
    });
    expect(creation.status).toBe(201);
    const task = creation.body.task;
    const [first, second] = task.checklist;
    expect(task.checklist.map((item: { text: string }) => item.text)).toEqual(['Ler enunciados', 'Resolver questões']);
    expect(first.completedAt).toBeNull();
    expect((await agent.patch(`/api/tasks/${task.id}`).send({ status: 'done' })).status).toBe(400);

    const completion = await agent.patch(`/api/tasks/${task.id}/checklist/${first.id}`).send({ completed: true });
    expect(completion.status).toBe(200);
    const completedAt = completion.body.task.checklist[0].completedAt;
    expect(completedAt).toEqual(expect.any(String));
    const repeated = await agent.patch(`/api/tasks/${task.id}/checklist/${first.id}`).send({ completed: true });
    expect(repeated.body.task.checklist[0].completedAt).toBe(completedAt);

    const edited = await agent.patch(`/api/tasks/${task.id}`).send({
      checklist: [{ id: second.id, text: 'Resolver questões 1 a 5' }, { id: first.id, text: 'Ler enunciados novamente' }, { text: 'Revisar erros' }]
    });
    expect(edited.status).toBe(200);
    expect(edited.body.task.details).toEqual(task.details);
    expect(edited.body.task.checklist[1]).toMatchObject({ id: first.id, completedAt, createdAt: first.createdAt });
    const listed = await agent.get('/api/tasks');
    expect(listed.body.tasks[0].checklist).toEqual(edited.body.task.checklist);

    for (const item of edited.body.task.checklist) {
      expect((await agent.patch(`/api/tasks/${task.id}/checklist/${item.id}`).send({ completed: true })).status).toBe(200);
    }
    let summary = await agent.get('/api/productivity?date=2026-10-14');
    expect(summary.body.productivity.totalPoints).toBe(0);
    expect((await agent.get('/api/tasks')).body.tasks[0].status).toBe('todo');

    expect((await agent.patch(`/api/tasks/${task.id}`).send({ status: 'done', completionDate: '2026-10-14' })).status).toBe(200);
    await agent.patch(`/api/tasks/${task.id}`).send({ status: 'done', completionDate: '2026-10-14' });
    summary = await agent.get('/api/productivity?date=2026-10-14');
    expect(summary.body.productivity.totalPoints).toBe(15);
    expect(summary.body.productivity.recentEvents).toHaveLength(1);
    expect((await agent.get('/api/tasks')).body.tasks[0].details).toEqual(task.details);
    expect((await agent.patch(`/api/tasks/${task.id}/checklist/${first.id}`).send({ completed: false })).status).toBe(409);

    await agent.patch(`/api/tasks/${task.id}`).send({ status: 'todo' });
    const undo = await agent.patch(`/api/tasks/${task.id}/checklist/${first.id}`).send({ completed: false });
    expect(undo.body.task.checklist[1].completedAt).toBeNull();
    expect((await agent.get('/api/productivity')).body.productivity.totalPoints).toBe(0);
    const removed = await agent.patch(`/api/tasks/${task.id}`).send({ checklist: [{ id: second.id, text: 'Resolver questões' }] });
    expect(removed.body.task.checklist).toHaveLength(1);
    expect((await agent.patch(`/api/tasks/${task.id}/checklist/${first.id}`).send({ completed: true })).status).toBe(404);
    await agent.delete(`/api/tasks/${task.id}`);
    const { database } = await import('../src/db/database.js');
    expect(database.prepare('SELECT id FROM task_checklist_items WHERE task_id = ?').all(task.id)).toHaveLength(0);
  });

  it('valida checklists e impede acesso ou transferência de itens entre tarefas e usuários', async () => {
    const owner = request.agent(app);
    const outsider = request.agent(app);
    await owner.post('/api/auth/register').send({ name: 'Dono Checklist', email: 'owner-checklist@example.com', password: 'senhaSegura987' });
    await outsider.post('/api/auth/register').send({ name: 'Outro Usuário', email: 'other-checklist@example.com', password: 'senhaSegura987' });
    const creation = await owner.post('/api/tasks').send({ title: 'Estudo privado', type: 'study', checklist: [{ text: 'Exercício 1' }] });
    const { id: taskId, checklist } = creation.body.task;
    const itemId = checklist[0].id;
    expect((await outsider.get('/api/tasks')).body.tasks).toHaveLength(0);
    expect((await outsider.patch(`/api/tasks/${taskId}/checklist/${itemId}`).send({ completed: true })).status).toBe(404);
    const otherTask = await owner.post('/api/tasks').send({ title: 'Outro estudo', type: 'study', checklist: [{ text: 'Exercício 2' }] });
    expect((await owner.patch(`/api/tasks/${otherTask.body.task.id}/checklist/${itemId}`).send({ completed: true })).status).toBe(404);
    expect((await owner.patch(`/api/tasks/${otherTask.body.task.id}`).send({ checklist: [{ id: itemId, text: 'Item alheio' }] })).status).toBe(400);
    expect((await owner.patch(`/api/tasks/${taskId}`).send({ checklist: [{ id: itemId, text: 'A' }, { id: itemId, text: 'B' }] })).status).toBe(400);
    expect((await owner.patch(`/api/tasks/${taskId}/checklist/${itemId}`).send({ completed: 'true' })).status).toBe(400);
    for (const payload of [
      { type: 'general', checklist: [{ text: 'Inválido' }] },
      { type: 'study', checklist: [{ text: '   ' }] },
      { type: 'study', checklist: [{ text: 'x'.repeat(201) }] },
      { type: 'study', checklist: Array.from({ length: 51 }, () => ({ text: 'Passo' })) },
      { type: 'study', status: 'done', checklist: [{ text: 'Pendente' }] }
    ]) {
      expect((await owner.post('/api/tasks').send({ title: 'Teste de limite', ...payload })).status).toBe(400);
    }
    expect((await owner.get('/api/tasks')).body.tasks.find((task: { id: string }) => task.id === taskId).checklist).toEqual(checklist);
    const converted = await owner.patch(`/api/tasks/${taskId}`).send({ type: 'general' });
    expect(converted.status).toBe(200);
    expect(converted.body.task.checklist).toEqual([]);
  });
});
