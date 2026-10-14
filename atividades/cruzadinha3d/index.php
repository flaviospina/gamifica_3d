<?php
// ============================================================
//  atividades/cruzadinha3d/index.php — Ilha das Palavras (cruzadinha 3D)
//
//  FASE 2 (protótipo): abre direto no modo demonstração, sem login
//  e sem banco. A integração com a sessão do aluno entra na fase 5
//  (este arquivo passa a carregar a cruzadinha da atividade e injetar
//  os dados no bloco #dadosJogo).
// ============================================================
$versao = '0.3.0';               // mude para invalidar o cache dos arquivos js/css
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
    <div class="hud-linha"><span id="hudPalavras"></span> <span id="hudEstrelas" title="Estrelas de autonomia">⭐ 0</span> <span id="hudPontos">0 pts</span> <span id="hudTempo" hidden></span></div>
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

<!-- Painel da dica -->
<div id="painelDica" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="dicaNumero" hidden>
  <div class="painel painel-dica">
    <div class="dica-cabecalho">
      <span id="dicaNumero" class="dica-numero">1 →</span>
      <div class="dica-botoes">
        <button id="btnOuvir" class="botao secundario mini" type="button" title="Ouvir a dica" aria-label="Ouvir a dica">🔊 Ouvir</button>
        <button id="btnFecharDica" class="botao secundario mini" type="button" aria-label="Fechar painel">✕</button>
      </div>
    </div>
    <p id="dicaTexto" class="dica-texto"></p>
    <div class="casinhas-wrap">
      <div id="casinhas" class="casinhas" aria-live="polite"></div>
      <input id="entradaResposta" class="entrada-oculta" type="text" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" inputmode="text" aria-label="Digite a resposta, uma letra por casa" enterkeyhint="done">
    </div>
    <div id="dicaMensagem" class="dica-mensagem" role="status" aria-live="polite"></div>
    <div class="acoes">
      <button id="btnRevelar" class="botao secundario" type="button">💡 Revelar uma letra</button>
      <button id="btnResponder" class="botao dourado" type="button">Responder ✓</button>
    </div>
    <div class="dica-rodape">Dicas não tiram pontos. Resolver sem dica ganha uma ⭐ extra.</div>
  </div>
</div>

<!-- Resultado final -->
<div id="resultado" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="resNome" hidden>
  <div class="painel painel-resultado">
    <div class="res-trofeu" aria-hidden="true">🏆</div>
    <h2 id="resNome">Parabéns!</h2>
    <p class="res-sub">Você completou a Ilha das Palavras.</p>
    <dl class="res-grade">
      <div><dt>Palavras</dt><dd id="resPalavras">0/0</dd></div>
      <div><dt>Estrelas ⭐</dt><dd id="resEstrelas">0</dd></div>
      <div><dt>Dicas usadas</dt><dd id="resDicas">0</dd></div>
      <div><dt>Tempo</dt><dd id="resTempo">0:00</dd></div>
    </dl>
    <table class="res-pontos">
      <tr><td>Palavras resolvidas</td><td id="resBase">0</td></tr>
      <tr><td>Bônus de autonomia</td><td id="resBonusEstrelas">+0</td></tr>
      <tr id="resBonusTempoLinha"><td>Bônus de tempo</td><td id="resBonusTempo">+0</td></tr>
      <tr class="total"><td>Pontuação</td><td id="resTotal">0</td></tr>
    </table>
    <p id="resDemo" class="res-demo" hidden>Modo demonstração: nada foi gravado.</p>
    <div class="acoes">
      <button id="btnJogarDeNovo" class="botao secundario" type="button">Jogar de novo</button>
      <button id="btnContinuarExplorando" class="botao" type="button">Continuar explorando</button>
    </div>
  </div>
</div>

<!-- Menu -->
<div id="menu" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="menuTitulo" hidden>
  <div class="painel">
    <h2 id="menuTitulo">Opções</h2>
    <label>Qualidade gráfica
      <select id="selQualidade"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select>
    </label>
    <label>Reduzir movimento da câmera <input type="checkbox" id="chkMovimento"></label>
    <label>Mostrar controles de toque <input type="checkbox" id="chkToque"></label>
    <div class="acoes">
      <button id="btnVoltarInicio" class="botao secundario" type="button">Voltar ao início da ilha</button>
      <button id="btnReiniciar" class="botao secundario" type="button">Recomeçar cruzadinha</button>
      <button id="btnFecharMenu" class="botao" type="button">Continuar</button>
    </div>
  </div>
</div>

<!-- Carregador externo: erros de CDN/CSP viram mensagem na tela -->
<script type="module" src="js/boot.js?v=<?= $versao ?>"></script>
</body>
</html>
