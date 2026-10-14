<?php
// ============================================================
//  aluno/missao.php — Fazer uma missão (todos os tipos)
//  Tentativas ilimitadas por padrão · só o melhor resultado conta
// ============================================================
require_once dirname(__DIR__) . '/includes/bootstrap.php';
requer_aluno();

$pdo      = db();
$aluno_id = usuario_id();
$id       = (int)($_GET['id'] ?? 0);

// ── Carrega a atividade e valida o acesso ────────────────────
$stmt = $pdo->prepare(
    'SELECT a.* FROM atividades a
     JOIN aluno_turma at2 ON at2.turma_id = a.turma_id AND at2.usuario_id = ? AND at2.ativo = 1
     WHERE a.id = ? AND a.publicada = 1'
);
$stmt->execute([$aluno_id, $id]);
$atv = $stmt->fetch();
if (!$atv) { flash_set('Atividade não encontrada ou não disponível para você.', 'erro'); redirect(BASE_URL . '/aluno/missoes.php'); }

// ── Cruzadinha 3D (Ilha das Palavras): roda na própria pasta do jogo ──
if ($atv['tipo'] === 'cruzadinha3d') {
    redirect(BASE_URL . '/atividades/cruzadinha3d/index.php?id=' . $id);
}

$encerrada = ($atv['data_fim'] && strtotime($atv['data_fim']) < time())
          || ($atv['data_inicio'] && strtotime($atv['data_inicio']) > time());

// Tentativas já usadas
$t = $pdo->prepare('SELECT COUNT(*) FROM tentativas WHERE aluno_id = ? AND atividade_id = ? AND concluida = 1');
$t->execute([$aluno_id, $id]);
$tentativas_usadas = (int)$t->fetchColumn();
$sem_tentativas = $atv['max_tentativas'] > 0 && $tentativas_usadas >= (int)$atv['max_tentativas'];

// Melhor resultado
$mx = $pdo->prepare('SELECT xp_melhor FROM aluno_xp WHERE aluno_id = ? AND atividade_id = ?');
$mx->execute([$aluno_id, $id]);
$xp_melhor = (int)($mx->fetchColumn() ?: 0);

$resultado = null; // preenchido após correção

