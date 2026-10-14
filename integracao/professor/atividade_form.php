<?php
// professor/atividade_form.php — Criar/editar atividade + conteúdo por tipo
require_once dirname(__DIR__) . '/includes/bootstrap.php';
requer_professor();

$pdo     = db();
$prof_id = usuario_id();
$id      = (int)($_GET['id'] ?? 0);

// Minhas turmas/disciplinas
$pt = $pdo->prepare(
    'SELECT pt.turma_id, t.nome AS turma_nome, pt.disciplina FROM professor_turma pt
     JOIN turmas t ON t.id = pt.turma_id AND t.ativa = 1
     WHERE pt.professor_id = ? AND pt.ativo = 1 ORDER BY t.nome, pt.disciplina'
);
$pt->execute([$prof_id]);
$vinculos = $pt->fetchAll();
if (empty($vinculos)) { flash_set('Você ainda não está vinculado a nenhuma turma. Fale com o admin.', 'erro'); redirect(BASE_URL . '/professor/'); }

$atv = null;
if ($id) {
    $stmt = $pdo->prepare('SELECT * FROM atividades WHERE id = ? AND professor_id = ?');
    $stmt->execute([$id, $prof_id]);
    $atv = $stmt->fetch();
    if (!$atv) { flash_set('Atividade não encontrada.', 'erro'); redirect(BASE_URL . '/professor/atividades.php'); }
}

