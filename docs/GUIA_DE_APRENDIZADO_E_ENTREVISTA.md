# Guia de aprendizado e entrevista do TaskFlow

Este material serve para transformar a base entregue em conhecimento seu. Não memorize frases: abra os arquivos citados, altere algo pequeno e confirme o efeito.

## Conceitos essenciais

### React e estado

`App.tsx` decide entre a tela de autenticação e o painel. Os componentes usam `useState` para guardar valores que mudam e `useEffect` para carregar tarefas quando filtros mudam. Quando o estado muda, o React renderiza novamente a parte necessária da interface.

**Você deve conseguir explicar:** por que as tarefas ficam no estado, o que dispara o `useEffect` e por que o formulário usa campos controlados.

### TypeScript

Os tipos `User`, `Task`, `TaskStatus` e `TaskInput` descrevem o formato esperado dos dados no frontend. TypeScript detecta incompatibilidades durante o desenvolvimento; ele não valida dados recebidos pela rede em tempo de execução.

**Você deve conseguir explicar:** a diferença entre um erro de compilação do TypeScript e uma validação feita pela API.

### API REST

O frontend usa métodos HTTP com significados distintos: `GET` consulta, `POST` cria, `PATCH` altera parcialmente e `DELETE` remove. A API responde com códigos como 200, 201, 204, 400, 401, 404 e 409.

**Exercício:** provoque cada erro de autenticação ou validação e observe a resposta no painel Network do navegador.

### Autenticação

No cadastro, bcrypt transforma a senha em um hash com custo computacional. No login, a senha informada é comparada ao hash. Depois, a API cria um JWT assinado e o envia em cookie HTTP-only. O navegador envia esse cookie automaticamente e o JavaScript do frontend não consegue lê-lo diretamente.

**Limite importante:** isso não torna o MVP pronto para qualquer produção. Recuperação de senha, revogação de sessão, confirmação de e-mail e análise de CSRF ainda são evoluções.

### Banco e autorização

As tabelas `users` e `tasks` possuem uma relação de um para muitos. Toda consulta de tarefa inclui `user_id`, impedindo que a tarefa de um usuário apareça para outro. Autenticação responde “quem é você”; autorização decide “o que você pode acessar”.

**Exercício:** escreva um teste com dois usuários e confirme que um não edita o item do outro.

### Tipos de tarefa e recorrência

O campo `type` diferencia Geral, Estudo, Reunião, Trabalho e Hábito. Os dados específicos ficam serializados em `details_json` no SQLite e possuem validação explícita na API. O esquema PostgreSQL usa `JSONB` para o mesmo objetivo.

Um Hábito não muda definitivamente para `done`. Os dias escolhidos ficam em `habit_days_json`, enquanto cada execução diária gera uma linha em `habit_completions`. A restrição única entre tarefa e data impede que o mesmo dia seja contado duas vezes.

**Você deve conseguir explicar:** por que guardar uma linha por conclusão é melhor do que resetar o status da tarefa diariamente e como esse histórico permitirá calcular sequências e pontos.

### Validação e erros

Zod verifica o formato recebido antes de gravar. Restrições do banco formam uma segunda barreira. O middleware final transforma erros inesperados em uma resposta genérica, evitando expor detalhes internos ao cliente.

### Testes e build

Os testes da API enviam requisições HTTP reais ao aplicativo Express com banco em memória. O teste do frontend cobre funções puras de datas. O build confirma que o TypeScript compila e que o Vite gera os arquivos estáticos. Nenhum desses passos substitui uma demonstração manual no navegador.

## Plano de estudo antes de se candidatar

### Sessão 1 — 60 minutos

- execute o projeto;
- crie uma conta e percorra todo o CRUD;
- desenhe em papel o caminho navegador → rota → banco → resposta;
- anote três dúvidas.

### Sessão 2 — 60 minutos

- leia as rotas de autenticação e tarefas;
- explique hash, JWT, cookie HTTP-only e `user_id` com suas palavras;
- execute os testes e quebre uma validação propositalmente.

### Sessão 3 — 60 minutos

- leia os componentes React;
- implemente uma melhoria pequena, como ordenação por prazo;
- refaça o build;
- ensaie uma demonstração de três minutos sem ler o README.

## Perguntas de revisão

1. Por que não salvamos a senha original?
2. Qual é a diferença entre 401 e 404 neste projeto?
3. Como a API impede acesso a uma tarefa de outro usuário?
4. Por que o frontend ainda precisa tratar erros se existe TypeScript?
5. Quando `useEffect` busca tarefas novamente?
6. O que o teste automatizado prova e o que ele não prova?
7. Quais mudanças seriam necessárias para usar PostgreSQL?
8. Por que a conclusão de um Hábito fica em outra tabela?

## Roteiro oral de três minutos

“O TaskFlow é um projeto de portfólio que estou desenvolvendo para consolidar React, TypeScript e Node.js. O frontend foi feito com React e Vite; ele consome uma API REST em Express. A API valida os dados com Zod, guarda senhas somente como hash bcrypt e mantém a sessão em cookie HTTP-only. As tarefas possuem vínculo com o usuário, e todas as consultas filtram pelo identificador dele. Além do CRUD, implementei cinco tipos de tarefa com campos específicos. Para os hábitos, separei a configuração recorrente do histórico de conclusões diárias, o que permite calcular sequências e metas depois. Para facilitar a demonstração sem custo, usei SQLite nativo do Node, mas documentei um esquema equivalente para PostgreSQL. Os testes automatizados cobrem autenticação, tarefas, tipos, hábitos e funções de data. Como próximos passos, eu desenvolveria pontuação, metas, resumos e notificações. Como ainda estou estudando essa stack, apresento este projeto como construção prática, não como experiência profissional.”

## Regra para o currículo

Enquanto você não revisar e demonstrar o código sozinho, use “Projeto de portfólio em desenvolvimento”. Depois de executar testes, concluir suas próprias melhorias e publicar uma versão estável, você poderá mudar para “Projeto de portfólio concluído”, mantendo claro que é projeto pessoal, não experiência de emprego.