// ============================================================
//  POST — correção
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_valido($_POST['csrf_token'] ?? '') && !$encerrada && !$sem_tentativas) {

    // ── Quiz / Leitura: corrige questões de múltipla escolha ──
    if (in_array($atv['tipo'], ['quiz', 'leitura'], true) && isset($_POST['resposta'])) {
        $qs = $pdo->prepare('SELECT id FROM quiz_questoes WHERE atividade_id = ?');
        $qs->execute([$id]);
        $questoes = $qs->fetchAll(PDO::FETCH_COLUMN);
        $total = count($questoes);

        $acertos = 0;
        if ($total > 0) {
            $corretas = $pdo->prepare(
                'SELECT questao_id, id FROM quiz_alternativas WHERE correta = 1 AND questao_id IN ('
                . implode(',', array_fill(0, $total, '?')) . ')'
            );
            $corretas->execute($questoes);
            $mapa = $corretas->fetchAll(PDO::FETCH_KEY_PAIR);
            foreach ($questoes as $qid) {
                if ((int)($_POST['resposta'][$qid] ?? 0) === (int)($mapa[$qid] ?? -1)) $acertos++;
            }
        }

        $pct = $total ? round(100 * $acertos / $total, 2) : 0;
        $xp  = $total ? (int)round($atv['xp_recompensa'] * $acertos / $total) : 0;

        $pdo->prepare(
            'INSERT INTO tentativas (aluno_id, atividade_id, numero, acertos, total_questoes, percentual, xp_ganho, concluida, finalizada_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())'
        )->execute([$aluno_id, $id, $tentativas_usadas + 1, $acertos, $total, $pct, $xp]);

        $delta = gamifica_registrar_resultado($aluno_id, $id, $xp, 'missao', $atv['titulo']);
        $resultado = ['acertos' => $acertos, 'total' => $total, 'pct' => $pct, 'xp' => $xp, 'delta' => $delta];
        $tentativas_usadas++;
        $xp_melhor = max($xp_melhor, $xp);
    }

    // ── Caça-palavras: valida palavras encontradas ────────────
    if ($atv['tipo'] === 'cacapalavras' && isset($_POST['achadas'])) {
        $dados = cacapalavras_grade($id);
        $palavras = $dados['palavras'] ?? [];
        $achadas = array_intersect(
            array_unique(array_map('mb_strtoupper', array_filter(explode(',', $_POST['achadas'])))),
            $palavras
        );
        $total   = count($palavras);
        $acertos = count($achadas);
        $pct = $total ? round(100 * $acertos / $total, 2) : 0;
        $xp  = $total ? (int)round($atv['xp_recompensa'] * $acertos / $total) : 0;

        $pdo->prepare(
            'INSERT INTO tentativas (aluno_id, atividade_id, numero, acertos, total_questoes, percentual, xp_ganho, concluida, finalizada_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())'
        )->execute([$aluno_id, $id, $tentativas_usadas + 1, $acertos, $total, $pct, $xp]);

        $delta = gamifica_registrar_resultado($aluno_id, $id, $xp, 'missao', $atv['titulo']);
        $resultado = ['acertos' => $acertos, 'total' => $total, 'pct' => $pct, 'xp' => $xp, 'delta' => $delta];
        $tentativas_usadas++;
        $xp_melhor = max($xp_melhor, $xp);
    }

    // ── Projeto: envia entrega de etapa ───────────────────────
    if ($atv['tipo'] === 'projeto' && isset($_POST['etapa_id'], $_POST['texto'])) {
        $etapa_id = (int)$_POST['etapa_id'];
        $chk = $pdo->prepare('SELECT id FROM projeto_etapas WHERE id = ? AND atividade_id = ?');
        $chk->execute([$etapa_id, $id]);
        if ($chk->fetch() && trim($_POST['texto']) !== '') {
            $pdo->prepare(
                "INSERT INTO projeto_entregas (etapa_id, aluno_id, texto, status)
                 VALUES (?, ?, ?, 'enviada')
                 ON DUPLICATE KEY UPDATE texto = VALUES(texto), status = 'enviada', comentario_prof = NULL"
            )->execute([$etapa_id, $aluno_id, trim($_POST['texto'])]);
            notificar((int)$atv['professor_id'], 'projeto', 'Nova entrega de projeto 🔬', usuario_nome() . ' enviou uma etapa de "' . $atv['titulo'] . '"');
            flash_set('Etapa enviada! Seu professor vai revisar. 🔬');
        }
        redirect(BASE_URL . '/aluno/missao.php?id=' . $id);
    }
}

pagina_inicio($atv['titulo'], 'missoes');
?>

<div class="card">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
    <div class="mission-meta" style="margin:0;">
      <span class="badge ba"><?= e($atv['disciplina']) ?></span>
      <span class="badge bk"><?= icone_tipo($atv['tipo']) ?> <?= ucfirst($atv['tipo']) ?></span>
      <span class="xp-badge">⭐ <?= (int)$atv['xp_recompensa'] ?> XP</span>
      <span class="badge bp"><?= $atv['max_tentativas'] > 0 ? "Tentativas: {$tentativas_usadas}/{$atv['max_tentativas']}" : 'Tentativas ilimitadas' ?></span>
      <?php if ($xp_melhor > 0): ?><span class="badge bg">✅ Melhor: <?= $xp_melhor ?> XP</span><?php endif; ?>
    </div>
    <a href="missoes.php" class="btn btn-outline" style="font-size:12px;">← Missões</a>
  </div>
  <?php if ($atv['descricao']): ?><p style="margin-top:10px;font-size:14px;font-weight:600;color:#555;"><?= nl2br(e($atv['descricao'])) ?></p><?php endif; ?>
</div>

