<?php
// ============================================================
//  atividades/cruzadinha3d/relatorio.php — Relatório por aluno
//  Mostra: palavras resolvidas, tentativas, dicas usadas, melhor pontuação,
//  estrelas e modo. Sem ranking de "piores" e sem listas de erros.
// ============================================================
require_once __DIR__ . '/lib.php';
cruz_bootstrap();
cruz_requer(['professor', 'admin', 'coordenador']);

$pdo = db();
$uid = cruz_usuario_id();
$id  = (int)($_GET['id'] ?? 0);

$st = $pdo->prepare('SELECT a.*, t.nome AS turma_nome FROM atividades a JOIN turmas t ON t.id = a.turma_id WHERE a.id = ? AND (a.professor_id = ? OR ? IN ("admin","coordenador"))');
$st->execute([$id, $uid, cruz_perfil()]);
$atv = $st->fetch();
if (!$atv || $atv['tipo'] !== 'cruzadinha3d') { header('Location: ' . cruz_base_url() . '/professor/atividades.php'); exit; }

$cf = $pdo->prepare('SELECT dados FROM cruzadinha_config WHERE atividade_id = ?');
$cf->execute([$id]);
$total = count(json_decode($cf->fetchColumn() ?: '[]', true) ?: []);

// Um aluno por linha, em ordem alfabética (nunca por desempenho)
$rows = $pdo->prepare(
    'SELECT u.id, u.nome,
            COALESCE(ax.xp_melhor, 0) AS melhor_xp,
            (SELECT COUNT(*) FROM tentativas t WHERE t.atividade_id = a.id AND t.aluno_id = u.id AND t.concluida = 1) AS tentativas,
            (SELECT MAX(ct.palavras_resolvidas) FROM cruzadinha_tentativas ct WHERE ct.atividade_id = a.id AND ct.aluno_id = u.id) AS palavras_tent,
            (SELECT MAX(ct.estrelas) FROM cruzadinha_tentativas ct WHERE ct.atividade_id = a.id AND ct.aluno_id = u.id) AS estrelas,
            (SELECT SUM(ct.dicas_usadas) FROM cruzadinha_tentativas ct WHERE ct.atividade_id = a.id AND ct.aluno_id = u.id) AS dicas_total,
            (SELECT ct.modo FROM cruzadinha_tentativas ct WHERE ct.atividade_id = a.id AND ct.aluno_id = u.id ORDER BY ct.id DESC LIMIT 1) AS modo,
            cp.dados AS progresso, cp.atualizado_em AS progresso_em
     FROM atividades a
     JOIN aluno_turma at2 ON at2.turma_id = a.turma_id AND at2.ativo = 1
     JOIN usuarios u ON u.id = at2.usuario_id AND u.perfil = "aluno" AND u.ativo = 1
     LEFT JOIN aluno_xp ax ON ax.atividade_id = a.id AND ax.aluno_id = u.id
     LEFT JOIN cruzadinha_progresso cp ON cp.atividade_id = a.id AND cp.aluno_id = u.id
     WHERE a.id = ?
     ORDER BY u.nome'
);
$rows->execute([$id]);
$alunos = $rows->fetchAll();

