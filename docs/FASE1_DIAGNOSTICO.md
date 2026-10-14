# Ilha das Palavras — Fase 1: diagnóstico do Gamifica e proposta de integração

Fonte lida: repositório `flaviospina/gmificacao`, branch `claude/gamification-model-gaps-eh3n01`
(commit `a7416f1`). O repositório `gamifica_3d` estava vazio.

## 1. Estrutura de pastas

```
/                      index.php (redireciona por perfil) · login.php · callback.php (OAuth Google)
                       logout.php · recuperar.php · erro.php · diagnostico.php · .htaccess
config/                app.php (BASE_URL, sessão, perfis) · db.php (PDO singleton db()) · google.php
includes/              bootstrap.php (carrega tudo + inicia sessão)
                       auth.php (sessão gravada no MySQL, login, requer_*(), CSRF)
                       functions.php (MOTOR DE XP + helpers + gerador do caça-palavras)
                       layout.php (pagina_inicio()/pagina_fim(), sidebar, flash)
aluno/                 index · missoes · missao.php (executa TODOS os tipos de atividade) · perfil · ...
professor/             atividades.php (lista/publica) · atividade_form.php (cria/edita + conteúdo por tipo)
                       turma · relatorios (CSV por atividade) · portfolio · aovivo · ...
coordenador/ admin/ responsavel/
api/                   aovivo.php (polling JSON) · notificacoes.php
assets/                css/style.css (roxo #7C6EF0, Baloo 2 + Nunito) · js/main.js (vazio)
sql/                   gamifica_v2.sql (instalação nova) · gamifica_v1.sql (referência)
                       migracao_v1_v2.sql · gamifica_v2_tabelas_novas.sql · dados_demo.sql
                       cacapalavras_biblioteca.sql · corrige_views.sql
apresentacoes/ estudos/  material comercial (pptx/pdf gerados por Python)
```

Não existe pasta `atividades/`: cada tipo é um `if` dentro de `aluno/missao.php` e um bloco dentro de
`professor/atividade_form.php`. Não há JS de aplicação (o caça-palavras é um script inline).

## 2. Como as atividades existentes são registradas

- Tabela `atividades`: `professor_id, turma_id, titulo, descricao, tipo, disciplina, xp_recompensa
  (10–500), max_tentativas (0 = ilimitadas), data_inicio, data_fim, publicada`.
- `tipo` é um **ENUM('quiz','leitura','projeto','cacapalavras','grupo')**.
- Conteúdo por tipo em tabela própria: `quiz_questoes/quiz_alternativas`, `leitura_conteudo`,
  `projeto_etapas/projeto_entregas`, `cacapalavras_config` (JSON de palavras + grade gerada), `grupo_membros`.
- Fluxo do professor: `atividade_form.php` cria a linha em `atividades` (tipo trava depois de criado),
  depois adiciona o conteúdo; `atividades.php` publica (notifica a turma), encerra ou exclui rascunho.
- Fluxo do aluno: `missoes.php` lista (`atividades` ⨝ `aluno_turma`); `missao.php?id=N` valida acesso,
  renderiza o tipo e recebe o POST de correção na mesma página (form clássico, sem fetch).
- Ícone por tipo: `icone_tipo()` em `functions.php`. Tipo listado também no select de `atividade_form.php`.

## 3. Onde ficam tentativas e pontuação

| Tabela | Papel | Colunas relevantes |
|---|---|---|
| `tentativas` | uma linha por tentativa concluída | `aluno_id, atividade_id, origem('normal','aovivo'), numero, acertos, total_questoes, percentual, xp_ganho, concluida, finalizada_em` |
| `aluno_xp` | melhor resultado por aluno × atividade | `xp_melhor` (UNIQUE aluno_id+atividade_id, `GREATEST` no upsert) |
| `xp_eventos` | ledger de XP (fonte de verdade) | `origem ENUM('missao','aovivo','streak','checkin','mentoria','meta','conquista','ajuste'), referencia_id, xp UNSIGNED` |
| `moeda_eventos` | ledger de GamiCoins | 1 moeda a cada `moedas_por_xp` (10) XP novos |
| `aluno_perfil` | cache: `xp_total, moedas, nivel_atual, streak_dias, missoes_concluidas` | recalculado em PHP |

Padrão de gravação de um resultado (quiz e caça-palavras fazem exatamente isto):

```php
INSERT INTO tentativas (...) VALUES (..., concluida = 1, finalizada_em = NOW());
$delta = gamifica_registrar_resultado($aluno_id, $atividade_id, $xp, 'missao', $titulo);
```

## 4. Como o XP é calculado

- **V2 não tem triggers.** Os dois triggers do V1 (`tg_atualiza_xp_apos_tentativa`, `tg_atualiza_streak`)
  são removidos em `migracao_v1_v2.sql`. O motor é `gamifica_registrar_resultado()` em `includes/functions.php`:
  1. lê `aluno_xp.xp_melhor` anterior; `delta = max(0, xp_novo - anterior)`;
  2. upsert em `aluno_xp` com `GREATEST`;
  3. se `delta > 0`: insere em `xp_eventos`, credita moedas, aplica bônus de mentor;
  4. `recalcular_perfil()` (soma do ledger → `aluno_perfil`, nível pela tabela `niveis`),
     `verificar_metas_turma()`, `verificar_conquistas()`.