// ── POST ─────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_valido($_POST['csrf_token'] ?? '')) {
    $acao = $_POST['acao'] ?? 'salvar';

    // Salvar metadados
    if ($acao === 'salvar') {
        $titulo = trim($_POST['titulo'] ?? '');
        $tipo   = in_array($_POST['tipo'] ?? '', ['quiz','leitura','projeto','cacapalavras','grupo','cruzadinha3d'], true) ? $_POST['tipo'] : 'quiz';
        $turma_id = (int)($_POST['turma_id'] ?? 0);
        $disciplina = trim($_POST['disciplina'] ?? '');
        $xp = min((int)config('xp_maximo_atividade', '500'), max(10, (int)($_POST['xp_recompensa'] ?? 100)));
        $max_t = max(0, (int)($_POST['max_tentativas'] ?? 0));
        $d_ini = $_POST['data_inicio'] ?: null;
        $d_fim = $_POST['data_fim'] ?: null;

        $turma_ok = array_filter($vinculos, fn($v) => (int)$v['turma_id'] === $turma_id);
        if ($titulo === '' || !$turma_ok || $disciplina === '') {
            flash_set('Preencha título, turma e disciplina.', 'erro');
        } elseif ($atv) {
            $pdo->prepare(
                'UPDATE atividades SET titulo=?, descricao=?, tipo=?, disciplina=?, turma_id=?, xp_recompensa=?, max_tentativas=?, data_inicio=?, data_fim=? WHERE id=?'
            )->execute([$titulo, trim($_POST['descricao'] ?? ''), $tipo, $disciplina, $turma_id, $xp, $max_t, $d_ini, $d_fim, $id]);
            flash_set('Atividade atualizada!');
            redirect(BASE_URL . '/professor/atividade_form.php?id=' . $id);
        } else {
            $pdo->prepare(
                'INSERT INTO atividades (professor_id, turma_id, titulo, descricao, tipo, disciplina, xp_recompensa, max_tentativas, data_inicio, data_fim)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([$prof_id, $turma_id, $titulo, trim($_POST['descricao'] ?? ''), $tipo, $disciplina, $xp, $max_t, $d_ini, $d_fim]);
            flash_set('Atividade criada! Agora adicione o conteúdo abaixo e publique quando estiver pronta.');
            redirect(BASE_URL . '/professor/atividade_form.php?id=' . (int)$pdo->lastInsertId());
        }
    }

    // Conteúdo — só com atividade existente
    if ($atv) {
        if ($acao === 'add_questao') {
            $enunciado = trim($_POST['enunciado'] ?? '');
            $alts = $_POST['alt'] ?? [];
            $correta = (int)($_POST['correta'] ?? 0);
            if ($enunciado !== '' && count(array_filter($alts, fn($a) => trim($a) !== '')) >= 2) {
                $pdo->prepare('INSERT INTO quiz_questoes (atividade_id, ordem, enunciado) VALUES (?, ?, ?)')
                    ->execute([$id, (int)($_POST['ordem'] ?? 1), $enunciado]);
                $qid = (int)$pdo->lastInsertId();
                foreach ($alts as $i => $texto) {
                    if (trim($texto) === '') continue;
                    $pdo->prepare('INSERT INTO quiz_alternativas (questao_id, texto, correta, ordem) VALUES (?, ?, ?, ?)')
                        ->execute([$qid, trim($texto), (int)($i === $correta), $i + 1]);
                }
                flash_set('Questão adicionada!');
            } else {
                flash_set('Informe o enunciado e pelo menos 2 alternativas.', 'erro');
            }
        }
        if ($acao === 'del_questao') {
            $pdo->prepare('DELETE q FROM quiz_questoes q WHERE q.id = ? AND q.atividade_id = ?')
                ->execute([(int)$_POST['questao_id'], $id]);
            flash_set('Questão removida.');
        }
        if ($acao === 'salvar_leitura') {
            $pdo->prepare(
                'INSERT INTO leitura_conteudo (atividade_id, texto) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE texto = VALUES(texto)'
            )->execute([$id, trim($_POST['texto'] ?? '')]);
            flash_set('Texto de leitura salvo!');
        }
        if ($acao === 'add_etapa') {
            $pdo->prepare('INSERT INTO projeto_etapas (atividade_id, ordem, titulo, descricao, xp_etapa) VALUES (?, ?, ?, ?, ?)')
                ->execute([$id, (int)($_POST['ordem'] ?? 1), trim($_POST['titulo_etapa'] ?? ''), trim($_POST['desc_etapa'] ?? ''), max(0, (int)($_POST['xp_etapa'] ?? 0))]);
            $pdo->prepare('UPDATE atividades SET total_etapas = (SELECT COUNT(*) FROM projeto_etapas WHERE atividade_id = ?) WHERE id = ?')
                ->execute([$id, $id]);
            flash_set('Etapa adicionada!');
        }
        if ($acao === 'del_etapa') {
            $pdo->prepare('DELETE FROM projeto_etapas WHERE id = ? AND atividade_id = ?')
                ->execute([(int)$_POST['etapa_id'], $id]);
            flash_set('Etapa removida.');
        }
        if ($acao === 'salvar_palavras') {
            // Cada linha: "PALAVRA | dica opcional". A palavra é normalizada (sem acentos).
            $itens = [];
            $maior = 0;
            foreach (explode("\n", $_POST['palavras'] ?? '') as $linha) {
                $partes = explode('|', $linha, 2);
                $p = caca_normalizar($partes[0] ?? '');
                $d = trim($partes[1] ?? '');
                if (mb_strlen($p) >= 3) {
                    $itens[] = ['p' => $p, 'd' => $d];
                    $maior = max($maior, mb_strlen($p));
                }
            }
            if ($itens) {
                // Grade quadrada: cabe a maior palavra e dá folga (mín. 8, máx. 15)
                $lado = max(8, min(15, $maior + 2));
                $pdo->prepare(
                    'INSERT INTO cacapalavras_config (atividade_id, grid_linhas, grid_colunas, palavras, grade_gerada)
                     VALUES (?, ?, ?, ?, NULL)
                     ON DUPLICATE KEY UPDATE grid_linhas = VALUES(grid_linhas), grid_colunas = VALUES(grid_colunas),
                                             palavras = VALUES(palavras), grade_gerada = NULL'
                )->execute([$id, $lado, $lado, json_encode($itens, JSON_UNESCAPED_UNICODE)]);
                flash_set('Palavras e dicas salvas — a grade será gerada automaticamente!');
            } else {
                flash_set('Informe ao menos uma palavra com 3+ letras (uma por linha).', 'erro');
            }
        }
        if ($acao === 'salvar_grupo') {
            $pdo->prepare('DELETE FROM grupo_membros WHERE atividade_id = ?')->execute([$id]);
            $lider = (int)($_POST['lider'] ?? 0);
            foreach ($_POST['membros'] ?? [] as $aluno_id) {
                $pdo->prepare('INSERT IGNORE INTO grupo_membros (atividade_id, aluno_id, lider) VALUES (?, ?, ?)')
                    ->execute([$id, (int)$aluno_id, (int)((int)$aluno_id === $lider)]);
            }
            flash_set('Grupo salvo!');
        }
        redirect(BASE_URL . '/professor/atividade_form.php?id=' . $id);
    }
}