// CSV
if (isset($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="cruzadinha_' . $id . '.csv"');
    $out = fopen('php://output', 'w');
    fputs($out, "\xEF\xBB\xBF");
    fputcsv($out, ['Aluno', 'Palavras resolvidas', 'Total de palavras', 'Tentativas', 'Dicas usadas', 'Estrelas', 'Melhor pontuação (XP)', 'Modo'], ';', '"', '\\');
    foreach ($alunos as $r) {
        $prog = json_decode($r['progresso'] ?? '', true);
        $resolvidas = max((int)($r['palavras_tent'] ?? 0), count($prog['resolvidas'] ?? []));
        fputcsv($out, [$r['nome'], $resolvidas, $total, (int)$r['tentativas'], (int)($r['dicas_total'] ?? 0), (int)($r['estrelas'] ?? 0), (int)$r['melhor_xp'], $r['modo'] ?? '—'], ';', '"', '\\');
    }
    fclose($out); exit;
}

$base = cruz_base_url();
$temLayout = function_exists('pagina_inicio');
if ($temLayout) pagina_inicio('Relatório: ' . $atv['titulo'], 'relatorios');
else { echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Relatório</title><style>body{font-family:system-ui,sans-serif;max-width:960px;margin:20px auto;padding:0 16px;color:#161F38}.card{background:#fff;border:1px solid #ddd;border-radius:14px;padding:16px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #eee;text-align:left}.btn{display:inline-block;padding:8px 14px;border-radius:10px;background:#161F38;color:#fff;text-decoration:none;font-weight:700}</style></head><body>'; }
$concluiram = count(array_filter($alunos, fn($r) => $total && (int)($r['palavras_tent'] ?? 0) >= $total));
?>
<div class="card">
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">
    <div>
      <div style="font-weight:800;font-size:18px;">📊 <?= htmlspecialchars($atv['titulo']) ?></div>
      <div style="font-size:12px;color:#666;">Turma <?= htmlspecialchars($atv['turma_nome']) ?> · <?= $total ?> palavras · ⭐ <?= (int)$atv['xp_recompensa'] ?> XP · <?= count($alunos) ?> alunos · <?= $concluiram ?> completaram</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a class="btn btn-outline botao secundario" href="?id=<?= $id ?>&csv=1">📥 CSV</a>
      <a class="btn btn-outline botao secundario" href="editor.php?id=<?= $id ?>">✏️ Editar cruzadinha</a>
      <a class="btn btn-outline botao secundario" href="<?= $base ?>/professor/atividades.php">← Atividades</a>
    </div>
  </div>
</div>
<div class="card" style="overflow-x:auto;">
  <table>
    <tr><th>Aluno</th><th>Palavras</th><th>Tentativas</th><th>Dicas</th><th>Estrelas</th><th title="Pode passar do XP base por causa dos bônus de autonomia e tempo">Melhor pontuação</th><th>Modo</th><th>Situação</th></tr>
    <?php foreach ($alunos as $r):
      $prog = json_decode($r['progresso'] ?? '', true);
      $emAndamento = count($prog['resolvidas'] ?? []);
      $resolvidas = max((int)($r['palavras_tent'] ?? 0), $emAndamento);
      $pct = $total ? round(100 * $resolvidas / $total) : 0;
      $situacao = $total && $resolvidas >= $total ? '✅ Completou' : ($resolvidas > 0 ? '🧭 Em andamento' : '⏳ Não iniciou');
    ?>
    <tr>
      <td style="font-weight:700;"><?= htmlspecialchars($r['nome']) ?></td>
      <td><?= $resolvidas ?>/<?= $total ?> <span style="font-size:11px;color:#666;">(<?= $pct ?>%)</span></td>
      <td><?= (int)$r['tentativas'] ?></td>
      <td><?= (int)($r['dicas_total'] ?? 0) ?></td>
      <td>⭐ <?= (int)($r['estrelas'] ?? 0) ?></td>
      <td style="font-weight:800;color:#286456;"><?= (int)$r['melhor_xp'] ?> XP</td>
      <td><?= $r['modo'] === '2d' ? '🗺️ Mapa 2D' : ($r['modo'] === '3d' ? '🏝️ 3D' : '—') ?></td>
      <td><?= $situacao ?></td>
    </tr>
    <?php endforeach; ?>
    <?php if (!$alunos): ?><tr><td colspan="8" style="color:#888;">Nenhum aluno nesta turma.</td></tr><?php endif; ?>
  </table>
  <div style="font-size:12px;color:#666;margin-top:8px;">Tentativas ilimitadas: cada envio conta como tentativa; só a melhor pontuação vale XP. Dicas não descontam pontos.</div>
</div>
<?php if ($temLayout) pagina_fim(); else echo '</body></html>'; ?>
