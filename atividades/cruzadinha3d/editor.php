<?php
// ============================================================
//  atividades/cruzadinha3d/editor.php — Cadastro/edição da cruzadinha
//  (professor dono da atividade, coordenador ou admin)
//  · Palavras + dicas, uma por linha: "RESPOSTA | dica"
//  · Botão "Gerar layout" monta a grade no navegador (js/gerador.js)
//  · Salva em cruzadinha_config (JSON validado no servidor)
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
if (!$atv || $atv['tipo'] !== 'cruzadinha3d') {
    if (function_exists('flash_set')) flash_set('Atividade não encontrada ou não é uma cruzadinha 3D.', 'erro');
    header('Location: ' . cruz_base_url() . '/professor/atividades.php'); exit;
}

$cf = $pdo->prepare('SELECT * FROM cruzadinha_config WHERE atividade_id = ?');
$cf->execute([$id]);
$cfg = $cf->fetch() ?: ['tema' => 'ciencias', 'ano_serie' => '', 'desafio_tempo' => 0, 'tempo_alvo_seg' => 600, 'dados' => '[]'];
$erros = []; $ok = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && cruz_csrf_valido($_POST['csrf_token'] ?? '')) {
    $tema = in_array($_POST['tema'] ?? '', ['ciencias', 'geografia', 'portugues', 'matematica'], true) ? $_POST['tema'] : 'ciencias';
    $ano  = mb_substr(trim($_POST['ano_serie'] ?? ''), 0, 20);
    $desafio = !empty($_POST['desafio_tempo']) ? 1 : 0;
    $tempo = max(60, min(3600, (int)($_POST['tempo_alvo_seg'] ?? 600)));
    $lista = json_decode($_POST['layout_json'] ?? '[]', true);
    $val = cruz_validar_palavras($lista);
    if (!$val['ok']) {
        $erros = $val['erros'] ?: ['Gere o layout antes de salvar.'];
    } else {
        try {
            $pdo->prepare(
                'INSERT INTO cruzadinha_config (atividade_id, tema, ano_serie, desafio_tempo, tempo_alvo_seg, dados) VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE tema = VALUES(tema), ano_serie = VALUES(ano_serie), desafio_tempo = VALUES(desafio_tempo),
                                         tempo_alvo_seg = VALUES(tempo_alvo_seg), dados = VALUES(dados)'
            )->execute([$id, $tema, $ano, $desafio, $tempo, json_encode($val['palavras'], JSON_UNESCAPED_UNICODE)]);
            $cfg = ['tema' => $tema, 'ano_serie' => $ano, 'desafio_tempo' => $desafio, 'tempo_alvo_seg' => $tempo, 'dados' => json_encode($val['palavras'], JSON_UNESCAPED_UNICODE)];
            $ok = 'Cruzadinha salva com ' . count($val['palavras']) . ' palavras! ' . ($atv['publicada'] ? 'Os alunos já podem jogar.' : 'Publique a atividade em "Minhas Atividades" quando estiver pronta.');
        } catch (PDOException $e) {
            error_log('[Cruzadinha][editor] ' . $e->getMessage());
            $erros[] = 'Não foi possível salvar. Confira se o script SQL da cruzadinha foi importado (sql/cruzadinha3d.sql).';
        }
    }
}

