<?php
// ============================================================
//  atividades/cruzadinha3d/api.php — Endpoint do jogo (JSON)
//
//  POST (JSON ou formulário), sempre com csrf:
//   acao=progresso  { atividade_id, estado, tempoSeg, modo }      → salva progresso parcial
//   acao=resultado  { atividade_id, estado, tempoSeg, modo, parcial } → recalcula, grava tentativa e aciona o XP
//   acao=avatar     { roupa, cabelo, pele, acessorio }           → salva o visual do explorador
//
//  O servidor NUNCA confia em pontos vindos do cliente: recalcula tudo a
//  partir do gabarito em cruzadinha_config. Só o melhor resultado conta.
// ============================================================
require_once __DIR__ . '/lib.php';
cruz_bootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') cruz_json(['ok' => false, 'erro' => 'Método não permitido'], 405);
if (!cruz_usuario_id()) cruz_json(['ok' => false, 'erro' => 'Sessão expirada. Entre de novo no Gamifica.'], 401);

$in = cruz_entrada();
if (!cruz_csrf_valido((string)($in['csrf'] ?? ''))) cruz_json(['ok' => false, 'erro' => 'Token de segurança inválido. Recarregue a página.'], 403);

$pdo   = db();
$uid   = cruz_usuario_id();
$acao  = (string)($in['acao'] ?? '');
$perfil = cruz_perfil();

// ── Avatar (qualquer perfil logado) ──────────────────────────
if ($acao === 'avatar') {
    $cor = fn($v, $padrao) => preg_match('/^#[0-9A-Fa-f]{6}$/', (string)$v) ? strtoupper((string)$v) : $padrao;
    $acess = in_array($in['acessorio'] ?? '', ['nenhum', 'chapeu', 'oculos', 'mochila'], true) ? $in['acessorio'] : 'nenhum';
    try {
        $pdo->prepare(
            'INSERT INTO cruzadinha_avatar (aluno_id, roupa, cabelo, pele, acessorio) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE roupa = VALUES(roupa), cabelo = VALUES(cabelo), pele = VALUES(pele), acessorio = VALUES(acessorio)'
        )->execute([$uid, $cor($in['roupa'] ?? '', '#E0A537'), $cor($in['cabelo'] ?? '', '#2B1A0E'), $cor($in['pele'] ?? '', '#E8B894'), $acess]);
    } catch (PDOException $e) { error_log('[Cruzadinha][avatar] ' . $e->getMessage()); cruz_json(['ok' => false, 'erro' => 'Não foi possível salvar o visual.'], 500); }
    cruz_json(['ok' => true]);
}

// ── Demais ações: só aluno, em atividade publicada da sua turma ──
if ($perfil !== 'aluno') cruz_json(['ok' => true, 'ignorado' => true, 'motivo' => 'Modo de teste do professor: nada é gravado.']);

$atvId = (int)($in['atividade_id'] ?? 0);
$st = $pdo->prepare(
    'SELECT a.* FROM atividades a
     JOIN aluno_turma at2 ON at2.turma_id = a.turma_id AND at2.usuario_id = ? AND at2.ativo = 1
     WHERE a.id = ? AND a.publicada = 1 AND a.tipo = "cruzadinha3d"'
);
$st->execute([$uid, $atvId]);
$atv = $st->fetch();
if (!$atv) cruz_json(['ok' => false, 'erro' => 'Atividade não disponível.'], 404);

$cf = $pdo->prepare('SELECT * FROM cruzadinha_config WHERE atividade_id = ?');
$cf->execute([$atvId]);
$cfg = $cf->fetch();
if (!$cfg) cruz_json(['ok' => false, 'erro' => 'Cruzadinha sem conteúdo.'], 404);

$palavras = json_decode($cfg['dados'], true) ?: [];
$total    = count($palavras);
$estado   = is_array($in['estado'] ?? null) ? $in['estado'] : [];
$tempoSeg = max(0, min(86400, (int)($in['tempoSeg'] ?? 0)));
$modo     = ($in['modo'] ?? '3d') === '2d' ? '2d' : '3d';

