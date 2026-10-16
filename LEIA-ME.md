# LEIA-ME — Gerador de Materiais Visuais com IA (CECAPE / SCS)

Sistema web para professores da rede municipal de São Caetano do Sul criarem,
com IA, apostilas visuais A4, cartazes de eventos e planos de aula alinhados à
BNCC. Backend PHP 8.2 + MySQL 8, frontend HTML/CSS/JS com Alpine.js, sem build.

Este documento explica como **instalar e atualizar no cecape-server (HestiaCP)**
usando apenas o navegador: painel do HestiaCP, seu terminal web e o phpMyAdmin.
Nenhum passo exige terminal no seu computador.

---

## 1. Pré-requisitos no servidor

- Ubuntu 24.04 com HestiaCP, nginx, MySQL 8 e PHP 8.2 (fpm) com as extensões
  `pdo_mysql`, `mbstring`, `curl`, `gd`, `openssl`, `fileinfo`, `json`.
- `git` instalado (o HestiaCP já traz).
- Um domínio ou subdomínio apontado para o servidor, ex.
  `materiais.cecapescs.com.br`, com SSL (Let's Encrypt pelo HestiaCP).

## 2. Criar o domínio no HestiaCP

1. Entre no HestiaCP → **Web** → **Adicionar domínio web**.
2. Informe o domínio (ex.: `materiais.cecapescs.com.br`), marque
   **SSL / Let's Encrypt** e **Forçar HTTPS**.
3. Em **Avançado**, escolha a versão **PHP 8.2** no backend.
4. Salve. O HestiaCP cria a pasta
   `/home/<usuário>/web/<domínio>/public_html/`.

## 3. Criar o banco de dados

1. HestiaCP → **DB** → **Adicionar banco de dados**.
2. Nome: `materiais`; usuário: `materiais`; senha forte (anote).
   Charset: `utf8mb4` (padrão).
3. Repita para o banco de testes: `materiais_test` (mesmo usuário).
4. O HestiaCP mostra o nome completo (ex.: `cecape_materiais`); use-o no `.env`.

## 4. Baixar o código (primeira vez)

1. HestiaCP → ícone de **Terminal** (canto superior direito) → abre o terminal web.
2. Execute (troque `<usuário>` e `<domínio>`):
   ```
   cd /home/<usuário>/web/<domínio>/public_html
   git clone https://github.com/flaviospina/gamifica_3d.git .
   ```
   Se o repositório for privado, o HestiaCP pedirá usuário e *token* do GitHub.
3. A pasta `vendor/` já vem no repositório. **Não** é preciso rodar `composer`.

## 5. Configurar o `.env`

1. HestiaCP → **Arquivos** (gerenciador de arquivos) → abra
   `web/<domínio>/public_html/`.
2. Copie `.env.example` para `.env` e edite:
   - `APP_ENV=production`, `APP_DEBUG=0`
   - `BASE_URL=https://materiais.cecapescs.com.br` (sem barra no final)
   - `DB_HOST=127.0.0.1`, `DB_NAME`, `DB_USER`, `DB_PASS` conforme o passo 3
   - `AI_MOCK=1` por enquanto (nenhum crédito de IA é gasto)
3. Para os testes, copie `.env.test.example` para `.env.test` apontando para
   o banco `materiais_test`.
4. Permissões: o `.env` fica **fora** de `public/`; o nginx nunca o serve.

## 6. Apontar o nginx para a pasta `public/`

O sistema só publica a pasta `public/`. Há duas formas:

**Forma A — diretivas personalizadas (mais simples).**
HestiaCP → Web → o domínio → **Avançado** → cole o conteúdo de
`deploy/nginx.conf.example` ajustando `root`, `server_name`, certificados e o
socket do php-fpm. Salve.

**Forma B — template do HestiaCP.**
No terminal web, copie `deploy/nginx.conf.example` para
`/usr/local/hestia/data/templates/web/nginx/php-fpm/materiais.stpl` (e o
`.tpl` correspondente) e selecione o template `materiais` em
Web → domínio → Avançado → Template do proxy/web. Isso é detalhado na Fase 9.

Em qualquer das formas, confirme que:
- `root` termina em `/public_html/public`;
- só a porta **443** está exposta (regra do DTI: o proxy reverso por nome
  encaminha para o servidor);
- arquivos iniciados por ponto e extensões `.env .sql .md .log` são negados.

Depois: HestiaCP → Web → domínio → **Reiniciar** (ou terminal web:
`sudo systemctl reload nginx`).

## 7. Pastas graváveis

No terminal web:
```
cd /home/<usuário>/web/<domínio>/public_html
chmod -R u+rwX storage
```
O `public/storage` é um link simbólico para `storage/public` (arquivos gerados
servidos como estáticos). Nada em `storage/` executa PHP.

## 8. Conferir

1. Abra `https://<domínio>/` — a página inicial mostra o "Estado do sistema".
2. Abra `https://<domínio>/health` — deve responder HTTP 200 com
   `{"status": "ok", ...}`. Se responder 503, a mensagem em português diz o que
   falta (banco, pasta `storage` ou extensão PHP).
3. Abra `https://<domínio>/.env` e `https://<domínio>/app/config.php` — ambos
   devem dar **404**.

## 9. Rodar os testes no servidor (opcional, recomendado)

No terminal web:
```
cd /home/<usuário>/web/<domínio>/public_html
php tests/run.php
```
Resultado esperado: `N testes, 0 falhas ✅`. Os testes usam `.env.test`
(banco `materiais_test`) e sempre rodam em modo simulado de IA.

## 10. Atualizar (próximas fases)

1. Terminal web do HestiaCP:
   ```
   cd /home/<usuário>/web/<domínio>/public_html
   git pull
   ```
2. Se a fase trouxer SQL novo, importe `sql/schema.sql` no **phpMyAdmin**
   (HestiaCP → DB → phpMyAdmin). O arquivo é idempotente: pode rodar de novo.
3. Confira `/health` e a página inicial.

## 11. Desenvolvimento local (quando houver PHP instalado)

```
cp .env.test.example .env.test   # ajuste DB_*
php tests/run.php
cd public && php -S 127.0.0.1:8080 index.php
```

## 12. Estrutura resumida

```
public/        raiz publicada (index.php, assets/, storage → ../storage/public)
app/           config.php, Database.php, Router.php, controllers/, views/, services/, ai/
storage/       imagens, PDFs e logs gerados (privado)
templates/     prompts-modelo por estilo e imagens de referência
tests/         php tests/run.php
deploy/        nginx.conf.example (e, nas próximas fases, systemd e checklist)
docs/          PROMPT-MESTRE.md (especificação completa por fases)
```