- Fórmula das atividades atuais: `xp = round(xp_recompensa × acertos / total)`.
- Invariantes já garantidas pelo motor: XP nunca diminui, só o melhor conta, moedas só somam.
  O jogo precisa apenas entregar um `xp` inteiro ≤ limite e chamar a mesma função.

> Atenção: se a instalação em produção no CECAPE ainda for **V1** (20 tabelas + 2 triggers, como
> descrito no briefing), o fluxo é diferente: o trigger dispara em `AFTER UPDATE ON tentativas`
> (não em INSERT) e não existem `xp_eventos`/`moeda_eventos`. Preciso confirmar qual versão está no ar.

## 5. Pontos que afetam o jogo (encontrados na leitura)

1. **CSP bloqueia CDN.** O `.htaccess` da raiz define
   `Content-Security-Policy "default-src 'self' ...; script-src 'self' 'unsafe-inline'; ..."`.
   Isso impede o `importmap` de carregar o Three.js do jsDelivr e qualquer `fetch` externo.
   Solução sem mexer no global: um `.htaccess` dentro da pasta do jogo que redefine o header só ali,
   liberando `https://cdn.jsdelivr.net` em `script-src` e `connect-src` (o jogo usa `type="module"`,
   que não é afetado por `'unsafe-inline'`).
2. **`.json` e `.md` são bloqueados** (`FilesMatch "\.(sql|log|env|json|lock|md|sh|bak)$"` → 403).
   Logo, as cruzadinhas não podem ser servidas como `data/*.json` estáticos. Proposta: cruzadinhas
   vivem no banco e são entregues por `api.php`; as 2 de exemplo (e o modo demo) ficam em
   `data/*.js` (ES Module exportando o objeto), que passa pelo filtro e funciona sem servidor.
3. **`atividades.tipo` é ENUM.** Para o painel reconhecer o novo tipo é preciso
   `ALTER TABLE atividades MODIFY tipo ENUM(..., 'cruzadinha3d')`. É aditivo e não toca dados,
   mas é alteração de coluna existente: será mostrado para aprovação na Fase 5.
4. **Sessão gravada no MySQL.** `bootstrap.php` abre sessão via `SessaoBancoHandler`, que chama `db()`.
   O modo `?demo=1` precisa ser decidido **antes** de incluir o bootstrap, para não depender do banco.
5. **`tentativas` não tem campos para dicas, bônus, tempo e modo (3D/2D).** `acertos`/`total_questoes`
   são TINYINT (cabem 8–12 palavras). Os detalhes extras vão para tabela nova, ligada à tentativa.
6. **Paleta e tipografia divergem.** O Gamifica atual usa roxo `#7C6EF0` com Baloo 2 + Nunito; o briefing
   pede navy/papel/verde/dourado com Fraunces + Inter. Como o jogo abre em tela cheia própria, não há
   conflito técnico, mas é bom confirmar que a nova paleta é a desejada (ver pergunta 3).
7. **Nome do aluno:** `usuario_nome()` retorna o nome completo da sessão; o jogo recebe só o primeiro
   nome, já no PHP, para a celebração.
8. **Relatórios existentes** (`professor/relatorios.php`) já mostram por aluno: melhor XP, tentativas,
   melhor %, última tentativa — sem lista de erros. O painel do jogo segue o mesmo padrão e acrescenta
   palavras resolvidas e dicas usadas.

## 6. Proposta de encaixe

### 6.1 Pasta do jogo (nova, autônoma)

```
atividades/cruzadinha3d/
├── index.php        ← página do jogo (aluno logado: requer_aluno(); ?demo=1: sem banco)
├── api.php          ← JSON: GET estado/progresso · POST progresso parcial · POST resultado (CSRF)
├── editor.php       ← professor: cadastrar/editar cruzadinha + gerador automático de layout
├── relatorio.php    ← professor: por aluno — palavras resolvidas, tentativas, dicas, melhor XP
├── .htaccess        ← CSP local liberando cdn.jsdelivr.net
├── css/jogo.css
├── js/              ← ES Modules nativos (importmap → three@0.170.0 no jsDelivr, versão fixa)
│   ├── main.js  mundo.js  personagem.js  camera.js  controles.js  colisao.js
│   ├── cruzadinha.js (grade 3D, totens, blocos)  pontuacao.js (mesma fórmula do servidor)
│   ├── gerador.js (layout automático, usado também no editor)  mapa2d.js  hud.js
│   ├── audio.js (Web Audio)  temas/ (ciencias.js, geografia.js, portugues.js, matematica.js)
│   └── api.js (fetch com CSRF, fila offline p/ progresso parcial)
├── data/            ← exemplo_ciencias.js · exemplo_portugues.js (ES Modules)
└── README.md
```

