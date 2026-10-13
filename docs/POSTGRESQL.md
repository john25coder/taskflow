# Migração opcional para PostgreSQL

O TaskFlow roda localmente com SQLite nativo do Node. Esta alternativa evita Docker e serviços externos durante o aprendizado. Migre apenas quando o fluxo local estiver compreendido.

## 1. Criar o banco

Instale o PostgreSQL localmente ou use uma instância gratuita de sua escolha. Crie um banco chamado `taskflow` e aplique o arquivo:

```powershell
psql -U postgres -d taskflow -f backend/database/postgresql-schema.sql
```

## 2. Instalar o driver

Na raiz do projeto:

```powershell
npm install pg -w backend
npm install -D @types/pg -w backend
```

## 3. Configurar o ambiente

Acrescente ao `backend/.env`:

```text
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/taskflow
```

Nunca envie a senha real ao GitHub.

## 4. Adaptar a camada de dados

Crie um módulo PostgreSQL usando `Pool` do pacote `pg` e substitua os comandos síncronos de `src/db/database.ts` por consultas assíncronas. As rotas precisarão usar `await`.

Diferenças importantes:

- SQLite usa `?` como marcador; `pg` usa `$1`, `$2` e assim por diante;
- `statement.run()` vira `pool.query()`;
- o resultado passa a estar em `result.rows`;
- datas devem ser tratadas como `DATE` ou `TIMESTAMPTZ`;
- inicialização do esquema deve ser feita por migração controlada, não toda vez que a API inicia.

## 5. Validar de verdade

Configure os testes para criar um banco separado, por exemplo `taskflow_test`. A validação mínima deve repetir o ciclo cadastro → login → criar → filtrar → editar → excluir e confirmar que um usuário não acessa tarefas de outro.

Este documento descreve o caminho, mas não afirma que a adaptação PostgreSQL já foi implementada ou testada.
