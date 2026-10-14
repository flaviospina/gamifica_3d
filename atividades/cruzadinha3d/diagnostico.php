<?php
// ============================================================
//  atividades/cruzadinha3d/diagnostico.php — Verifica a instalação
//  (admin, coordenador ou professor). Não altera nada.
// ============================================================
require_once __DIR__ . '/lib.php';
cruz_bootstrap();
cruz_requer(['admin', 'coordenador', 'professor']);
$pdo = db();
$itens = [];
$ok = fn($b) => $b ? '✅' : '❌';
// Tabelas
foreach (['cruzadinha_config', 'cruzadinha_progresso', 'cruzadinha_tentativas', 'cruzadinha_avatar', 'tentativas', 'aluno_xp', 'atividades'] as $t) {
    try { $pdo->query("SELECT 1 FROM `$t` LIMIT 1"); $itens[] = [$ok(true), "Tabela $t"]; }
    catch (PDOException $e) { $itens[] = [$ok(false), "Tabela $t — falta importar sql/cruzadinha3d.sql"]; }
}
// ENUM
try {
    $col = $pdo->query("SHOW COLUMNS FROM atividades LIKE 'tipo'")->fetch();
    $tem = str_contains((string)($col['Type'] ?? ''), 'cruzadinha3d');
    $itens[] = [$ok($tem), "atividades.tipo aceita 'cruzadinha3d'" . ($tem ? '' : ' — rode o ALTER TABLE do sql/cruzadinha3d.sql')];
} catch (PDOException $e) { $itens[] = ['❌', 'Não foi possível ler atividades.tipo']; }
// Motor
$motor = cruz_motor();
$itens[] = ['ℹ️', 'Motor de XP detectado: ' . ($motor === 'v2' ? 'V2 (gamifica_registrar_resultado em includes/functions.php)' : 'V1 (trigger tg_atualiza_xp_apos_tentativa)')];
if ($motor === 'v1') {
    try {
        $n = $pdo->query("SHOW TRIGGERS LIKE 'tentativas'")->fetchAll();
        $temTrig = (bool)array_filter($n, fn($r) => ($r['Trigger'] ?? '') === 'tg_atualiza_xp_apos_tentativa');
        $itens[] = [$temTrig ? '✅' : '⚠️', $temTrig ? 'Trigger tg_atualiza_xp_apos_tentativa presente' : 'Trigger não encontrado: o jogo mantém aluno_xp por conta própria (melhor resultado), mas o perfil pode não recalcular'];
    } catch (PDOException $e) { $itens[] = ['⚠️', 'Sem permissão para listar triggers (normal em alguns planos)']; }
}
$itens[] = [function_exists('requer_perfil') ? '✅' : '⚠️', 'Helpers de sessão do Gamifica (' . (function_exists('requer_perfil') ? 'encontrados' : 'usando fallback interno') . ')'];
$itens[] = [function_exists('pagina_inicio') ? '✅' : '⚠️', 'Layout do painel (' . (function_exists('pagina_inicio') ? 'pagina_inicio encontrado' : 'páginas do professor usam layout simples') . ')'];
$itens[] = [version_compare(PHP_VERSION, '8.1.0', '>=') ? '✅' : '❌', 'PHP ' . PHP_VERSION . ' (mínimo 8.1)'];
?>
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Diagnóstico — Ilha das Palavras</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:30px auto;padding:0 16px;color:#161F38}li{padding:8px 0;border-bottom:1px solid #eee;list-style:none}ul{padding:0}h1{font-size:22px}</style></head><body>
<h1>🏝️ Ilha das Palavras — diagnóstico da instalação</h1>
<ul><?php foreach ($itens as [$s, $t]): ?><li><?= $s ?> <?= htmlspecialchars($t) ?></li><?php endforeach; ?></ul>
<p style="font-size:13px;color:#666;">Base: <?= htmlspecialchars(cruz_base_url()) ?> · Pasta do jogo: <?= htmlspecialchars(dirname($_SERVER['SCRIPT_NAME'])) ?></p>
</body></html>
