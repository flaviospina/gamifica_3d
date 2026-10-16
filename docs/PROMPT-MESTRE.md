# PROMPT-MESTRE — Gerador de Materiais Visuais com IA para a Rede de Ensino (CECAPE / SCS)

> Cópia integral do prompt fornecido pelo coordenador na primeira sessão
> (16/10/2026). O Claude Code deve consultá-lo em todas as sessões, junto com
> `CLAUDE.md` e `PROGRESSO.md`. Ao final há um adendo com as instruções
> complementares dadas na mesma sessão (imagens de referência).

---

## 1. Seu papel e a regra mais importante

Você é o desenvolvedor responsável por construir este sistema **do zero até produção**, trabalhando **em fases sequenciais**.

**REGRA DE OURO — PORTÃO DE FASE:**

1. Trabalhe em **uma fase por vez**. Nunca escreva código de uma fase futura.
2. Uma fase só está **concluída** quando **todos** os critérios de aceite dela estiverem cumpridos **e comprovados** (comando executado + saída obtida).
3. Se algum critério falhar, corrija **dentro da mesma fase** e rode todos os testes de novo — inclusive os das fases anteriores.
4. Ao terminar, entregue o **Relatório de Fase** (modelo na seção 9) e **PARE**. Não avance.
5. Só comece a fase seguinte quando eu responder exatamente: **`APROVADO FASE N`**. Qualquer outra resposta é ajuste dentro da fase atual.
6. Mantenha o arquivo `PROGRESSO.md` sempre atualizado: fase atual, critérios cumpridos, pendências, decisões tomadas. Ao iniciar qualquer sessão, **leia `PROGRESSO.md` e `docs/PROMPT-MESTRE.md` antes de fazer qualquer coisa**.
7. Nada de "TODO", "implementar depois" ou funções vazias em código entregue como concluído.

---

## 2. Contexto do produto

Professores da rede municipal de ensino de São Caetano do Sul criam, com IA, **apostilas visuais A4** (capa + páginas), **cartazes de eventos escolares** e **planos de aula**, organizados por **etapa → ano → componente curricular → habilidade BNCC → tema**.

Referência visual: o site `caminhoepalavra.lovable.app` (infográficos A4 densos, coloridos, com blocos numerados, ícones e mascotes). O nosso sistema faz o mesmo para a educação, com três diferenças essenciais:

- **O conteúdo é aprovado antes da imagem.** Um modelo de texto gera o conteúdo em JSON; o professor revisa; só depois a página é desenhada.
- **As habilidades BNCC vêm de uma base oficial** carregada no banco. A IA nunca inventa códigos.
- **Dois modos de saída:** (a) *página-imagem* — a página inteira desenhada pela IA de imagem; (b) *página editável* — texto em HTML/CSS com ilustração gerada por IA, exportada em PDF com texto real.

Usuários: professor, coordenador pedagógico (por escola), administrador (Secretaria/CECAPE).

---

## 3. Stack e ambiente (obrigatórios)

| Item | Definição |
|---|---|
| Backend | PHP 8.2 puro, sem framework, PDO |
| Banco | MySQL 8, `utf8mb4_unicode_ci`, `schema.sql` idempotente (`IF NOT EXISTS`) |
| Frontend | HTML + CSS + JavaScript com Alpine.js via CDN, mobile-first, **sem etapa de build** |
| Servidor | `cecape-server`: Ubuntu 24.04, HestiaCP, nginx, MySQL 8, PHP 8.2 |
| Fila | Tabela `generation_jobs` + worker PHP CLI executado por **systemd** |
| Dependências | Composer, com a pasta `vendor/` **versionada** no repositório (o deploy não pode depender de terminal no computador do desenvolvedor) |
| IA de imagem | Configurável por `.env`: Google Gemini (`gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`) e OpenAI (`gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`). Na Fase 1, confirme na documentação oficial se os IDs ainda são esses |
| IA de texto | Configurável por `.env` (modelo de texto do Gemini ou outro), sempre com saída em JSON |
| PDF | Modo imagem: montagem no navegador com `pdf-lib` (CDN). Modo editável: mPDF no servidor |
| Deploy | Repositório GitHub → `git pull` pelo terminal web do HestiaCP |
| Idioma | Interface, mensagens, comentários e documentação em **português do Brasil**. Identificadores de código em inglês (`snake_case` no PHP/SQL, `camelCase` no JS) |