// Limpa o estado antes de guardar (só chaves conhecidas, tamanhos limitados)
$estadoLimpo = [
    'resolvidas' => array_values(array_unique(array_map('intval', array_slice((array)($estado['resolvidas'] ?? []), 0, 64)))),
    'dicas'      => [],
    'reveladas'  => array_values(array_filter(array_map('strval', array_slice((array)($estado['reveladas'] ?? []), 0, 500)), fn($s) => preg_match('/^\d{1,2},\d{1,2}$/', $s))),
    'tentativas' => max(0, min(9999, (int)($estado['tentativas'] ?? 0))),
];
foreach ((array)($estado['dicas'] ?? []) as $i => $pos) {
    if (is_array($pos) && (int)$i >= 0 && (int)$i < $total) $estadoLimpo['dicas'][(int)$i] = array_values(array_unique(array_map('intval', array_slice($pos, 0, 20))));
}
$estadoLimpo['resolvidas'] = array_values(array_filter($estadoLimpo['resolvidas'], fn($i) => $i >= 0 && $i < $total));

// ── Progresso parcial ────────────────────────────────────────
function cruz_salvar_progresso(PDO $pdo, int $uid, int $atvId, array $estadoLimpo, int $tempoSeg, string $modo): void {
    $pdo->prepare(
        'INSERT INTO cruzadinha_progresso (aluno_id, atividade_id, dados, tempo_seg, modo) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE dados = VALUES(dados), tempo_seg = VALUES(tempo_seg), modo = VALUES(modo)'
    )->execute([$uid, $atvId, json_encode($estadoLimpo, JSON_UNESCAPED_UNICODE), $tempoSeg, $modo]);
}

if ($acao === 'progresso') {
    try { cruz_salvar_progresso($pdo, $uid, $atvId, $estadoLimpo, $tempoSeg, $modo); }
    catch (PDOException $e) { error_log('[Cruzadinha][progresso] ' . $e->getMessage()); cruz_json(['ok' => false, 'erro' => 'Não foi possível salvar o progresso.'], 500); }
    cruz_json(['ok' => true]);
}

// ── Resultado (fim da cruzadinha ou saída no meio) ───────────
if ($acao === 'resultado') {
    $encerrada = ($atv['data_fim'] && strtotime($atv['data_fim']) < time()) || ($atv['data_inicio'] && strtotime($atv['data_inicio']) > time());
    $parcial = !empty($in['parcial']);
    $aval = cruz_avaliar($palavras, $estadoLimpo);
    $pts  = cruz_pontuacao($total, $aval['resolvidas'], $aval['estrelas'], (int)$atv['xp_recompensa'], (bool)$cfg['desafio_tempo'], $tempoSeg, (int)$cfg['tempo_alvo_seg']);

    try {
        $pdo->beginTransaction();
        cruz_salvar_progresso($pdo, $uid, $atvId, $estadoLimpo, $tempoSeg, $modo);

        $mx = $pdo->prepare('SELECT xp_melhor FROM aluno_xp WHERE aluno_id = ? AND atividade_id = ?');
        $mx->execute([$uid, $atvId]);
        $melhorAntes = (int)($mx->fetchColumn() ?: 0);

        $gravar = !$encerrada && $aval['resolvidas'] > 0 && (!$parcial || $pts['total'] > $melhorAntes);
        $delta = 0; $melhor = $melhorAntes; $tentativaId = null;
        if ($gravar) {
            $r = cruz_registrar_tentativa($pdo, $uid, $atv, $total, $aval['resolvidas'], $pts['total']);
            $delta = $r['delta']; $melhor = $r['melhor']; $tentativaId = $r['tentativa_id'];
            $pdo->prepare(
                'INSERT INTO cruzadinha_tentativas (tentativa_id, aluno_id, atividade_id, palavras_resolvidas, total_palavras, estrelas, dicas_usadas,
                    tempo_seg, modo, parcial, pontos_base, pontos_estrelas, pontos_tempo, pontos_total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([$tentativaId, $uid, $atvId, $aval['resolvidas'], $total, $aval['estrelas'], $aval['dicas'],
                        $tempoSeg, $modo, $parcial ? 1 : 0, $pts['base'], $pts['estrelas'], $pts['tempo'], $pts['total']]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('[Cruzadinha][resultado] ' . $e->getMessage());
        cruz_json(['ok' => false, 'erro' => 'Não foi possível registrar o resultado. Seu progresso continua salvo.'], 500);
    }
    cruz_json([
        'ok' => true, 'gravado' => $gravar, 'encerrada' => $encerrada,
        'pontuacao' => $pts, 'resolvidas' => $aval['resolvidas'], 'estrelas' => $aval['estrelas'], 'dicas' => $aval['dicas'],
        'delta' => $delta, 'melhor' => $melhor, 'motor' => cruz_motor(),
    ]);
}

cruz_json(['ok' => false, 'erro' => 'Ação desconhecida'], 400);
