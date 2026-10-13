# TaskFlow — Gerenciador de Tarefas

MVP full-stack criado como projeto de portfólio e aprendizado para uma candidatura júnior. O sistema permite criar uma conta, entrar com sessão protegida e organizar tarefas por tipo, status, prazo e busca textual.

> **Situação honesta do projeto:** esta entrega é uma base funcional construída durante os estudos de React, TypeScript e Node.js. Antes de apresentá-la como projeto concluído no currículo, o autor deve estudar o código, executar os testes, fazer uma demonstração completa e publicar suas próprias melhorias.

## O que já funciona

- cadastro, login, consulta da sessão e logout;
- senha armazenada como hash bcrypt, nunca em texto puro;
- sessão em cookie HTTP-only com expiração;
- tarefas isoladas por usuário;
- criação, listagem, edição e exclusão de tarefas;
- tipos `Geral`, `Estudo`, `Reunião`, `Trabalho` e `Hábito`;
- campos próprios por tipo, como links de estudo, participantes, reunião, projeto e área;
- hábitos recorrentes nos dias escolhidos, com conclusão diária registrada sem apagar o histórico;
- status `A fazer`, `Em andamento` e `Concluída`;
- filtro por status, filtro por tipo e busca por título ou descrição;
- prazo e indicação visual de atraso;
- validação de entrada com Zod;
- respostas de erro consistentes, cabeçalhos de segurança e limite de tentativas de autenticação;
- interface responsiva para desktop e celular;
- testes básicos de API e de utilitários do frontend.

## Tecnologias

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | React, TypeScript e Vite | Componentes, tipagem e desenvolvimento rápido |
| Backend | Node.js, TypeScript e Express | API REST simples e coerente com a vaga |
| Banco local | SQLite nativo do Node | Funciona sem Docker, conta externa ou custo |
| Autenticação | bcrypt + JWT em cookie HTTP-only | Protege a senha e reduz exposição do token ao JavaScript |
| Validação | Zod | Regras explícitas na borda da API |
| Testes | Vitest e Supertest | Testes unitários e integração HTTP |

## Arquitetura

```text
taskflow/
├── frontend/                 React + TypeScript
│   ├── src/components/      telas e componentes
│   ├── src/services/        cliente da API
│   └── src/utils/           funções reutilizáveis
├── backend/                  Express + TypeScript
│   ├── src/routes/          autenticação e tarefas
│   ├── src/middleware/      sessão e erros
│   ├── src/db/              conexão SQLite
│   ├── migrations/          esquema local versionado
│   └── database/            esquema equivalente para PostgreSQL
└── docs/                     guias de estudo, GitHub e PostgreSQL
```

O navegador envia requisições para a API. A API valida os dados, identifica o usuário pelo cookie de sessão e acessa somente as tarefas daquele usuário. O frontend não consulta o banco diretamente.

Uma tarefa do tipo Hábito funciona como uma rotina, não como uma tarefa concluída para sempre. Os dias da semana ficam na própria tarefa e cada execução é gravada em `habit_completions` com uma data. Essa separação permite calcular futuramente sequência de dias, pontos e metas sem perder o histórico.

## Requisitos

- Node.js 22.13 ou superior;
- npm 10 ou superior;
- Git, caso queira versionar e publicar.

## Executar no Windows com PowerShell

Abra o PowerShell na pasta `taskflow` e execute:

```powershell
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Crie uma chave segura para `JWT_SECRET`:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$jwtSecret = -join ($bytes | ForEach-Object { $_.ToString('x2') })
$rng.Dispose()
$jwtSecret
```

Copie o resultado para `backend/.env`, no lugar da chave de exemplo. Depois inicie os dois serviços:

```powershell
npm run dev
```

Abra `http://localhost:5173`. A API fica em `http://localhost:3333` e o teste de saúde em `http://localhost:3333/api/health`.

O arquivo do banco é criado automaticamente em `backend/data/taskflow.db`. Ele está ignorado pelo Git.

## Testes e build

```powershell
npm test
npm run build
```

Ou execute as duas verificações em sequência:

```powershell
npm run check
```

Os resultados efetivamente obtidos nesta entrega, separados das limitações ainda abertas, estão em [VALIDACAO.md](VALIDACAO.md).

## Rotas principais da API

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/api/health` | verificar se a API está ativa |
| POST | `/api/auth/register` | criar conta e iniciar sessão |
| POST | `/api/auth/login` | entrar |
| GET | `/api/auth/me` | recuperar usuário autenticado |
| POST | `/api/auth/logout` | encerrar sessão |
| GET | `/api/tasks?status=all&type=all&q=&date=AAAA-MM-DD` | listar e filtrar tarefas |
| POST | `/api/tasks` | criar tarefa |
| PATCH | `/api/tasks/:id` | editar tarefa |
| POST | `/api/tasks/:id/habit-completions` | concluir um hábito em uma data |
| DELETE | `/api/tasks/:id/habit-completions/:date` | desfazer a conclusão diária |
| DELETE | `/api/tasks/:id` | excluir tarefa |

## Segurança e limites do MVP

Este projeto aplica hash de senha, cookie HTTP-only, validação, isolamento por usuário, CORS restrito, Helmet e rate limiting. Ainda não substitui uma revisão de segurança para produção. Faltam, entre outros pontos, recuperação de senha, confirmação de e-mail, rotação/revogação de sessões, logs estruturados, proteção CSRF dedicada para cenários com domínios diferentes e pipeline de implantação.

## PostgreSQL

A versão executável usa SQLite para permitir uma demonstração local sem configuração externa. O esquema equivalente está em `backend/database/postgresql-schema.sql`. O passo a passo e as alterações necessárias na camada de banco estão em [docs/POSTGRESQL.md](docs/POSTGRESQL.md). A implementação PostgreSQL não foi executada nem validada nesta entrega.

## Como demonstrar em uma entrevista

1. Explique em 20 segundos: “O TaskFlow é um MVP full-stack que estou construindo para consolidar React, TypeScript e Node. Ele possui autenticação, tarefas por usuário, filtros e testes.”
2. Crie uma conta de demonstração.
3. Crie tarefas dos tipos Estudo e Reunião e mostre os campos específicos.
4. Crie um Hábito, escolha os dias e registre a conclusão de hoje.
5. Use os filtros de tipo e status, edite uma tarefa e exclua outra.
6. Mostre no código onde a API valida os dados, restringe consultas pelo `user_id` e preserva o histórico em `habit_completions`.
7. Execute `npm test` e diferencie testes automatizados de uso manual no navegador.
8. Termine dizendo o que você faria depois: pontuação, metas, resumos, PostgreSQL, CI e implantação.

Leia também [docs/GUIA_DE_APRENDIZADO_E_ENTREVISTA.md](docs/GUIA_DE_APRENDIZADO_E_ENTREVISTA.md). Ele explica os conceitos que você precisa dominar para defender o projeto com segurança.

## Publicação

O código está publicado em [john25coder/taskflow](https://github.com/john25coder/taskflow). O guia em [docs/GUIA_GITHUB.md](docs/GUIA_GITHUB.md) explica o fluxo de versionamento para as próximas melhorias.