Restrições:
- O computador do desenvolvedor **não tem terminal**. Tudo que eu precisar fazer deve ser possível pelo navegador, pelo HestiaCP ou pelo phpMyAdmin.
- Chaves de API e senhas só no `.env`, fora da pasta pública.
- O sistema precisa funcionar em **modo simulado** (`AI_MOCK=1`): os motores de IA devolvem imagens e JSONs de exemplo. Todos os testes automatizados rodam nesse modo, sem gastar créditos.

---

## 4. Estrutura de pastas

```
/
├── public/                 ← raiz publicada pelo nginx
│   ├── index.php           ← roteador
│   ├── assets/{css,js,img}
│   └── storage/            ← link para arquivos públicos gerados (somente leitura via nginx)
├── app/
│   ├── config.php  Database.php  Router.php  Auth.php  Csrf.php
│   ├── controllers/  models/  views/  services/
│   └── ai/                 ← TextEngine, ImageEngine, GeminiImage, OpenAIImage, MockEngine, PromptBuilder, Verifier
├── workers/generation_worker.php
├── templates/styles/       ← um prompt-modelo por estilo + templates HTML do modo editável
├── sql/schema.sql  sql/seeds.sql
├── data/bncc/              ← base BNCC em JSON (dataset aberto bncc-dados, licença CC BY 4.0)
├── storage/                ← imagens e PDFs gerados (fora de public/)
├── tests/run.php           ← executor de testes (sem PHPUnit, saída clara de OK/FALHOU)
├── deploy/                 ← nginx.conf de exemplo, unidade systemd, checklist de deploy
├── docs/PROMPT-MESTRE.md
├── PROGRESSO.md  CLAUDE.md  LEIA-ME.md  .env.example
```

---

## 5. Esquema do conteúdo (contrato entre IA de texto, revisão e IA de imagem)

```json
{
  "tipo": "apostila",
  "etapa": "EF_ANOS_INICIAIS",
  "ano": "4",
  "componente": "Ciências",
  "habilidades": [{"codigo": "EF04CI01", "resumo": "texto curto fiel à habilidade"}],
  "tema": "Misturas no dia a dia",
  "finalidade": "introducao",
  "estilo": "doodle_escolar",
  "capa": {"texto_superior": "", "titulo": "", "subtitulo": "", "frase_inferior": ""},
  "paginas": [
    {
      "numero": 1,
      "tipo": "abertura",
      "titulo": "", "subtitulo": "",
      "blocos": [
        {"n": "01", "titulo": "Objetivo", "texto": ""},
        {"n": "02", "titulo": "O que você vai aprender", "itens": []},
        {"n": "03", "titulo": "Habilidades BNCC", "itens": []},
        {"n": "04", "titulo": "Por que é importante", "itens": []},
        {"n": "05", "titulo": "Como vamos estudar", "itens": []},
        {"n": "06", "titulo": "Nas próximas páginas", "itens": []}
      ],
      "rodape": ""
    },
    {"numero": 2, "tipo": "explicacao", "titulo": "", "blocos": []},
    {"numero": 3, "tipo": "pratica", "titulo": "", "blocos": []}
  ]
}
```

Regras de validação (em PHP, antes de qualquer geração de imagem):
- Todo código em `habilidades` existe na tabela `bncc_skills` e pertence à etapa/ano/componente escolhidos.
- Limites de texto por bloco (definidos por estilo) para caber na página — frases longas demais são rejeitadas com mensagem clara ao professor.
- Nenhum nome, foto ou dado de aluno.

Modelo de prompt-modelo de estilo (um arquivo por estilo em `templates/styles/`):

```text
Gere UMA ÚNICA página vertical A4 de material didático, vista de frente, sem mockup, colagem, grade de opções ou páginas lado a lado.
Estilo: {descricao_do_estilo}. Mascote: {mascote}.
Público: {ano} — {etapa}. Componente: {componente}.
Título grande: "{titulo}". Subtítulo: "{subtitulo}".
Blocos numerados, cada um com o título e o texto EXATOS abaixo, em português do Brasil, com acentuação correta:
{blocos}
Rodapé: "{rodape}" e "Página {numero} de {total}".
Não acrescente nenhum texto que não esteja nesta lista. Não use personagens de marcas, filmes ou desenhos conhecidos.
Confira a grafia de cada palavra antes de entregar.
```

