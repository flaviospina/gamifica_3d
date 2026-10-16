# CLAUDE.md — regras de trabalho neste repositório

> Leia **sempre**, no início de cada sessão: este arquivo, `PROGRESSO.md` e
> `docs/PROMPT-MESTRE.md` (o prompt completo com fases, entregas e critérios).
> Só depois faça qualquer coisa.

## O que é este projeto

Gerador de Materiais Visuais com IA para a rede municipal de ensino de São
Caetano do Sul (CECAPE / Secretaria de Educação). Professores criam apostilas
A4, cartazes de eventos e planos de aula organizados por etapa → ano →
componente → habilidade BNCC → tema. O conteúdo (JSON) é aprovado pelo
professor **antes** de a imagem ser gerada. Referência visual: imagens em
`templates/styles/referencias/` (ver `templates/styles/REFERENCIAS.md`).

O repositório também guarda, em `atividades/` e `integracao/`, a Cruzadinha 3D
do Gamifica (projeto anterior). Não misture os dois: o nginx publica apenas
`public/` deste sistema.

## Regra de ouro — portão de fase

1. Uma fase por vez. **Nunca** escreva código de uma fase futura.
2. Uma fase só termina quando **todos** os critérios de aceite estão cumpridos
   e comprovados (comando executado + saída obtida).
3. Se um critério falhar, corrija na mesma fase e rode **todos** os testes de
   novo, incluindo os das fases anteriores.
4. Ao terminar, entregue o Relatório de Fase (modelo na seção 9 do
   prompt-mestre) e **PARE**.
5. Só comece a fase seguinte quando o usuário responder exatamente
   `APROVADO FASE N`. Qualquer outra resposta é ajuste na fase atual.
6. Mantenha `PROGRESSO.md` atualizado: fase atual, critérios cumpridos,
   pendências, decisões.
7. Nada de "TODO", "implementar depois" ou função vazia em código concluído.

## Stack (obrigatória)

- PHP 8.2 puro, sem framework, PDO + MySQL 8 (`utf8mb4_unicode_ci`),
  `sql/schema.sql` idempotente.
- Frontend HTML + CSS + JS com Alpine.js via CDN, mobile-first, **sem build**.
- Fila: tabela `generation_jobs` + worker PHP CLI via systemd.
- Composer com `vendor/` **versionado** (o deploy é `git pull` no terminal web
  do HestiaCP; o computador do desenvolvedor não tem terminal).
- IA de imagem (Gemini/OpenAI) e de texto configuráveis por `.env`;
  `AI_MOCK=1` devolve exemplos sem gastar créditos. Testes sempre em mock.
- PDF: modo imagem com `pdf-lib` no navegador; modo editável com mPDF.
- Servidor: Ubuntu 24.04, HestiaCP, nginx (somente 443), MySQL 8, PHP 8.2.

## Convenções

- Idioma: interface, mensagens, comentários e documentação em **português do
  Brasil**. Identificadores em inglês: `snake_case` em PHP/SQL, `camelCase` em JS.
- Todo arquivo PHP/JS/CSS começa com um comentário com o seu caminho.
- Arquivos sempre completos, nunca trechos soltos.
- Mensagens de erro amigáveis ao professor; detalhe técnico só no log
  (`storage/logs/app.log`).
- Commits pequenos e descritivos, um conjunto por item de entrega.
- Não explique conceitos básicos; explique apenas decisões não óbvias.

## Segurança e LGPD (todas as fases)

PDO com prepared statements; `e()` (`htmlspecialchars`) em toda saída;
`password_hash()`; CSRF em todo POST; `session_regenerate_id(true)` no login;
cookies `HttpOnly`, `Secure`, `SameSite=Lax`; uploads validados por MIME real,
renomeados e gravados fora de `public/`; nenhum dado de aluno vai para APIs de
IA; `audit_log` e `usage_log`; termo de uso com aceite registrado; exclusão de
conta a pedido. Chaves e senhas só no `.env` (fora de `public/`).

## Como rodar os testes

```
php tests/run.php            # todos
php tests/run.php fase0      # só os arquivos cujo nome contém "fase0"
```
Os testes leem `.env.test` (copie de `.env.test.example`) e usam um banco
separado. Ao final de cada fase o resultado precisa ser `0 falhas`.

## Estrutura

Ver seção 4 do `docs/PROMPT-MESTRE.md`. Entrada única: `public/index.php` →
`app/bootstrap.php` → `app/routes.php` → controladores em `app/controllers/`.