pagina_inicio($atv ? 'Editar: ' . $atv['titulo'] : 'Nova Atividade', 'atividades');
?>
<div class="card">
  <div class="card-title"><?= $atv ? '✏️ Dados da atividade' : '➕ Nova atividade' ?></div>
  <form method="POST">
    <?= csrf_input() ?>
    <input type="hidden" name="acao" value="salvar">
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;">
      <div class="fld"><label>Título</label><input type="text" name="titulo" required maxlength="200" value="<?= e($atv['titulo'] ?? '') ?>"></div>
      <div class="fld"><label>Tipo</label>
        <select name="tipo" <?= $atv ? 'disabled' : '' ?>>
          <?php foreach (['quiz' => '❓ Quiz', 'leitura' => '📖 Leitura + questões', 'projeto' => '🔬 Projeto por etapas', 'cacapalavras' => '🔤 Caça-palavras', 'grupo' => '🤝 Trabalho em grupo', 'cruzadinha3d' => '🏝️ Cruzadinha 3D (Ilha das Palavras)'] as $v => $r): ?>
            <option value="<?= $v ?>" <?= ($atv['tipo'] ?? '') === $v ? 'selected' : '' ?>><?= $r ?></option>
          <?php endforeach; ?>
        </select>
        <?php if ($atv): ?><input type="hidden" name="tipo" value="<?= e($atv['tipo']) ?>"><?php endif; ?>
      </div>
    </div>
    <div class="fld"><label>Descrição / instruções</label><textarea name="descricao" rows="2"><?= e($atv['descricao'] ?? '') ?></textarea></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
      <div class="fld"><label>Turma · Disciplina</label>
        <select name="turma_disc" onchange="const [t,d]=this.value.split('|');this.form.turma_id.value=t;this.form.disciplina.value=d;">
          <?php foreach ($vinculos as $v): $sel = $atv && (int)$atv['turma_id'] === (int)$v['turma_id'] && $atv['disciplina'] === $v['disciplina']; ?>
            <option value="<?= (int)$v['turma_id'] ?>|<?= e($v['disciplina']) ?>" <?= $sel ? 'selected' : '' ?>><?= e($v['turma_nome']) ?> · <?= e($v['disciplina']) ?></option>
          <?php endforeach; ?>
        </select>
        <input type="hidden" name="turma_id" value="<?= (int)($atv['turma_id'] ?? $vinculos[0]['turma_id']) ?>">
        <input type="hidden" name="disciplina" value="<?= e($atv['disciplina'] ?? $vinculos[0]['disciplina']) ?>">
      </div>
      <div class="fld"><label>XP (10–<?= (int)config('xp_maximo_atividade', '500') ?>)</label><input type="number" name="xp_recompensa" min="10" max="<?= (int)config('xp_maximo_atividade', '500') ?>" value="<?= (int)($atv['xp_recompensa'] ?? 100) ?>"></div>
      <div class="fld"><label>Tentativas (0 = ilimitadas ✨)</label><input type="number" name="max_tentativas" min="0" max="10" value="<?= (int)($atv['max_tentativas'] ?? 0) ?>"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="fld"><label>Início (opcional)</label><input type="date" name="data_inicio" value="<?= $atv && $atv['data_inicio'] ? date('Y-m-d', strtotime($atv['data_inicio'])) : '' ?>"></div>
      <div class="fld"><label>Prazo final (opcional)</label><input type="date" name="data_fim" value="<?= $atv && $atv['data_fim'] ? date('Y-m-d', strtotime($atv['data_fim'])) : '' ?>"></div>
    </div>
    <button type="submit" class="btn btn-primary"><?= $atv ? 'Salvar alterações' : 'Criar atividade →' ?></button>
    <a href="atividades.php" class="btn btn-outline">← Voltar</a>
  </form>
