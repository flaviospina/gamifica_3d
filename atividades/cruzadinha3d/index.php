<?php
// ============================================================
//  atividades/cruzadinha3d/index.php — Ilha das Palavras (cruzadinha 3D)
//
//  FASE 2 (protótipo): abre direto no modo demonstração, sem login
//  e sem banco. A integração com a sessão do aluno entra na fase 5
//  (este arquivo passa a carregar a cruzadinha da atividade e injetar
//  os dados no bloco #dadosJogo).
// ============================================================
$versao = '0.2.0';               // mude para invalidar o cache dos arquivos js/css
$three  = '0.186.1';             // mesma versão de js/config.js
$dados  = [
  'modo'    => 'demo',
  'jogador' => ['nome' => 'Visitante'],
  // 'cruzadinha' => (fase 5: vem do banco). Sem ela, o jogo usa data/exemplo_ciencias.js
];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#161F38">
<title>Ilha das Palavras — Gamifica</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/jogo.css?v=<?= $versao ?>">
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@<?= $three ?>/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@<?= $three ?>/examples/jsm/"
  }
}
</script>
</head>
<body>
<canvas id="cena" tabindex="0" aria-label="Mundo 3D da cruzadinha"></canvas>

<!-- Dados da atividade (nunca dados pessoais além do primeiro nome) -->
<script id="dadosJogo" type="application/json"><?= json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>

<!-- Carregamento -->
<div id="carregamento" role="status" aria-live="polite">
  <div class="logo-ilha" aria-hidden="true">🏝️</div>
  <h1>Ilha das Palavras</h1>
  <p>Uma cruzadinha para explorar</p>
  <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="10"><div id="carregamentoBarra" style="width:10%"></div></div>
  <div id="carregamentoTexto">Carregando o motor 3D…</div>
</div>

<!-- HUD -->
<div id="hudTopo" class="hud">
  <div class="cartao">
    <div id="hudTitulo">Ilha das Palavras</div>
    <div id="hudTema"></div>
    <div id="hudPalavras"></div>
  </div>
  <button id="btnMenu" class="botao" type="button" aria-haspopup="dialog">☰ Menu</button>
</div>
<div id="dicaInteracao" class="hud" hidden>Totem por perto! <kbd>E</kbd> para ver a dica</div>
<div id="aviso" class="hud" role="status" aria-live="polite" hidden></div>
<div id="hudAjuda" class="hud">
  <kbd>W A S D</kbd> ou setas: andar · <kbd>Espaço</kbd>: pular<br>
  <kbd>E</kbd> ou <kbd>Enter</kbd>: interagir · arraste o mouse: girar · roda: zoom · <kbd>Esc</kbd>: menu
</div>
<div id="hudFps" hidden>— fps</div>

<!-- Controles de toque -->
<div id="controlesToque" aria-hidden="true">
  <div id="joystick"><div id="joystickPino"></div></div>
  <button id="btnPular" class="btnToque" type="button"><span>⤒</span>Pular</button>
  <button id="btnInteragir" class="btnToque" type="button"><span>✦</span>Ver</button>
</div>

<!-- Menu -->
<div id="menu" role="dialog" aria-modal="true" aria-labelledby="menuTitulo" hidden>
  <div class="painel">
    <h2 id="menuTitulo">Opções</h2>
    <label>Qualidade gráfica
      <select id="selQualidade"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select>
    </label>
    <label>Reduzir movimento da câmera <input type="checkbox" id="chkMovimento"></label>
    <label>Mostrar controles de toque <input type="checkbox" id="chkToque"></label>
    <div class="acoes">
      <button id="btnVoltarInicio" class="botao secundario" type="button">Voltar ao início da ilha</button>
      <button id="btnFecharMenu" class="botao" type="button">Continuar</button>
    </div>
  </div>
</div>

<script type="module">
  // Se o CDN falhar (sem internet ou bloqueado), mostra uma mensagem amigável.
  import('./js/main.js?v=<?= $versao ?>').catch((err) => {
    console.error(err);
    const t = document.getElementById('carregamentoTexto');
    document.getElementById('carregamento').classList.add('erro');
    t.textContent = 'Não foi possível carregar o motor 3D. Verifique a conexão com a internet e tente de novo.';
  });
</script>
</body>
</html>
