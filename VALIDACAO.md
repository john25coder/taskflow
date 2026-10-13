# Evidências de validação do TaskFlow

Data da validação: 13 de outubro de 2026.

## Verificações concluídas

- `npm test`: aprovado.
  - backend: 1 arquivo de teste, 4 testes aprovados;
  - frontend: 1 arquivo de teste, 3 testes aprovados.
- `npm run build`: aprovado.
  - backend: TypeScript compilado sem erros;
  - frontend: TypeScript e Vite concluídos, com 33 módulos transformados.
- `npm audit`: 0 vulnerabilidades conhecidas no conjunto instalado no momento da validação.
- execução isolada da API na porta 3334:
  - criação dos tipos Geral, Estudo, Reunião, Trabalho e Hábito;
  - filtro retornando somente tarefas do tipo Hábito;
  - conclusão diária de hábito gravada e retornada pela API;
- fluxo no navegador local:
  - página de login carregada e responsiva;
  - login com uma conta local de teste;
  - criação de tarefa;
  - edição do status para `Concluída`;
  - filtro por status;
  - busca textual;
  - resumo atualizado para 100% na visualização testada;
  - nenhum erro ou aviso registrado no console do navegador durante esse fluxo.

O fluxo original do navegador acima foi validado antes da inclusão dos tipos de tarefa. Nesta evolução, a nova tela carregou no navegador e os novos comportamentos foram validados por testes automatizados e pela API em execução. O preenchimento manual completo de todos os formulários novos ainda deve ser repetido pelo autor no navegador.

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

Depois, abra `http://localhost:5173` e repita cadastro ou login, criação dos cinco tipos, conclusão de um hábito programado para o dia, edição, filtros, busca e exclusão.