</div>

<?php if ($atv): ?>
<script>
// Garante turma/disciplina sincronizados no primeiro submit
document.querySelectorAll('select[name=turma_disc]').forEach(s => s.dispatchEvent(new Event('change')));
</script>

<?php // ── Conteúdo: QUIZ e LEITURA usam questões ──
if (in_array($atv['tipo'], ['quiz', 'leitura'], true)):
    if ($atv['tipo'] === 'leitura'):
        $lc = $pdo->prepare('SELECT texto FROM leitura_conteudo WHERE atividade_id = ?');
        $lc->execute([$id]);
        $texto = $lc->fetchColumn();
?>
<div class="card">
  <div class="card-title">📖 Texto da leitura</div>
  <form method="POST">
    <?= csrf_input() ?>
    <input type="hidden" name="acao" value="salvar_leitura">
    <div class="fld"><textarea name="texto" rows="8" required placeholder="Cole aqui o texto que os alunos vão ler..."><?= e($texto ?: '') ?></textarea></div>
    <button type="submit" class="btn btn-primary">Salvar texto</button>
  </form>
</div>
<?php endif;
    $qs = $pdo->prepare('SELECT * FROM quiz_questoes WHERE atividade_id = ? ORDER BY ordem, id');
    $qs->execute([$id]);
    $questoes = $qs->fetchAll();
?>
<div class="card">
  <div class="card-title">❓ Questões (<?= count($questoes) ?>)</div>
  <?php foreach ($questoes as $i => $q):
    $alts = $pdo->prepare('SELECT * FROM quiz_alternativas WHERE questao_id = ? ORDER BY ordem, id');
    $alts->execute([$q['id']]);
  ?>
  <div style="border:2px solid #f0eff5;border-radius:12px;padding:12px 14px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;gap:8px;">
      <div style="font-size:14px;font-weight:800;"><?= $i + 1 ?>. <?= e($q['enunciado']) ?></div>
      <form method="POST"><?= csrf_input() ?><input type="hidden" name="acao" value="del_questao"><input type="hidden" name="questao_id" value="<?= (int)$q['id'] ?>">
        <button type="submit" class="btn btn-outline" style="font-size:11px;" onclick="return confirm('Remover questão?')">🗑️</button></form>
    </div>
    <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
      <?php foreach ($alts->fetchAll() as $alt): ?>
        <span class="badge <?= $alt['correta'] ? 'bg' : 'bk' ?>"><?= $alt['correta'] ? '✓ ' : '' ?><?= e($alt['texto']) ?></span>
      <?php endforeach; ?>
    </div>
  </div>
  <?php endforeach; ?>

  <details <?= empty($questoes) ? 'open' : '' ?>>
    <summary style="font-size:13px;font-weight:800;color:#7c6ef0;cursor:pointer;margin-bottom:10px;">➕ Adicionar questão</summary>
    <form method="POST">
      <?= csrf_input() ?>
      <input type="hidden" name="acao" value="add_questao">
      <input type="hidden" name="ordem" value="<?= count($questoes) + 1 ?>">
      <div class="fld"><label>Enunciado</label><input type="text" name="enunciado" required></div>
      <?php foreach (range(0, 3) as $i): ?>
        <div class="fld" style="display:flex;gap:10px;align-items:center;">
          <input type="radio" name="correta" value="<?= $i ?>" <?= $i === 0 ? 'checked' : '' ?> style="width:auto;" title="Correta">
          <input type="text" name="alt[<?= $i ?>]" placeholder="Alternativa <?= $i + 1 ?><?= $i < 2 ? ' (obrigatória)' : ' (opcional)' ?>" <?= $i < 2 ? 'required' : '' ?>>
        </div>
      <?php endforeach; ?>
      <div style="font-size:11px;color:#aaa;font-weight:700;margin-bottom:10px;">Marque o círculo da alternativa correta.</div>
      <button type="submit" class="btn btn-primary">Adicionar questão</button>
    </form>
  </details>
