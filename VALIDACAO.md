# Evidências de validação do TaskFlow

Última validação: 14 de outubro de 2026. Evidências anteriores preservadas abaixo.

Pasta principal de desenvolvimento e Git: `C:\Users\jvrut\IdeaProjects\taskflow`.

Em 14 de outubro de 2026, as evoluções de gamificação, dificuldade, mensagens e checklist foram sincronizadas da cópia no Desktop para esta pasta. `npm run check` foi repetido aqui com 15 testes e os builds aprovados. O histórico Git, os arquivos `.env`, o lockfile e o banco local foram mantidos; o banco não fez parte da cópia. As evoluções foram reunidas em um commit local, sem publicação no remoto nesta etapa.

## Verificações concluídas

- `npm test`: aprovado.
  - backend: 1 arquivo de teste, 8 testes aprovados;
  - frontend: 2 arquivos de teste, 7 testes aprovados.
- `npm run build`: aprovado.
  - backend: TypeScript compilado sem erros;
  - frontend: TypeScript e Vite concluídos, com 37 módulos transformados.
- `npm audit`: 0 vulnerabilidades conhecidas no conjunto instalado no momento da validação.
- execução isolada da API na porta 3334:
  - criação dos tipos Geral, Estudo, Reunião, Trabalho e Hábito;
  - filtro retornando somente tarefas do tipo Hábito;
  - conclusão diária de hábito gravada e retornada pela API;
  - pontos concedidos uma única vez por tarefa e por conclusão diária de hábito;
  - pontos revertidos ao reabrir tarefa e restaurados sem duplicação;
  - dificuldade persistida por tarefa, com valor padrão médio;
  - mensagens contextuais de proximidade da meta, ritmo de estudos e sugestão de tarefa fácil;
  - meta semanal configurável, sequência de dias e histórico retornados pela API;
- fluxo no navegador local:
  - página de login carregada e responsiva;
  - login com uma conta local de teste;
  - criação de tarefa;
  - edição do status para `Concluída`;
  - filtro por status;
  - busca textual;
  - resumo atualizado para 100% na visualização testada;
  - nenhum erro ou aviso registrado no console do navegador durante esse fluxo.

O fluxo original do navegador acima foi validado antes da inclusão dos tipos de tarefa e da gamificação. Nesta evolução, os novos comportamentos foram validados por testes automatizados e pelo build. O preenchimento manual completo dos formulários e da gamificação ainda deve ser repetido pelo autor no navegador.

## Checklist e celebrações — 14 de outubro de 2026

- `npm run check` aprovado: 8 testes de API, 7 testes de utilitários, TypeScript e build do frontend.
- Migração `005` aplicada em banco de teste com as migrações `001` a `004`: tarefa anterior e dificuldade preservadas, checklist inicial vazio.
- Testes de API cobrem ordem, edição, inclusão e remoção de passos; persistência das datas de conclusão; isolamento entre usuários e tarefas; limites de entrada; remoção em cascata; conclusão explícita sem pontuação por item; repetição idempotente; reabertura; conversão para outro tipo.
- Correção do schema de edição parcial: atualizar apenas status ou checklist preserva os detalhes de estudo. Testes confirmam matéria e links preservados após reordenação e conclusão da tarefa.
- Testes de celebrações cobrem nível e meta combinados, meta isolada, alteração de configuração, perda de pontos, semanas diferentes e meta já alcançada.
- Navegador com API isolada em `localhost:3334`, frontend em `localhost:5174` e banco em memória: criação de checklist de dois passos; progresso de 0% para 50% e 100%; nenhum ponto por item; confetes ao completar a lista; conclusão explícita com 15 pontos; nível 2 e meta semanal alcançados; reload preservando o checklist sem repetir a celebração; reordenação no editor preservando as conclusões.
- Viewport de 390 × 844 verificado sem rolagem horizontal; nenhum erro de console registrado no fluxo.
- A redução de movimento é implementada no CSS: confetes ocultos, animações desativadas e mensagem estática mantida. A simulação dessa preferência no navegador ainda não foi executada.
- Os servidores de teste usam dados sintéticos e são encerrados após a validação. Meta diária e pet seguem como próximas etapas.

## O que os testes não comprovam

- a adaptação para PostgreSQL não foi implementada nem executada;
- não houve publicação em hospedagem ou teste em ambiente de produção;
- não houve teste amplo em diferentes navegadores e dispositivos físicos;
- não foi realizada auditoria profissional de segurança;
- o repositório ainda não foi publicado no GitHub;
- o projeto continua em estudo e revisão pelo autor antes de ser apresentado como concluído.

## Como repetir

No PowerShell, na raiz do projeto:

```powershell
npm install
npm test
npm run build
npm audit
npm run dev
```

Depois, abra `http://localhost:5173` e repita cadastro ou login, criação dos cinco tipos, checklist de estudo (marcar, desmarcar e ordenar), conclusão de tarefa, pontuação, alteração da meta, conclusão de hábito, sequência, edição, filtros, busca e exclusão. Para celebrar meta e nível juntos, prepare 90 pontos com meta de 100 e conclua uma tarefa de estudo. Confira também a preferência de redução de movimento do navegador.