---

## 6. Segurança e LGPD (vale para todas as fases)

- PDO com prepared statements; `htmlspecialchars()` em toda saída; senhas com `password_hash()`.
- Token CSRF em todo POST; `session_regenerate_id(true)` no login; cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- Uploads: validar MIME real, renomear com nome aleatório, gravar fora de `public/`.
- Nenhum dado de aluno é enviado às APIs de IA.
- Tabela `audit_log` (quem, quando, o quê) e `usage_log` (usuário, escola, motor, modelo, resolução, custo estimado em US$).
- Termo de uso com aceite registrado (data, hora, IP) e exclusão de conta a pedido.

---

## 7. Fases, entregas e critérios de aceite

Cada critério precisa ser **demonstrado** no Relatório de Fase. `php tests/run.php` deve terminar com **0 falhas** ao final de toda fase, incluindo os testes das fases anteriores.

### FASE 0 — Fundação do projeto
**Entregas:** estrutura de pastas; `config.php` lendo `.env`; `Database.php` (singleton PDO); roteador; página inicial; rota `GET /health` (JSON com status do PHP, do banco e da pasta `storage`); `tests/run.php`; `CLAUDE.md` com as regras deste prompt; `docs/PROMPT-MESTRE.md` (cópia deste prompt); `PROGRESSO.md`; `LEIA-ME.md`; `.env.example`; `.gitignore`.

**Critérios de aceite:**
- [ ] `php -l` sem erros em todos os arquivos `.php`.
- [ ] `php tests/run.php` executa e passa (mínimo: config, conexão com banco de teste, roteador, `/health`).
- [ ] `/health` responde `{"status":"ok", ...}` com HTTP 200; com banco desligado responde 503 e mensagem em português.
- [ ] `.env` e `app/` inacessíveis pelo navegador (teste automatizado de configuração nginx de exemplo ou verificação documentada).
- [ ] `LEIA-ME.md` explica a instalação no HestiaCP passo a passo, sem uso de terminal local.

### FASE 1 — Prova de conceito dos motores de IA
**Entregas:** interfaces `TextEngine` e `ImageEngine`; adaptadores Gemini e OpenAI; `MockEngine`; `PromptBuilder` (JSON → prompt-modelo); script `tools/poc_generate.php` que recebe um JSON de exemplo e gera a mesma página nos motores configurados; registro em `usage_log`; página simples `/poc` (só admin) que mostra as imagens lado a lado para comparação.

**Critérios de aceite:**
- [ ] Com `AI_MOCK=1`, o script gera arquivos PNG válidos e os testes passam.
- [ ] Com chaves reais, gera 1 página A4 vertical em cada motor e salva em `storage/poc/` (comprovar com caminho, dimensões e tempo de geração).
- [ ] Erros da API (chave inválida, cota, tempo limite) viram mensagens claras em português e ficam em log, sem derrubar o script.
- [ ] Tempo limite configurável (padrão 360 s) e até 2 novas tentativas com espera crescente.
- [ ] IDs de modelo e preços por imagem confirmados na documentação oficial e anotados em `PROGRESSO.md`.
- [ ] Kit de teste cego: 6 JSONs de exemplo (3 componentes × 2 anos) prontos para eu avaliar os motores.

### FASE 2 — Banco de dados, BNCC e autenticação
**Entregas:** `schema.sql` completo (`schools`, `users`, `roles`, `bncc_skills`, `styles`, `projects`, `pages`, `generation_jobs`, `usage_log`, `audit_log`, `quotas`, `consents`); `seeds.sql` (perfis, estilos iniciais, escola de teste); importador da base BNCC (`tools/import_bncc.php` + tela de importação para admin); login, logout, recuperação de senha por e-mail; perfis professor/coordenador/admin; cadastro de escolas e usuários pelo admin; aceite do termo de uso.

**Critérios de aceite:**
- [ ] `schema.sql` roda duas vezes seguidas sem erro (idempotente).
- [ ] Importação BNCC carrega todas as habilidades do dataset; teste confirma quantidade e alguns códigos conhecidos (ex.: `EF04CI01`, `EF67LP08`, `EM13LGG103`) e rejeita código inexistente.
- [ ] Testes de login: senha errada, bloqueio após 5 tentativas, CSRF ausente rejeitado, sessão regenerada.
- [ ] Professor não acessa telas de admin (teste de permissão por rota).
- [ ] Aceite do termo registrado com data, hora e IP.