<?php if ($resultado): ?>
<div class="card celebrar" id="cardResultado" style="text-align:center;border-color:<?= $resultado['pct'] >= 60 ? '#b8ea86' : '#ffe9a3' ?>;">
  <div class="pop" style="font-size:64px;"><?= $resultado['pct'] >= 100 ? '🏆' : ($resultado['pct'] >= 60 ? '🎉' : '💪') ?></div>
  <div style="font-size:24px;font-weight:800;margin:6px 0;font-family:'Baloo 2',sans-serif;">
    <?= $resultado['pct'] >= 100 ? 'PERFEITO!' : ($resultado['pct'] >= 60 ? 'Muito bem!' : 'Boa tentativa!') ?>
  </div>
  <div style="font-size:17px;font-weight:800;margin-bottom:4px;">Você fez <?= (int)$resultado['acertos'] ?> de <?= (int)$resultado['total'] ?> (<?= round($resultado['pct']) ?>%)</div>
  <?php if ($resultado['pct'] >= 60): ?>
  <script>
  (function(){
    const card = document.getElementById('cardResultado');
    const emojis = ['🎉','⭐','🎊','✨','💛','💚','💙'];
    for (let i = 0; i < 24; i++) {
      const c = document.createElement('span');
      c.className = 'confete';
      c.textContent = emojis[i % emojis.length];
      c.style.left = (3 + Math.random() * 94) + '%';
      c.style.animationDuration = (1.6 + Math.random() * 1.8) + 's';
      c.style.animationDelay = (Math.random() * 0.9) + 's';
      card.appendChild(c);
    }
  })();
  </script>
  <?php endif; ?>
  <div style="font-size:14px;font-weight:700;color:#7c6ef0;">
    <?php if ($resultado['delta'] > 0): ?>
      +<?= (int)$resultado['delta'] ?> XP novos creditados! 🚀
    <?php elseif ($resultado['xp'] >= $xp_melhor && $resultado['xp'] > 0): ?>
      Você igualou seu melhor resultado. Seu XP está garantido!
    <?php else: ?>
      Seu melhor resultado (<?= $xp_melhor ?> XP) continua valendo — nada foi perdido. 😉
    <?php endif; ?>
  </div>
  <div style="margin-top:12px;">
    <?php if (!$sem_tentativas): ?><a href="missao.php?id=<?= $id ?>" class="btn btn-primary">Tentar de novo →</a><?php endif; ?>
    <a href="<?= BASE_URL ?>/aluno/" class="btn btn-outline">Voltar ao painel</a>
  </div>
</div>

<?php elseif ($encerrada): ?>
<div class="alert alert-info">⏰ Esta atividade está fora do período de realização.</div>

<?php elseif ($sem_tentativas): ?>
<div class="alert alert-info">🏁 Você usou todas as tentativas desta atividade. Seu melhor resultado (<?= $xp_melhor ?> XP) está garantido!</div>

<?php else: ?>

<?php // ══════════ QUIZ / LEITURA ══════════
if (in_array($atv['tipo'], ['quiz', 'leitura'], true)):
    if ($atv['tipo'] === 'leitura') {
        $lc = $pdo->prepare('SELECT texto FROM leitura_conteudo WHERE atividade_id = ?');
        $lc->execute([$id]);
        $texto = $lc->fetchColumn();
        if ($texto): ?>
        <div class="card"><div class="card-title">📖 Leia com atenção</div>
          <div style="font-size:14px;font-weight:600;line-height:1.7;color:#333;"><?= nl2br(e($texto)) ?></div>
        </div>
        <?php endif;
    }
    $qs = $pdo->prepare('SELECT * FROM quiz_questoes WHERE atividade_id = ? ORDER BY ordem, id');
    $qs->execute([$id]);
    $questoes = $qs->fetchAll();
    if (empty($questoes)): ?>
      <div class="alert alert-info">Esta atividade ainda não tem questões. Avise seu professor. 😉</div>
    <?php else: ?>
    <form method="POST">
      <?= csrf_input() ?>
      <?php foreach ($questoes as $i => $q):
        $alts = $pdo->prepare('SELECT * FROM quiz_alternativas WHERE questao_id = ? ORDER BY ordem, id');
        $alts->execute([$q['id']]);
      ?>
      <div class="card">
        <div style="font-size:15px;font-weight:800;margin-bottom:12px;"><?= $i + 1 ?>. <?= e($q['enunciado']) ?></div>
        <?php if ($q['imagem_url']): ?><img src="<?= e($q['imagem_url']) ?>" style="max-width:100%;border-radius:10px;margin-bottom:10px;" alt=""><?php endif; ?>
        <?php foreach ($alts->fetchAll() as $alt): ?>
          <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:2px solid #f0eff5;border-radius:11px;margin-bottom:8px;cursor:pointer;font-size:14px;font-weight:600;">
            <input type="radio" name="resposta[<?= (int)$q['id'] ?>]" value="<?= (int)$alt['id'] ?>" required style="width:auto;">
            <?= e($alt['texto']) ?>
          </label>
        <?php endforeach; ?>
      </div>
      <?php endforeach; ?>
      <div style="text-align:center;margin:16px 0;">
        <button type="submit" class="btn btn-primary" style="font-size:15px;padding:12px 28px;">Enviar respostas ✓</button>
      </div>
    </form>
    <?php endif; ?>

