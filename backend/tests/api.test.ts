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
      status: 'todo'
    });
    expect(creation.status).toBe(201);
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
        details: { subject: 'Programação', usefulLinks: ['https://www.typescriptlang.org/docs/'], reviewLinks: ['https://example.com/revisao'] }
      },
      {
        title: 'Reunião do projeto', type: 'meeting',
        details: { participants: 'João e Maria', meetingLink: 'https://meet.google.com/', location: 'Online' }
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
});