### FASE 3 — Assistente de conteúdo (texto) e revisão
**Entregas:** assistente em etapas (1 Conteúdo: etapa/ano/componente/habilidade/tema; 2 Finalidade e nº de páginas; 3 Estilo; 4 Revisão; 5 Gerar); geração do JSON pela IA de texto com as habilidades oficiais no prompt; validador do esquema (seção 5); editor de revisão amigável (campos por bloco, contador de caracteres, aviso de limite); plano de aula em texto gerado a partir do mesmo conteúdo (gratuito, sem imagem); salvamento em "Meus projetos" como rascunho.

**Critérios de aceite:**
- [ ] JSON inválido ou com habilidade fora do recorte é rejeitado e o motivo aparece ao professor.
- [ ] O professor consegue editar qualquer bloco e salvar; o histórico guarda a versão gerada e a revisada.
- [ ] Plano de aula exportável em PDF de texto.
- [ ] Testes cobrem: geração simulada, validação, edição, permissão (professor só vê os próprios projetos; coordenador vê os da sua escola).
- [ ] Interface utilizável em celular (largura 360 px) sem rolagem horizontal.

### FASE 4 — Fila, geração de imagem e conferência automática
**Entregas:** criação de jobs por página; worker CLI com bloqueio de concorrência, novas tentativas e estado (`pendente`, `gerando`, `conferindo`, `pronto`, `erro`); unidade systemd em `deploy/`; consulta de status no navegador (polling a cada 5 s) e aviso de "pronto"; **conferência automática**: modelo com visão lê a imagem, compara com o JSON aprovado e regenera até 2 vezes se houver texto errado; galeria do projeto com opção de regenerar uma página específica; gravação do custo de cada geração.

**Critérios de aceite:**
- [ ] Em modo simulado, um projeto de capa + 3 páginas passa de `pendente` a `pronto` sem intervenção.
- [ ] Derrubar o worker no meio de um job não perde o job (retomada comprovada em teste).
- [ ] Conferência simulada com "erro" dispara regeneração e para após 2 tentativas, marcando a página para revisão manual.
- [ ] Nenhuma requisição web espera a IA de imagem (tudo pela fila).
- [ ] `usage_log` registra cada chamada com custo estimado.

### FASE 5 — Interface completa, capas, cartazes e PDF
**Entregas:** capas (com identidade visual da escola/Secretaria), cartazes de eventos (Story 9:16, Feed 1:1, A4) com tipos de evento escolares; montagem do PDF no navegador com `pdf-lib` (ordem arrastável, capa primeiro); "Meus projetos" com busca por componente, ano e habilidade; duplicar projeto; biblioteca de estilos por faixa etária com prévia.

**Critérios de aceite:**
- [ ] PDF baixado abre corretamente com páginas A4 na ordem definida.
- [ ] Cartaz gerado nos três formatos com as proporções corretas.
- [ ] Busca retorna projetos pelo código BNCC.
- [ ] Teste manual guiado (roteiro escrito no relatório) de um professor criando uma apostila do início ao PDF.

### FASE 6 — Modo editável (HTML + ilustração)
**Entregas:** templates HTML/CSS por estilo, reproduzindo a linguagem visual dos estilos de imagem (blocos numerados, cores, ícones); ilustração focal por página gerada por IA com cache; edição de texto direto na página; exportação em PDF com mPDF (texto selecionável); escolha do modo no passo "Gerar".

**Critérios de aceite:**
- [ ] O PDF do modo editável tem texto selecionável e pesquisável.
- [ ] Alterar uma palavra não gera nova imagem nem consome crédito.
- [ ] Mesma ilustração reaproveitada do cache quando o prompt é igual.
- [ ] Layout não quebra com o texto no limite máximo de cada bloco (teste com textos-limite).

### FASE 7 — Diferenciais pedagógicos
**Entregas:** a mesma apostila em 3 níveis de leitura; versão inclusiva (TEA: frases curtas e rotina visual; dislexia: fonte e espaçamento ampliados; baixa visão: alto contraste); atividades com gabarito separado (só para o professor) e exportação em CSV compatível com importação no Google Forms; geração a partir de material existente (upload de PDF ou foto de página); biblioteca compartilhada da rede (publicar, clonar, adaptar) com aprovação da coordenação; QR Code em cada página apontando para a versão em áudio (texto para fala) ou quiz.