<?php // ══════════ CAÇA-PALAVRAS (com dicas) ══════════
elseif ($atv['tipo'] === 'cacapalavras'):
    $dados = cacapalavras_grade($id);
    if (!$dados): ?>
      <div class="alert alert-info">O caça-palavras ainda não foi configurado. Avise seu professor. 😉</div>
    <?php else:
      $itens = $dados['itens'];
      $ncols = count($dados['grade'][0] ?? []);
      // Layout adaptável ao ANO do Fundamental I (letras maiores nos anos iniciais).
      // O ano vem do nome da turma (ex.: "1º Ano" → 1); se não houver, usa o tamanho da grade.
      $tnome = '';
      $tq = $pdo->prepare('SELECT nome FROM turmas WHERE id = ?');
      $tq->execute([(int)$atv['turma_id']]);
      $tnome = (string)($tq->fetchColumn() ?: '');
      $ano = (preg_match('/(\d)/', $tnome, $mm)) ? (int)$mm[1] : 0;
      if ($ano >= 1 && $ano <= 5) {
          $gclass = $ano <= 2 ? 'caca-g1' : ($ano === 3 ? 'caca-g2' : 'caca-g3');
      } else {
          $gclass = $ncols <= 9 ? 'caca-g1' : ($ncols <= 11 ? 'caca-g2' : 'caca-g3');
      }
      $total_p = count($itens);
      $tema = caca_tema($atv['disciplina'], $ano);
    ?>
    <div class="caca-cena <?= $gclass ?>"
         style="--ceu1:<?= $tema['ceu1'] ?>;--ceu2:<?= $tema['ceu2'] ?>;--chao:<?= $tema['chao'] ?>;--tema:<?= $tema['cor'] ?>;--ano-cor:<?= $tema['cor_ano'] ?>;">
      <!-- Enfeites do cenário (variam por disciplina) -->
      <div class="caca-deco" aria-hidden="true">
        <?php
          $pos = [[3,7],[10,84],[22,15],[16,60],[75,90],[84,10],[70,50],[90,72]];
          foreach ($tema['emojis'] as $k => $emo):
            [$t,$l] = $pos[$k % count($pos)];
        ?>
          <span class="deco d<?= $k % 4 ?>" style="top:<?= $t ?>%;left:<?= $l ?>%;"><?= $emo ?></span>
        <?php endforeach; ?>
      </div>

      <!-- Cabeçalho do jogo -->
      <div class="caca-topo">
        <span class="caca-ano-badge"><?= $ano >= 1 && $ano <= 5 ? $ano . 'º Ano' : e($tnome) ?></span>
        <div class="caca-tema-pill"><?= e($tema['tema']) ?></div>
      </div>
      <div class="caca-instr">🔎 Leia a pista e ache a palavra! Clique na <b>primeira</b> e na <b>última</b> letra. Vale em qualquer direção.</div>

      <div class="caca-wrap">
        <!-- Grade dentro de um cartão branco -->
        <div class="caca-painel">
          <table class="caca-grade" id="grade">
            <?php foreach ($dados['grade'] as $l => $linha): ?>
            <tr><?php foreach ($linha as $c => $letra): ?><td data-l="<?= $l ?>" data-c="<?= $c ?>"><?= e($letra) ?></td><?php endforeach; ?></tr>
            <?php endforeach; ?>
          </table>
        </div>
        <!-- Pistas coloridas -->
        <div class="caca-pistas">
          <div class="caca-pistas-tit">Pistas <span id="cacaContador" class="caca-contador">0/<?= $total_p ?></span></div>
          <?php foreach ($itens as $i => $it): ?>
            <div class="pista hlc-<?= $i % 6 ?>" id="pista-<?= $i ?>" data-palavra="<?= e($it['p']) ?>">
              <span class="pista-num"><?= $i + 1 ?></span>
              <span class="pista-txt"><?= e($it['d'] !== '' ? $it['d'] : 'Ache: ' . $it['p']) ?></span>
              <span class="pista-resp" hidden>✓ <?= e($it['p']) ?></span>
            </div>
          <?php endforeach; ?>
          <form method="POST" id="formCaca" style="margin-top:14px;">
            <?= csrf_input() ?>
            <input type="hidden" name="achadas" id="achadas" value="">
            <button type="submit" class="caca-finalizar">Finalizar ✓</button>
          </form>
        </div>
      </div>
    </div>
    <script>
    (function(){
      const itens = <?= json_encode(array_column($itens, 'p')) ?>;
      const achadas = new Set();
      let inicio = null;
      const grade = document.getElementById('grade');
      const contador = document.getElementById('cacaContador');
      const total = itens.length;

      function marcar(alvo, celulas){
        if (achadas.has(alvo)) return;
        achadas.add(alvo);
        const idx = itens.indexOf(alvo);
        const cls = 'hl-' + (idx % 6);
        celulas.forEach(c => { c.classList.add('achada', cls); });
        document.querySelectorAll('.pista[data-palavra="' + alvo + '"]').forEach(p => {
          p.classList.add('achada');
          const r = p.querySelector('.pista-resp'); if (r) r.hidden = false;
        });
        document.getElementById('achadas').value = Array.from(achadas).join(',');
        contador.textContent = achadas.size + '/' + total;
        if (achadas.size === total) contador.classList.add('completo');
      }

      grade.addEventListener('click', function(ev){
        const td = ev.target.closest('td');
        if (!td) return;
        if (!inicio) { inicio = td; td.classList.add('sel'); return; }
        const l1 = +inicio.dataset.l, c1 = +inicio.dataset.c;
        const l2 = +td.dataset.l,     c2 = +td.dataset.c;
        const dl = Math.sign(l2 - l1), dc = Math.sign(c2 - c1);
        const len = Math.max(Math.abs(l2 - l1), Math.abs(c2 - c1)) + 1;
        const reta = (l1 === l2) || (c1 === c2) || (Math.abs(l2 - l1) === Math.abs(c2 - c1));
        let celulas = [], palavra = '';
        if (reta) {
          for (let i = 0; i < len; i++) {
            const cel = grade.querySelector('td[data-l="' + (l1 + dl*i) + '"][data-c="' + (c1 + dc*i) + '"]');
            if (!cel) { celulas = []; break; }
            celulas.push(cel); palavra += cel.textContent.trim();
          }
        }
        const invertida = palavra.split('').reverse().join('');
        let alvo = null;
        if (itens.includes(palavra)) alvo = palavra;
        else if (itens.includes(invertida)) alvo = invertida;
        if (alvo) marcar(alvo, celulas);
        inicio.classList.remove('sel');
        inicio = null;
      });
    })();
    </script>
    <?php endif; ?>