</div>

<?php // ── PROJETO ──
elseif ($atv['tipo'] === 'projeto'):
    $et = $pdo->prepare('SELECT * FROM projeto_etapas WHERE atividade_id = ? ORDER BY ordem');
    $et->execute([$id]);
    $etapas = $et->fetchAll();
?>
<div class="card">
  <div class="card-title">🔬 Etapas do projeto (<?= count($etapas) ?>)</div>
  <?php foreach ($etapas as $etp): ?>
  <div class="rank-row">
    <span class="badge bp"><?= (int)$etp['ordem'] ?></span>
    <div style="flex:1;">
      <div style="font-size:13px;font-weight:800;"><?= e($etp['titulo']) ?> <span class="xp-badge">⭐ <?= (int)$etp['xp_etapa'] ?> XP</span></div>
      <?php if ($etp['descricao']): ?><div style="font-size:12px;color:#888;"><?= e($etp['descricao']) ?></div><?php endif; ?>
    </div>
    <form method="POST"><?= csrf_input() ?><input type="hidden" name="acao" value="del_etapa"><input type="hidden" name="etapa_id" value="<?= (int)$etp['id'] ?>">
      <button type="submit" class="btn btn-outline" style="font-size:11px;" onclick="return confirm('Remover etapa?')">🗑️</button></form>
  </div>
  <?php endforeach; ?>
  <details <?= empty($etapas) ? 'open' : '' ?>>
    <summary style="font-size:13px;font-weight:800;color:#7c6ef0;cursor:pointer;margin:10px 0;">➕ Adicionar etapa</summary>
    <form method="POST">
      <?= csrf_input() ?>
      <input type="hidden" name="acao" value="add_etapa">
      <input type="hidden" name="ordem" value="<?= count($etapas) + 1 ?>">
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;">
        <div class="fld"><label>Título da etapa</label><input type="text" name="titulo_etapa" required></div>
        <div class="fld"><label>XP da etapa</label><input type="number" name="xp_etapa" min="0" value="50"></div>
      </div>
      <div class="fld"><label>Instruções</label><textarea name="desc_etapa" rows="2"></textarea></div>
      <button type="submit" class="btn btn-primary">Adicionar etapa</button>
    </form>
  </details>
  <div style="font-size:12px;color:#888;font-weight:600;margin-top:8px;">💡 O XP é creditado ao aprovar cada entrega em <a href="portfolio.php" style="color:#7c6ef0;">Portfólio &amp; Entregas</a>.</div>
</div>

<?php // ── CAÇA-PALAVRAS (com dicas) ──
elseif ($atv['tipo'] === 'cacapalavras'):
    $cc = $pdo->prepare('SELECT palavras FROM cacapalavras_config WHERE atividade_id = ?');
    $cc->execute([$id]);
    $itens = caca_itens($cc->fetchColumn() ?: '[]');
    $linhas = array_map(fn($it) => $it['d'] !== '' ? $it['p'] . ' | ' . $it['d'] : $it['p'], $itens);
?>
<div class="card">
  <div class="card-title">🔤 Palavras e dicas do caça-palavras</div>
  <div class="alert alert-info" style="margin-bottom:12px;">
    Uma por linha, no formato <b>PALAVRA | dica</b>. O aluno lê a dica e caça a palavra na grade.<br>
    Acentos são removidos automaticamente (a grade não usa acentos). A grade se ajusta ao tamanho das palavras.
  </div>
  <form method="POST">
    <?= csrf_input() ?>
    <input type="hidden" name="acao" value="salvar_palavras">
    <div class="fld">
      <label>Palavras com dicas (uma por linha)</label>
      <textarea name="palavras" rows="8" required placeholder="LEAO | Animal conhecido como o rei da selva 🦁&#10;GATO | Bicho de estimação que mia e gosta de dormir&#10;ZEBRA | Cavalo listrado de preto e branco"><?= e(implode("\n", $linhas)) ?></textarea>
    </div>
    <button type="submit" class="btn btn-primary">Salvar palavras e dicas</button>
  </form>