Arquivos existentes que receberão versão completa (não trechos):
- `includes/functions.php` → ícone do novo tipo em `icone_tipo()` + função `cruzadinha_calcular_xp()`
  (a fórmula do servidor fica num só lugar).
- `aluno/missao.php` → para `tipo === 'cruzadinha3d'`, redireciona para `atividades/cruzadinha3d/index.php?id=N`.
- `professor/atividade_form.php` → nova opção no select de tipo e bloco com link para `editor.php`.
- `.htaccess` da raiz: **não** será alterado (uso de `.htaccess` local).

### 6.2 Banco (só tabelas novas + 1 ENUM; SQL completo na Fase 5)

| Tabela nova | Para quê |
|---|---|
| `cruzadinha_config` | `atividade_id` (UNIQUE), `tema`, `ano_serie`, `dados JSON` (palavras, dicas, posições, direção), `desafio_tempo`, `tempo_alvo_seg` |
| `cruzadinha_progresso` | progresso parcial: `aluno_id + atividade_id` (UNIQUE), `palavras_resolvidas JSON`, `dicas_usadas JSON`, `tempo_seg`, `modo ('3d','2d')`, `atualizado_em` |
| `cruzadinha_tentativas` | detalhe por tentativa: `tentativa_id` (FK → `tentativas`), `palavras_resolvidas`, `dicas_usadas`, `estrelas_autonomia`, `bonus_tempo`, `tempo_seg`, `modo` |
| `cruzadinha_avatar` | `aluno_id` (PK), `cor_roupa`, `cor_cabelo`, `acessorio` (não reaproveita `aluno_avatar`, que é da loja) |

Alterações em objetos existentes: apenas `ALTER TABLE atividades MODIFY tipo ENUM(...,'cruzadinha3d')`.
`xp_eventos.origem` continua `'missao'`; `tentativas.origem` continua `'normal'`. Nenhuma view ou
função existente muda de comportamento.

### 6.3 Pontuação (servidor recalcula; cliente só exibe)

Com `R = xp_recompensa` da atividade e `N` palavras:

- Base: `R × 0,80 × resolvidas / N`
- Estrela de autonomia (palavra resolvida sem revelar letra): `R × 0,20 × estrelas / N`
- Desafio de tempo (opcional, ligado pelo professor): `+ R × 0,10` se concluiu dentro do tempo alvo

Resolver tudo sem dica = 100% de `R`; com dicas = até 80%; o tempo pode levar a 110% (o campo
`xp_melhor` é SMALLINT, sem risco até 550). Erros, tentativas e dicas nunca subtraem.
O servidor recebe `palavras_resolvidas` e `dicas_usadas`, confere cada resposta contra o gabarito
(normalizando acento/caixa/cedilha) e recalcula tudo; o `xp` enviado pelo cliente é ignorado.

### 6.4 Fluxo em produção

1. Aluno abre a missão → `missao.php` redireciona para o jogo com o `id`.
2. `index.php` carrega a cruzadinha + progresso parcial + avatar e injeta num `<script type="application/json">`
   (nada de dados pessoais além do primeiro nome).
3. A cada palavra resolvida o jogo faz `POST api.php?acao=progresso` (fire-and-forget, com `sendBeacon`
   no `pagehide` para o caso de fechar a aba).
4. Ao concluir (ou "Terminar por agora"), `POST api.php?acao=resultado` → valida CSRF → recalcula →
   `INSERT tentativas` + `cruzadinha_tentativas` → `gamifica_registrar_resultado()` → responde `delta`
   para a tela final mostrar "+X XP novos" ou "seu melhor continua valendo".
5. `?demo=1`: `index.php` nem inclui o bootstrap; carrega `data/exemplo_ciencias.js`, nome "Visitante",
   `api.js` em modo nulo (progresso em `localStorage`).

## 7. Perguntas antes da Fase 2

1. **Onde o código deve viver?** Esta sessão só tem permissão de push em `gamifica_3d`. Proposta: desenvolver
   tudo em `gamifica_3d` (pasta do jogo + cópias completas dos 3 arquivos existentes alterados), pronta para
   copiar sobre a instalação. Se preferir que vá direto para `gmificacao`, preciso que o repositório seja
   adicionado à sessão com permissão de escrita.
2. **Qual versão está em produção no CECAPE: V1 (com triggers) ou V2 (ledger em PHP)?** A integração da
   Fase 5 muda conforme a resposta.
3. **Paleta do jogo:** usar navy/papel/verde/dourado + Fraunces/Inter como pedido, mesmo o resto do Gamifica
   sendo roxo + Baloo/Nunito? (Minha recomendação: sim, o jogo é tela própria.)
4. **Versão do Three.js:** proponho fixar `three@0.170.0` via jsDelivr (`importmap`). Ok?
5. **Pontuação:** a divisão 80/20/+10 do item 6.3 está aprovada ou prefere outros pesos?