**Critérios de aceite:**
- [ ] Cada variação nasce do mesmo JSON aprovado e mantém as mesmas habilidades BNCC.
- [ ] Gabarito nunca aparece no PDF do aluno (teste automatizado).
- [ ] Material publicado só aparece na biblioteca após aprovação.
- [ ] Upload valida tipo e tamanho e não guarda arquivo em pasta pública.

### FASE 8 — Gestão, cotas e LGPD
**Entregas:** painel do admin e do coordenador (uso por escola, componente, habilidade, motor e custo); cotas mensais por escola e por professor com bloqueio e aviso; relatórios em CSV; tela de auditoria; exclusão e anonimização de conta; selo "Revisado pelo professor" e aviso de uso de IA nos materiais.

**Critérios de aceite:**
- [ ] Ao atingir a cota, a geração é bloqueada com mensagem clara; o texto continua disponível.
- [ ] Números do painel batem com `usage_log` (teste com dados simulados).
- [ ] Exclusão de conta remove dados pessoais e mantém os registros de uso anonimizados.

### FASE 9 — Produção no cecape-server
**Entregas:** configuração nginx (somente porta 443, proxy reverso por nome, conforme regras do DTI); unidade systemd do worker com reinício automático; rotina de backup do banco e de `storage/`; limpeza automática de rascunhos antigos; checklist de deploy por `git pull` no terminal web do HestiaCP; manual do professor e do coordenador em PDF.

**Critérios de aceite:**
- [ ] Teste de fumaça em produção: login, criação de apostila, geração, PDF.
- [ ] Worker volta sozinho após reinício do servidor.
- [ ] Backup gerado e restauração testada em banco separado.
- [ ] `/health` em produção responde 200.

---

## 8. Padrões de entrega

- Sempre arquivos completos, com o caminho no cabeçalho do arquivo.
- Mensagens de erro em português, amigáveis ao professor; detalhes técnicos só no log.
- Commits pequenos e descritivos, um conjunto por item de entrega.
- Não explique conceitos básicos; explique apenas decisões não óbvias.
- Se uma decisão minha for necessária (ex.: escolha de motor, nome de estilo), pergunte de forma objetiva, com a opção recomendada primeiro, e continue o que não depende dela.

---

## 9. Modelo do Relatório de Fase (obrigatório ao fim de cada fase)

```
## Relatório — FASE N: <nome>

### O que foi entregue
- <arquivo ou funcionalidade> — <uma linha>

### Critérios de aceite
| Critério | Status | Evidência |
|---|---|---|
| <critério 1> | ✅ | <comando executado> → <resultado> |
| <critério 2> | ✅ | ... |

### Testes
Saída final de `php tests/run.php`: <X testes, 0 falhas>

### Como publicar/testar esta fase no cecape-server
1. ...

### Decisões tomadas e pendências para a próxima fase
- ...

Aguardando "APROVADO FASE N" para iniciar a FASE N+1.
```

Se qualquer linha da tabela não estiver ✅, a fase **não** está concluída: não envie o relatório, corrija primeiro.

---

## 10. Comece agora

Inicie pela **FASE 0**. Antes de escrever código, apresente em até 10 linhas o plano da Fase 0 e as dúvidas que bloqueiam o trabalho (se houver). Em seguida, execute a fase até cumprir todos os critérios e entregue o Relatório de Fase.

---

## Adendo A — instruções complementares da primeira sessão

> "Adote as imagens anexadas como modelos padrão para criação das artes."

As quatro imagens anexadas pelo coordenador foram salvas em
`templates/styles/referencias/referencia-01.webp` … `referencia-04.webp` e
estão descritas, com o mapa inicial de estilos derivado delas, em
`templates/styles/REFERENCIAS.md`. Todo prompt-modelo de estilo (Fase 1) e
todo template HTML do modo editável (Fase 6) deve reproduzir a linguagem
visual dessas referências: página A4 única preenchida de borda a borda, título
grande, blocos numerados com ícones, mascote amigável, rodapé com frase e
"Página X de Y".
