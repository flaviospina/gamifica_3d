# Fase 5 — Integração com o Gamifica (entregue)

Versão `0.5.0`. Testada de ponta a ponta em um Gamifica V2 local com MariaDB e, para o caminho V1, contra o
esquema `gamifica_v1.sql` com os triggers originais.

## 1. SQL (mostrar antes de executar — veja o arquivo completo em `atividades/cruzadinha3d/sql/cruzadinha3d.sql`)

Única alteração em objeto existente:
```sql
ALTER TABLE atividades
    MODIFY tipo ENUM('quiz','leitura','projeto','cacapalavras','grupo','cruzadinha3d') NOT NULL;
```
Tabelas novas (todas `CREATE TABLE IF NOT EXISTS`, podem rodar mais de uma vez):

| Tabela | Para quê |
|---|---|
| `cruzadinha_config` | conteúdo da cruzadinha por atividade (tema, ano, desafio de tempo, JSON das palavras) |
| `cruzadinha_progresso` | progresso parcial por aluno × atividade (sobrevive a fechar a aba) |
| `cruzadinha_tentativas` | detalhe de cada tentativa: palavras, estrelas, dicas, tempo, modo, pontos (FK → `tentativas`) |
| `cruzadinha_avatar` | visual do explorador (4 campos, nenhum dado pessoal) |

Nenhuma view, trigger ou coluna existente é alterada além do ENUM.

## 2. Arquivos do Gamifica que mudam (só dois)

Versões completas em `integracao/`; edições manuais para V1 em `integracao/LEIA-ME.md`.

- `aluno/missao.php` — 4 linhas: se `tipo === 'cruzadinha3d'`, redireciona para o jogo.
- `professor/atividade_form.php` — novo tipo no select e um cartão com os botões do editor, teste e relatório.

## 3. Pasta do jogo (novos arquivos PHP)

| Arquivo | Função |
|---|---|
| `index.php` | `?demo=1` sem login/banco · `?id=N` aluno logado (carrega atividade, progresso, avatar) · `?id=N&teste=1` professor testa sem gravar |
| `api.php` | POST JSON com CSRF: `progresso`, `resultado`, `avatar`. Recalcula tudo a partir do gabarito do servidor; ignora pontos do cliente; grava tentativa + aciona o XP |
| `lib.php` | compatibilidade V1/V2 (`cruz_motor()`), validação do JSON, pontuação espelhada do JS, registro da tentativa |
| `editor.php` | professor cadastra palavras + dicas; gerador automático de layout no navegador; validação no servidor |
| `relatorio.php` | por aluno: palavras, tentativas, dicas, estrelas, melhor pontuação, modo; CSV; ordem alfabética, sem ranking de piores |
| `diagnostico.php` | verifica tabelas, ENUM, motor (V1/V2), helpers |

## 4. Como o XP entra

- **V2**: `INSERT tentativas` + `gamifica_registrar_resultado()` → ledger `xp_eventos`, moedas, mentor, metas, conquistas.
- **V1**: `INSERT tentativas (concluida=0)` + `UPDATE ... concluida=1` → dispara `tg_atualiza_xp_apos_tentativa`, que atualiza `aluno_xp` e `aluno_perfil`. Garantia extra: o jogo também faz o upsert `GREATEST` em `aluno_xp`.
- Só o melhor conta. Saída no meio (fechar a aba) envia um resultado **parcial** por `sendBeacon`; o servidor só grava se superar o melhor anterior.
- Atividade fora do prazo: o aluno pode jogar, nada é gravado, e a tela avisa.

## 5. Publicar pelo cPanel (sem terminal)

1. **phpMyAdmin** → banco do Gamifica → aba **Importar** → arquivo `atividades/cruzadinha3d/sql/cruzadinha3d.sql` → Executar.
2. **Gerenciador de Arquivos** → `public_html/gamifica/` → envie a pasta `atividades` (com `cruzadinha3d` dentro) inteira.
3. Substitua `aluno/missao.php` e `professor/atividade_form.php` pelos de `integracao/` (ou faça as 3 edições manuais do `integracao/LEIA-ME.md` se o seu V1 for diferente).
4. Abra `https://SEU-DOMINIO/gamifica/atividades/cruzadinha3d/diagnostico.php` logado como admin: tudo deve estar ✅.
5. Como professor: Atividades → Nova atividade → tipo **Cruzadinha 3D** → Criar → **Cadastrar palavras e dicas** → Gerar layout → Salvar → Publicar.
6. Como aluno: a missão abre direto no jogo. Ao terminar, a tela mostra "+X XP novos creditados".

## 6. Resultado do teste de ponta a ponta (V2 local)

| Passo | Resultado |
|---|---|
| Professora cria atividade tipo cruzadinha3d, cadastra 9 palavras, gera layout, salva, publica | ✅ |
| Professora testa (`&teste=1`) | ✅ modo `teste`, nada gravado |
| Aluna abre `aluno/missao.php?id=N` | ✅ redireciona ao jogo, nome "Bia" |
| Progresso parcial e avatar | ✅ gravados no servidor; após recarregar, 2 palavras e roupa roxa restauradas |
| Saída no meio com 2 palavras | ✅ tentativa parcial de 34 pontos gravada (melhorou o melhor) |
| Conclusão (120 XP, 8 estrelas) | ✅ 147 pontos, "+113 XP novos creditados", `xp_eventos` 34 + 113, `aluno_perfil` recalculado |
| Nova tentativa pior após "Jogar de novo" | ✅ não grava (melhor continua 147) |
| Relatório e CSV | ✅ "Bia Martins 9/9 · 2 tentativas · 2 dicas · ⭐ 8 · 147 XP · 3D · Completou" |
| Caminho V1 (trigger) | ✅ `aluno_perfil.xp_total` 125, melhor mantido após tentativa pior |