<?php // ══════════ PROJETO POR ETAPAS ══════════
elseif ($atv['tipo'] === 'projeto'):
    $et = $pdo->prepare(
        'SELECT pe.*, en.status AS entrega_status, en.texto AS entrega_texto, en.comentario_prof
         FROM projeto_etapas pe
         LEFT JOIN projeto_entregas en ON en.etapa_id = pe.id AND en.aluno_id = ?
         WHERE pe.atividade_id = ? ORDER BY pe.ordem'
    );
    $et->execute([$aluno_id, $id]);
    $etapas = $et->fetchAll();
    $liberada = true; // primeira etapa sempre liberada; as demais após aprovação da anterior
    foreach ($etapas as $i => $etp):
        $st = $etp['entrega_status'];
?>
    <div class="card" <?= !$liberada ? 'style="opacity:.55;"' : '' ?>>
      <div class="card-title">
        <span>Etapa <?= (int)$etp['ordem'] ?>: <?= e($etp['titulo']) ?></span>
        <span class="xp-badge">⭐ <?= (int)$etp['xp_etapa'] ?> XP</span>
      </div>
      <?php if ($etp['descricao']): ?><p style="font-size:13px;font-weight:600;color:#666;margin-bottom:10px;"><?= nl2br(e($etp['descricao'])) ?></p><?php endif; ?>

      <?php if (!$liberada): ?>
        <div style="font-size:13px;color:#aaa;font-weight:700;">🔒 Conclua a etapa anterior para liberar.</div>
      <?php elseif ($st === 'aprovada'): ?>
        <div class="alert alert-ok" style="margin:0;">✅ Etapa aprovada! XP creditado.</div>
      <?php elseif ($st === 'enviada'): ?>
        <div class="alert alert-info" style="margin-bottom:10px;">📨 Enviada — aguardando revisão do professor.</div>
        <details><summary style="font-size:12px;font-weight:700;color:#7c6ef0;cursor:pointer;">Ver minha entrega</summary>
          <p style="font-size:13px;font-weight:600;margin-top:8px;"><?= nl2br(e($etp['entrega_texto'])) ?></p></details>
      <?php else: ?>
        <?php if ($st === 'revisar'): ?>
          <div class="alert alert-info" style="margin-bottom:10px;">💬 Professor pediu ajustes: <?= e($etp['comentario_prof'] ?? '') ?> — melhore e reenvie (sem perder nada!)</div>
        <?php endif; ?>
        <form method="POST">
          <?= csrf_input() ?>
          <input type="hidden" name="etapa_id" value="<?= (int)$etp['id'] ?>">
          <div class="fld">
            <label>Sua entrega</label>
            <textarea name="texto" rows="4" required placeholder="Escreva aqui o que foi feito nesta etapa..."><?= e($etp['entrega_texto'] ?? '') ?></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Enviar etapa →</button>
        </form>
      <?php endif; ?>
    </div>
