# Guia para publicar no GitHub

Não publique antes de entender o fluxo principal, executar os testes e revisar se o currículo ainda descreve o projeto como em desenvolvimento.

## Preparar o repositório

No PowerShell, dentro da pasta `taskflow`:

```powershell
git init
git add .
git status
git commit -m "feat: adiciona MVP inicial do TaskFlow"
git branch -M main
```

Leia a saída de `git status` antes do commit. Arquivos `.env`, banco local, `node_modules` e pastas `dist` não devem aparecer.

## Criar o repositório remoto

No GitHub, crie um repositório público chamado `taskflow` sem adicionar README, licença ou `.gitignore`, pois eles já existem localmente. Depois conecte o remoto:

```powershell
git remote add origin https://github.com/John25coder/taskflow.git
git push -u origin main
```

Esses comandos são um guia. Nada foi publicado automaticamente.

## Melhorias para commits autorais

Faça mudanças pequenas que você consiga explicar. Exemplos:

1. adicione ordenação por prazo;
2. crie um teste de isolamento entre dois usuários;
3. acrescente testes de componentes no frontend;
4. configure GitHub Actions para `npm run check`;
5. implemente PostgreSQL em uma branch separada.

Use mensagens específicas, como `test: verifica isolamento de tarefas por usuário`, e explique no README o que foi realmente validado.