</div>

<?php // ── CRUZADINHA 3D (Ilha das Palavras) ──
elseif ($atv['tipo'] === 'cruzadinha3d'):
    $cz = $pdo->prepare('SELECT dados, tema FROM cruzadinha_config WHERE atividade_id = ?');
    $cz->execute([$id]);
    $czCfg = $cz->fetch();
    $czPalavras = $czCfg ? count(json_decode($czCfg['dados'], true) ?: []) : 0;
?>
<div class="card">
  <div class="card-title">🏝️ Conteúdo da cruzadinha 3D</div>
  <?php if ($czPalavras): ?>
    <div class="alert alert-ok" style="margin-bottom:12px;">✅ Cruzadinha configurada com <?= $czPalavras ?> palavras (tema: <?= e($czCfg['tema']) ?>).</div>
  <?php else: ?>
    <div class="alert alert-info" style="margin-bottom:12px;">A cruzadinha ainda não tem palavras. Cadastre as palavras e dicas no editor; a grade é montada automaticamente.</div>
  <?php endif; ?>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <a href="<?= BASE_URL ?>/atividades/cruzadinha3d/editor.php?id=<?= $id ?>" class="btn btn-primary">✏️ <?= $czPalavras ? 'Editar palavras e dicas' : 'Cadastrar palavras e dicas' ?></a>
    <?php if ($czPalavras): ?>
      <a href="<?= BASE_URL ?>/atividades/cruzadinha3d/index.php?id=<?= $id ?>&teste=1" class="btn btn-outline" target="_blank">▶️ Testar o jogo</a>
      <a href="<?= BASE_URL ?>/atividades/cruzadinha3d/relatorio.php?id=<?= $id ?>" class="btn btn-outline">📊 Relatório por aluno</a>
    <?php endif; ?>
  </div>
  <div style="font-size:12px;color:#888;font-weight:600;margin-top:10px;">💡 Tentativas ilimitadas, dicas sem desconto e só a melhor pontuação vale XP — a mesma filosofia das outras missões.</div>
</div>

<?php // ── GRUPO ──
elseif ($atv['tipo'] === 'grupo'):
    $al = $pdo->prepare(
        "SELECT u.id, u.nome FROM usuarios u
         JOIN aluno_turma at2 ON at2.usuario_id = u.id AND at2.turma_id = ? AND at2.ativo = 1
         WHERE u.perfil = 'aluno' AND u.ativo = 1 ORDER BY u.nome"
    );
    $al->execute([(int)$atv['turma_id']]);
    $alunos = $al->fetchAll();
    $gm = $pdo->prepare('SELECT aluno_id, lider FROM grupo_membros WHERE atividade_id = ?');
    $gm->execute([$id]);
    $membros = $gm->fetchAll(PDO::FETCH_KEY_PAIR);
?>
<div class="card">
  <div class="card-title">🤝 Integrantes do grupo</div>
  <form method="POST">
    <?= csrf_input() ?>
    <input type="hidden" name="acao" value="salvar_grupo">
    <table>
      <tr><th>Participa</th><th>Aluno</th><th>Líder</th></tr>
      <?php foreach ($alunos as $a): ?>
      <tr>
        <td><input type="checkbox" name="membros[]" value="<?= (int)$a['id'] ?>" <?= array_key_exists($a['id'], $membros) ? 'checked' : '' ?> style="width:auto;"></td>
        <td><?= e($a['nome']) ?></td>
        <td><input type="radio" name="lider" value="<?= (int)$a['id'] ?>" <?= !empty($membros[$a['id']]) ? 'checked' : '' ?> style="width:auto;"></td>
      </tr>
      <?php endforeach; ?>
    </table>
    <button type="submit" class="btn btn-primary" style="margin-top:12px;">Salvar grupo</button>
  </form>
</div>
<?php endif; ?>
<?php endif; ?>
<?php pagina_fim(); ?>