$palavras = json_decode($cfg['dados'] ?? '[]', true) ?: [];
$linhasTexto = implode("\n", array_map(fn($p) => $p['resposta'] . ' | ' . $p['dica'], $palavras));
$base = cruz_base_url();
$temLayout = function_exists('pagina_inicio');
if ($temLayout) pagina_inicio('Cruzadinha 3D: ' . $atv['titulo'], 'atividades');
else { echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cruzadinha 3D — ' . htmlspecialchars($atv['titulo']) . '</title><style>body{font-family:system-ui,sans-serif;max-width:960px;margin:20px auto;padding:0 16px;color:#161F38}.card{background:#fff;border:1px solid #ddd;border-radius:14px;padding:16px;margin-bottom:16px}.btn{display:inline-block;padding:10px 16px;border-radius:10px;border:0;background:#161F38;color:#fff;font-weight:700;cursor:pointer;text-decoration:none}.btn-outline{background:#fff;color:#161F38;border:2px solid #161F38}input,select,textarea{width:100%;padding:8px;border:1px solid #bbb;border-radius:8px;font:inherit}label{display:block;font-weight:700;margin:8px 0 4px}</style></head><body>'; }
?>
<style>
.cz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .cz-grid { grid-template-columns: 1fr; } }
.cz-previa { overflow: auto; }
.cz-previa table { border-collapse: separate; border-spacing: 2px; }
.cz-previa td { width: 28px; height: 28px; text-align: center; font-weight: 800; font-size: 13px; border-radius: 6px; position: relative; }
.cz-previa td.letra { background: #fff; border: 2px solid #286456; color: #161F38; }
.cz-previa td sup { position: absolute; left: 2px; top: 0; font-size: 8px; color: #286456; }
.cz-fora { background: #FFF3D6; border-radius: 10px; padding: 10px 12px; font-size: 13px; }
.cz-erro { background: #FDE8E8; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-bottom: 10px; }
.cz-ok { background: #E8F0EC; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-bottom: 10px; }
.cz-dica { font-size: 12px; color: #666; }
.cz-acoes { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
</style>

<div class="card">
  <div class="card-title" style="font-weight:800;font-size:18px;margin-bottom:6px;">🏝️ Ilha das Palavras — <?= htmlspecialchars($atv['titulo']) ?></div>
  <div class="cz-dica">Turma <?= htmlspecialchars($atv['turma_nome']) ?> · <?= htmlspecialchars($atv['disciplina']) ?> · ⭐ <?= (int)$atv['xp_recompensa'] ?> XP · <?= $atv['publicada'] ? 'Publicada' : 'Rascunho' ?></div>
  <?php foreach ($erros as $e): ?><div class="cz-erro">⚠️ <?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($ok): ?><div class="cz-ok">✅ <?= htmlspecialchars($ok) ?></div><?php endif; ?>

  <form method="POST" id="formCruz">
    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(cruz_csrf_token()) ?>">
    <input type="hidden" name="layout_json" id="layoutJson" value="<?= htmlspecialchars(json_encode($palavras, JSON_UNESCAPED_UNICODE)) ?>">
    <div class="cz-grid">
      <div>
        <label>Palavras e dicas (uma por linha: <b>RESPOSTA | dica</b>)</label>
        <textarea name="palavras_texto" id="palavrasTexto" rows="14" placeholder="ÁGUA | Líquido que bebemos e que cobre a maior parte do planeta&#10;PLANTA | Ser vivo que produz o próprio alimento usando a luz do Sol"><?= htmlspecialchars($linhasTexto) ?></textarea>
        <div class="cz-dica">Acentos são mantidos no tabuleiro; o aluno pode responder sem acento. De 8 a 12 palavras funciona melhor (máx. 30). Respostas com 2 a 15 letras.</div>
        <div class="cz-acoes">
          <button type="button" class="btn btn-primary botao" id="btnGerar">🧩 Gerar layout automaticamente</button>
          <button type="button" class="btn btn-outline botao secundario" id="btnOutro">🔀 Tentar outro arranjo</button>
        </div>
      </div>
      <div>
        <label>Tema visual</label>
        <select name="tema">
          <?php foreach (['ciencias' => 'Ciências — Ilha da Ciência', 'geografia' => 'Geografia — Ilha dos Mapas', 'portugues' => 'Português — Ilha-Biblioteca', 'matematica' => 'Matemática — Ilha Geométrica'] as $v => $r): ?>
            <option value="<?= $v ?>" <?= ($cfg['tema'] ?? '') === $v ? 'selected' : '' ?>><?= $r ?></option>
          <?php endforeach; ?>
        </select>
        <label>Ano/série (aparece no jogo)</label>
        <input type="text" name="ano_serie" maxlength="20" value="<?= htmlspecialchars($cfg['ano_serie'] ?? '') ?>" placeholder="Ex.: 3º ano">
        <label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" name="desafio_tempo" value="1" style="width:auto;" <?= !empty($cfg['desafio_tempo']) ? 'checked' : '' ?>> Desafio de tempo (bônus de +10%, nunca desconta)</label>
        <label>Tempo alvo do desafio (segundos)</label>
        <input type="number" name="tempo_alvo_seg" min="60" max="3600" value="<?= (int)($cfg['tempo_alvo_seg'] ?? 600) ?>">
        <label>Prévia da grade</label>
        <div class="cz-previa" id="previa"><div class="cz-dica">Clique em "Gerar layout" para ver a grade.</div></div>
        <div id="fora"></div>
      </div>
    </div>
    <div class="cz-acoes">
      <button type="submit" class="btn btn-primary botao" id="btnSalvar">💾 Salvar cruzadinha</button>
      <?php if ($palavras): ?><a class="btn btn-outline botao secundario" href="index.php?id=<?= $id ?>&teste=1" target="_blank">▶️ Testar o jogo (não grava)</a><?php endif; ?>
      <a class="btn btn-outline botao secundario" href="relatorio.php?id=<?= $id ?>">📊 Relatório da turma</a>
      <a class="btn btn-outline botao secundario" href="<?= $base ?>/professor/atividade_form.php?id=<?= $id ?>">← Voltar à atividade</a>
    </div>
  </form>
</div>

<script type="module">
  import { gerarLayout } from './js/gerador.js';
  import { montarLayout } from './js/cruzadinha.js';
  const $ = (id) => document.getElementById(id);
  let seed = 1;

  function lerItens() {
    return $('palavrasTexto').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const [resposta, ...resto] = l.split('|');
      return { resposta: resposta.trim(), dica: resto.join('|').trim() };
    }).filter(it => it.resposta.length >= 2);
  }

  function desenhar(palavras) {
    const lay = montarLayout({ palavras });
    const tb = document.createElement('table');
    const inicios = new Map();
    for (const p of lay.palavras) { const k = `${p.linha},${p.coluna}`; if (!inicios.has(k)) inicios.set(k, p.numero); }
    const cel = new Map(lay.celulas.map(c => [`${c.l},${c.c}`, c]));
    for (let l = 0; l < lay.linhas; l++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < lay.colunas; c++) {
        const td = document.createElement('td');
        const k = `${l},${c}`;
        if (cel.has(k)) { td.className = 'letra'; td.textContent = cel.get(k).letra; if (inicios.has(k)) { const s = document.createElement('sup'); s.textContent = inicios.get(k); td.appendChild(s); } }
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    }
    $('previa').innerHTML = `<div class="cz-dica">${lay.linhas} linhas × ${lay.colunas} colunas · ${lay.palavras.length} palavras</div>`;
    $('previa').appendChild(tb);
  }

  function gerar() {
    const itens = lerItens();
    if (itens.length < 2) { $('fora').innerHTML = '<div class="cz-fora">Informe pelo menos 2 palavras com dica.</div>'; return; }
    if (itens.some(it => !it.dica)) { $('fora').innerHTML = '<div class="cz-fora">Toda palavra precisa de uma dica depois do "|".</div>'; return; }
    const r = gerarLayout(itens, { seed, tentativas: 80, maxLado: 15 });
    $('layoutJson').value = JSON.stringify(r.palavras);
    desenhar(r.palavras);
    $('fora').innerHTML = r.naoCouberam.length
      ? `<div class="cz-fora">⚠️ Não couberam na grade: <b>${r.naoCouberam.join(', ')}</b>. Tente outro arranjo, troque essas palavras ou remova-as.</div>`
      : '<div class="cz-ok">✅ Todas as palavras couberam. Agora é só salvar.</div>';
  }
  $('btnGerar').addEventListener('click', () => { seed = 1; gerar(); });
  $('btnOutro').addEventListener('click', () => { seed++; gerar(); });
  $('palavrasTexto').addEventListener('input', () => { $('layoutJson').value = '[]'; });
  $('formCruz').addEventListener('submit', (ev) => {
    if ($('layoutJson').value === '[]') { ev.preventDefault(); gerar(); if ($('layoutJson').value !== '[]') $('formCruz').submit(); }
  });
  // Mostra a prévia do que já está salvo
  try { const salvo = JSON.parse($('layoutJson').value); if (salvo.length) desenhar(salvo); } catch {}
</script>
<?php if ($temLayout) pagina_fim(); else echo '</body></html>'; ?>
