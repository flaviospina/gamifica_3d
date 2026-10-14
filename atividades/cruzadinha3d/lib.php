<?php
// ============================================================
//  atividades/cruzadinha3d/lib.php — Funções da cruzadinha 3D
//  Camada de compatibilidade com o Gamifica V1 (triggers) e V2
//  (motor em includes/functions.php). Regra de pontuação espelhada
//  de js/pontuacao.js. Nunca subtrai XP.
// ============================================================

/** Caminho da raiz do Gamifica (duas pastas acima). */
function cruz_raiz(): string { return dirname(__DIR__, 2); }

/** Carrega o bootstrap do Gamifica (sessão, banco, helpers). */
function cruz_bootstrap(): void {
    require_once cruz_raiz() . '/includes/bootstrap.php';
}

// ── Compatibilidade de helpers (caso a instalação não os tenha) ──
function cruz_usuario_id(): int { return function_exists('usuario_id') ? usuario_id() : (int)($_SESSION['usuario_id'] ?? 0); }
function cruz_perfil(): string { return function_exists('usuario_perfil') ? usuario_perfil() : (string)($_SESSION['perfil'] ?? ''); }
function cruz_nome(): string { return function_exists('usuario_nome') ? usuario_nome() : (string)($_SESSION['nome'] ?? ''); }
function cruz_csrf_token(): string {
    if (function_exists('csrf_token')) return csrf_token();
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}
function cruz_csrf_valido(string $token): bool {
    if (function_exists('csrf_valido')) return csrf_valido($token);
    return hash_equals($_SESSION['csrf_token'] ?? '', $token);
}
function cruz_base_url(): string {
    if (defined('BASE_URL')) return BASE_URL;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $pasta = rtrim(str_replace('\\', '/', dirname(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/')))), '/');
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $pasta;
}
/** Exige um dos perfis; redireciona para o login se não estiver logado. */
function cruz_requer(array $perfis): void {
    if (function_exists('requer_perfil')) { requer_perfil($perfis); return; }
    if (empty($_SESSION['usuario_id']) || !in_array($_SESSION['perfil'] ?? '', $perfis, true)) {
        header('Location: ' . cruz_base_url() . '/login.php?msg=acesso_negado');
        exit;
    }
}
/** Primeiro nome (única informação pessoal que chega ao jogo). */
function cruz_primeiro_nome(string $nome): string {
    $nome = trim($nome);
    $partes = preg_split('/\s+/', $nome);
    return $partes[0] !== '' ? mb_convert_case($partes[0], MB_CASE_TITLE, 'UTF-8') : 'Explorador(a)';
}

// ── Normalização (igual ao JS) ───────────────────────────────
function cruz_normalizar(string $texto): string {
    $mapa = ['Á'=>'A','À'=>'A','Â'=>'A','Ã'=>'A','Ä'=>'A','É'=>'E','Ê'=>'E','È'=>'E','Ë'=>'E','Í'=>'I','Î'=>'I','Ì'=>'I','Ï'=>'I',
             'Ó'=>'O','Ô'=>'O','Õ'=>'O','Ò'=>'O','Ö'=>'O','Ú'=>'U','Û'=>'U','Ù'=>'U','Ü'=>'U','Ç'=>'C','Ñ'=>'N'];
    $t = strtr(mb_strtoupper(trim($texto), 'UTF-8'), $mapa);
    return preg_replace('/[^A-Z]/', '', $t);
}

/** Letras exibidas (com acento), uma por casa. */
function cruz_letras(string $resposta): array {
    preg_match_all('/\p{L}/u', mb_strtoupper($resposta, 'UTF-8'), $m);
    return $m[0];
}

// ── Validação do JSON de palavras ─────────────────────────────
/**
 * Valida e limpa a lista de palavras. Retorna ['ok'=>bool, 'palavras'=>[], 'erros'=>[]].
 * Regras: 2..30 palavras, respostas com 2..15 letras, posições inteiras >= 0,
 * direção h|v, cruzamentos com a mesma letra, grade até 20x20.
 */
function cruz_validar_palavras($lista): array {
    $erros = []; $saida = []; $celulas = [];
    if (!is_array($lista) || count($lista) < 2) return ['ok' => false, 'palavras' => [], 'erros' => ['Informe pelo menos 2 palavras.']];
    if (count($lista) > 30) return ['ok' => false, 'palavras' => [], 'erros' => ['Máximo de 30 palavras por cruzadinha.']];
    foreach ($lista as $i => $p) {
        $n = $i + 1;
        $dica = trim((string)($p['dica'] ?? ''));
        $resp = trim((string)($p['resposta'] ?? ''));
        $letras = cruz_letras($resp);
        $dir = ($p['direcao'] ?? 'h') === 'v' ? 'v' : 'h';
        $l = (int)($p['linha'] ?? -1); $c = (int)($p['coluna'] ?? -1);
        if ($dica === '') $erros[] = "Palavra $n: dica vazia.";
        if (count($letras) < 2 || count($letras) > 15) $erros[] = "Palavra $n: a resposta precisa ter de 2 a 15 letras.";
        if ($l < 0 || $c < 0 || $l > 19 || $c > 19) $erros[] = "Palavra $n: posição inválida.";
        foreach ($letras as $k => $letra) {
            $ll = $l + ($dir === 'v' ? $k : 0); $cc = $c + ($dir === 'h' ? $k : 0);
            if ($ll > 19 || $cc > 19) { $erros[] = "Palavra $n: sai da grade (máximo 20x20)."; break; }
            $ch = "$ll,$cc";
            if (isset($celulas[$ch]) && cruz_normalizar($celulas[$ch]) !== cruz_normalizar($letra)) $erros[] = "Palavra $n: cruzamento com letra diferente em linha $ll, coluna $cc.";
            $celulas[$ch] = $letra;
        }
        $saida[] = ['dica' => mb_substr($dica, 0, 300), 'resposta' => mb_substr($resp, 0, 40), 'linha' => $l, 'coluna' => $c, 'direcao' => $dir];
    }
    return ['ok' => !$erros, 'palavras' => $saida, 'erros' => array_values(array_unique($erros))];
}

// ── Pontuação (regra "A", igual a js/pontuacao.js) ───────────
const CRUZ_PESO_ESTRELA = 0.25;
const CRUZ_PESO_TEMPO   = 0.10;

function cruz_pontuacao(int $total, int $resolvidas, int $estrelas, int $xp, bool $desafio, int $tempoSeg, int $tempoAlvo): array {
    if ($total <= 0) return ['base' => 0, 'estrelas' => 0, 'tempo' => 0, 'total' => 0];
    $resolvidas = max(0, min($total, $resolvidas));
    $estrelas   = max(0, min($resolvidas, $estrelas));
    $base   = (int)round($xp * $resolvidas / $total);
    $bonusE = (int)round($xp * CRUZ_PESO_ESTRELA * $estrelas / $total);
    $bonusT = ($desafio && $resolvidas === $total && $tempoAlvo > 0 && $tempoSeg <= $tempoAlvo) ? (int)round($xp * CRUZ_PESO_TEMPO) : 0;
    return ['base' => $base, 'estrelas' => $bonusE, 'tempo' => $bonusT, 'total' => $base + $bonusE + $bonusT];
}

/**
 * Recalcula o resultado a partir do estado enviado pelo cliente, usando
 * o gabarito do servidor. Ignora qualquer número de pontos vindo do cliente.
 * Retorna ['resolvidas'=>int, 'estrelas'=>int, 'dicas'=>int, 'indices'=>[...]].
 */
function cruz_avaliar(array $palavras, array $estado): array {
    $total = count($palavras);
    $resolvidas = []; $dicasPorPalavra = []; $totalDicas = 0;
    foreach (($estado['dicas'] ?? []) as $i => $posicoes) {
        $i = (int)$i;
        if ($i < 0 || $i >= $total || !is_array($posicoes)) continue;
        $n = count(array_unique(array_map('intval', $posicoes)));
        $n = min($n, count(cruz_letras($palavras[$i]['resposta'])));
        $dicasPorPalavra[$i] = $n; $totalDicas += $n;
    }
    foreach (($estado['resolvidas'] ?? []) as $i) {
        $i = (int)$i;
        if ($i >= 0 && $i < $total) $resolvidas[$i] = true;
    }
    $estrelas = 0;
    foreach (array_keys($resolvidas) as $i) if (empty($dicasPorPalavra[$i])) $estrelas++;
    return ['resolvidas' => count($resolvidas), 'estrelas' => $estrelas, 'dicas' => $totalDicas, 'indices' => array_keys($resolvidas)];
}

// ── Motor de XP: V2 (função PHP) ou V1 (trigger no UPDATE) ───
/** Qual motor está instalado. */
function cruz_motor(): string {
    return function_exists('gamifica_registrar_resultado') ? 'v2' : 'v1';
}

/**
 * Grava a tentativa e aciona o fluxo de XP existente.
 * Retorna ['tentativa_id'=>int, 'delta'=>int, 'melhor'=>int].
 */
function cruz_registrar_tentativa(PDO $pdo, int $alunoId, array $atv, int $totalPalavras, int $resolvidas, int $xp): array {
    $pct = $totalPalavras ? round(100 * $resolvidas / $totalPalavras, 2) : 0;
    $n = $pdo->prepare('SELECT COUNT(*) FROM tentativas WHERE aluno_id = ? AND atividade_id = ? AND concluida = 1');
    $n->execute([$alunoId, (int)$atv['id']]);
    $numero = min(255, (int)$n->fetchColumn() + 1);

    $antes = $pdo->prepare('SELECT xp_melhor FROM aluno_xp WHERE aluno_id = ? AND atividade_id = ?');
    $antes->execute([$alunoId, (int)$atv['id']]);
    $melhorAntes = (int)($antes->fetchColumn() ?: 0);

    if (cruz_motor() === 'v2') {
        $pdo->prepare(
            'INSERT INTO tentativas (aluno_id, atividade_id, numero, acertos, total_questoes, percentual, xp_ganho, concluida, finalizada_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())'
        )->execute([$alunoId, (int)$atv['id'], $numero, $resolvidas, $totalPalavras, $pct, $xp]);
        $tentativaId = (int)$pdo->lastInsertId();
        $delta = (int)gamifica_registrar_resultado($alunoId, (int)$atv['id'], $xp, 'missao', (string)$atv['titulo']);
    } else {
        // V1: o trigger tg_atualiza_xp_apos_tentativa dispara em AFTER UPDATE quando concluida = 1
        $pdo->prepare(
            'INSERT INTO tentativas (aluno_id, atividade_id, numero, acertos, total_questoes, percentual, xp_ganho, concluida)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
        )->execute([$alunoId, (int)$atv['id'], $numero, $resolvidas, $totalPalavras, $pct, $xp]);
        $tentativaId = (int)$pdo->lastInsertId();
        $pdo->prepare('UPDATE tentativas SET concluida = 1, finalizada_em = NOW() WHERE id = ?')->execute([$tentativaId]);
        // Garantia caso a instalação não tenha o trigger: mantém só o melhor
        $pdo->prepare(
            'INSERT INTO aluno_xp (aluno_id, atividade_id, xp_melhor) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE xp_melhor = GREATEST(xp_melhor, VALUES(xp_melhor))'
        )->execute([$alunoId, (int)$atv['id'], $xp]);
        $delta = max(0, $xp - $melhorAntes);
    }
    return ['tentativa_id' => $tentativaId, 'delta' => $delta, 'melhor' => max($melhorAntes, $xp)];
}

// ── Carregamento da atividade para o jogo ─────────────────────
/** Monta o objeto "cruzadinha" que o JS espera, a partir de atividades + cruzadinha_config. */
function cruz_montar_json(array $atv, array $cfg): array {
    $palavras = json_decode($cfg['dados'] ?? '[]', true) ?: [];
    return [
        'id'           => (int)$atv['id'],
        'titulo'       => (string)$atv['titulo'],
        'disciplina'   => (string)$atv['disciplina'],
        'ano'          => (string)($cfg['ano_serie'] ?? ''),
        'tema'         => (string)($cfg['tema'] ?? 'ciencias'),
        'xp'           => (int)$atv['xp_recompensa'],
        'desafioTempo' => ['ativo' => (bool)($cfg['desafio_tempo'] ?? 0), 'segundos' => (int)($cfg['tempo_alvo_seg'] ?? 600)],
        'palavras'     => $palavras,
    ];
}

/** Resposta JSON padrão. */
function cruz_json(array $dados, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Lê o corpo da requisição (JSON ou formulário). */
function cruz_entrada(): array {
    $bruto = file_get_contents('php://input');
    $json = json_decode($bruto, true);
    if (is_array($json)) return $json;
    return $_POST;
}