<?php
        if ($st !== 'aprovada') $liberada = false;
    endforeach;

// ══════════ TRABALHO EM GRUPO ══════════
elseif ($atv['tipo'] === 'grupo'):
    $gm = $pdo->prepare(
        'SELECT gm.*, u.nome FROM grupo_membros gm JOIN usuarios u ON u.id = gm.aluno_id
         WHERE gm.atividade_id = ? ORDER BY gm.lider DESC, u.nome'
    );
    $gm->execute([$id]);
    $membros = $gm->fetchAll();
    $sou_membro = array_filter($membros, fn($m) => (int)$m['aluno_id'] === $aluno_id);
?>
    <div class="card">
      <div class="card-title">🤝 Seu grupo</div>
      <?php if (empty($membros)): ?>
        <div style="font-size:13px;color:#aaa;font-weight:700;">O professor ainda não montou os grupos.</div>
      <?php else: ?>
        <?php foreach ($membros as $m): ?>
          <div class="rank-row">
            <span><?= $m['lider'] ? '⭐' : '👤' ?></span>
            <div style="flex:1;font-size:13px;font-weight:700;"><?= e($m['nome']) ?><?= $m['lider'] ? ' <span class="badge bp">líder</span>' : '' ?></div>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
      <?php if ($xp_melhor > 0): ?>
        <div class="alert alert-ok" style="margin-top:12px;">✅ Trabalho concluído! Todos do grupo receberam <?= $xp_melhor ?> XP.</div>
      <?php elseif ($sou_membro): ?>
        <div class="alert alert-info" style="margin-top:12px;">Quando o professor concluir a avaliação, todo o grupo recebe o XP junto. 🤝</div>
      <?php endif; ?>
    </div>
<?php endif; ?>

<?php endif; // fim: not resultado/encerrada/sem_tentativas ?>

<?php pagina_fim(); ?>
