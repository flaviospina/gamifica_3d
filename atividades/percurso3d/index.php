<?php
// ============================================================
//  atividades/percurso3d/index.php — Cidade do Saber (jogo de percurso 3D)
//  Nesta etapa a página roda em modo demonstração (sem login nem banco):
//  o banco de perguntas vem de data/perguntas_demo.js.
//  A integração com o Gamifica (atividade, XP, relatório) entra na próxima fase.
// ============================================================
$versao = '0.2.0';               // mude para invalidar o cache de js/css
$three  = '0.186.1';             // mesma versão de js/config.js
$base   = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/');
$dados  = ['modo' => 'demo', 'versao' => $versao];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<title>Cidade do Saber · Gamifica</title>
<meta name="description" content="Dê a volta na cidade respondendo perguntas. Jogo de percurso 3D para 1 a 6 jogadores, sem punição.">
<meta name="theme-color" content="#161F38">
<meta property="og:title" content="Cidade do Saber">
<meta property="og:description" content="Dê a volta na cidade respondendo perguntas. De 1 a 6 jogadores.">
<meta property="og:image" content="<?= htmlspecialchars($base) ?>/art/_anchor.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/jogo.css?v=<?= $versao ?>">
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@<?= $three ?>/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@<?= $three ?>/examples/jsm/"
  }
}
</script>
<script type="application/json" id="dadosJogo"><?= json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?></script>
</head>
<body>

<div id="carregamento">
  <div class="logo">🏙️</div>
  <h1>Cidade do Saber</h1>
  <p class="sub">Um percurso para dar a volta aprendendo</p>
  <div class="barra"><div id="carregamentoBarra"></div></div>
  <p id="carregamentoTexto">Carregando…</p>
</div>

<canvas id="cena" aria-label="Cidade do Saber em 3D"></canvas>
<canvas id="mapaCheio" hidden aria-label="Mapa 2D da cidade"></canvas>

<!-- HUD -->
<div id="hudInfo" class="hud cartao" hidden>
  <div id="hudTitulo">Cidade do Saber</div>
  <div id="hudSub"></div>
  <div id="hudRodada"></div>
</div>
<div id="hudBotoes" class="hud" hidden>
  <button id="btnVista" class="botao redondo" type="button" title="Ver a cidade (V)" aria-label="Alternar vista da cidade">🗺️</button>
  <button id="btnSom" class="botao redondo" type="button" aria-label="Som">🔊</button>
  <button id="btnMenu" class="botao" type="button">☰ Menu</button>
</div>
<ol id="placar" class="hud" hidden aria-label="Placar"></ol>
<div id="minimapaCaixa" class="hud" hidden><canvas id="minimapa"></canvas></div>

<div id="faixaVez" class="hud" role="status" aria-live="polite" hidden></div>
<div id="guiaAndar" class="hud" hidden></div>
<div id="aviso" class="hud" role="status" aria-live="polite" hidden></div>

<div id="areaDado" class="hud" hidden>
  <div class="dado-cena"><div id="dado" class="dado">
    <div class="face f1"><i></i></div>
    <div class="face f2"><i></i><i></i></div>
    <div class="face f3"><i></i><i></i><i></i></div>
    <div class="face f4"><i></i><i></i><i></i><i></i></div>
    <div class="face f5"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="face f6"><i></i><i></i><i></i><i></i><i></i><i></i></div>
  </div></div>
  <button id="btnDado" class="botao dourado grande" type="button">🎲 Jogar o dado</button>
</div>

<div id="controlesToque" class="hud" hidden>
  <button id="btnEsq" class="botao toque" type="button" aria-label="Faixa da esquerda">◀</button>
  <button id="btnAcelerar" class="botao toque acelerar" type="button" aria-label="Acelerar">▲<span>Segure para andar</span></button>
  <button id="btnDir" class="botao toque" type="button" aria-label="Faixa da direita">▶</button>
</div>

<!-- Tela inicial -->
<div id="telaInicio" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="inicioTitulo" hidden>
  <div class="painel largo">
    <h2 id="inicioTitulo">Cidade do Saber</h2>
    <p id="inicioSub" class="suave"></p>
    <h3>Quem vai jogar?</h3>
    <div id="vagas" class="vagas"></div>
    <div class="linha-opcoes">
      <label>Voltas <select id="selVoltas"><option value="1">1 volta</option><option value="2">2 voltas</option><option value="3">3 voltas</option></select></label>
      <label>Computador <select id="selNivel"><option value="facil">Fácil</option><option value="medio" selected>Médio</option><option value="dificil">Difícil</option></select></label>
    </div>
    <p id="inicioErro" class="erro" hidden></p>
    <div class="acoes">
      <button id="btnComoJogar1" class="botao secundario" type="button">❓ Como jogar</button>
      <button id="btnComecar" class="botao dourado" type="button">Começar a partida</button>
    </div>
  </div>
</div>

<!-- Cartão genérico (carta da casa, avisos, museu, obra, chegada) -->
<div id="cartao" class="sobreposicao baixa" role="dialog" aria-modal="true" aria-labelledby="cartaoTitulo" hidden>
  <div class="painel carta">
    <div id="cartaoIcone" class="carta-icone"></div>
    <div id="cartaoEtiqueta" class="etiqueta" hidden></div>
    <h2 id="cartaoTitulo"></h2>
    <p id="cartaoTexto"></p>
    <div id="cartaoExtra"></div>
    <div id="cartaoBotoes" class="acoes"></div>
  </div>
</div>

<!-- Pergunta -->
<div id="pergunta" class="sobreposicao baixa" role="dialog" aria-modal="true" aria-labelledby="perguntaTexto" hidden>
  <div class="painel pergunta">
    <div class="pergunta-topo"><span id="perguntaTipo" class="etiqueta"></span><button id="btnOuvir" class="botao mini secundario" type="button">🔊 Ouvir</button></div>
    <div class="tempo"><div id="perguntaTempo"></div></div>
    <h2 id="perguntaTexto"></h2>
    <div id="perguntaOpcoes" class="opcoes"></div>
    <p id="perguntaRetorno" class="retorno" hidden></p>
    <div class="acoes"><button id="btnPerguntaOk" class="botao" type="button" hidden>Continuar</button></div>
  </div>
</div>

<!-- Resultado -->
<div id="resultado" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="resTitulo" hidden>
  <div class="painel largo">
    <h2 id="resTitulo">Todos chegaram! 🎉</h2>
    <p class="suave">Ninguém perdeu nada pelo caminho: tudo o que cada um conquistou está aqui.</p>
    <div class="tabela-rolagem"><table id="resTabela"><thead><tr><th>Chegada</th><th>Jogador</th><th>Pontos</th><th>⭐</th><th>Selos</th><th>Obras</th><th>Acertos</th><th>XP</th></tr></thead><tbody></tbody></table></div>
    <p id="resDemo" class="suave">Modo demonstração: o XP mostrado é uma prévia e não é gravado.</p>
    <div class="acoes">
      <button id="btnVerCidade" class="botao secundario" type="button">🏙️ Ver a cidade</button>
      <button id="btnDeNovo" class="botao dourado" type="button">Jogar de novo</button>
    </div>
  </div>
</div>

<!-- Menu -->
<div id="menu" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="menuTitulo" hidden>
  <div class="painel">
    <h2 id="menuTitulo">Opções</h2>
    <label class="opcao">Sons do jogo <input type="checkbox" id="chkSom"></label>
    <label class="opcao">Piloto automático (o carrinho anda sozinho) <input type="checkbox" id="chkPiloto"></label>
    <label class="opcao">Texto maior nas perguntas <input type="checkbox" id="chkTexto"></label>
    <label class="opcao">Mostrar botões de toque <input type="checkbox" id="chkToque"></label>
    <label class="opcao">Qualidade gráfica <select id="selQualidade"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
    <div class="acoes">
      <button id="btnComoJogar2" class="botao secundario" type="button">❓ Como jogar</button>
      <button id="btnReiniciar" class="botao secundario" type="button">🔄 Nova partida</button>
      <button id="btnFecharMenu" class="botao" type="button">Continuar jogando</button>
    </div>
  </div>
</div>

<!-- Ajuda -->
<div id="ajuda" class="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="ajudaTitulo" hidden>
  <div class="painel largo">
    <h2 id="ajudaTitulo">Como jogar</h2>
    <ol class="passos">
      <li><b>Jogue o dado</b> na sua vez (botão dourado, <kbd>Espaço</kbd> ou <kbd>Enter</kbd>).</li>
      <li><b>Dirija o carrinho</b> até a casa marcada: segure <kbd>↑</kbd> ou <kbd>W</kbd> (no celular, o botão ▲). Com <kbd>←</kbd> <kbd>→</kbd> você muda de faixa.</li>
      <li><b>Descubra a casa.</b> Toda casa começa com um “?”. Ao parar nela, a surpresa aparece e fica à mostra para todos.</li>
      <li><b>Responda às perguntas.</b> Acertou: 1 estrela, 10 pontos e mais 2 casas. Errou: fica no lugar, vê a resposta e a pergunta volta depois.</li>
      <li><b>Complete as voltas.</b> Cada volta vale 5 estrelas e 50 pontos. A partida só acaba quando todos chegam.</li>
    </ol>
    <h3>O que pode estar escondido</h3>
    <ul class="legenda">
      <li><b>PERG</b> pergunta</li><li><b>+2 · +3 · ATALHO</b> avance casas</li><li><b>-1 · -2</b> volte casas e ganhe 10 pontos de consolação</li>
      <li><b>+20 · +50</b> pontos</li><li><b>DADO</b> jogue de novo</li><li><b>TODOS</b> desafio em que todos respondem</li>
      <li><b>TODOS +1</b> mutirão: todos avançam</li><li><b>CARONA</b> pule até quem está à frente</li><li><b>MUSEU</b> curiosidade e selo</li><li><b>OBRA</b> troque 3 estrelas por um prédio seu</li>
    </ul>
    <p class="suave">Aqui nada tira pontos, estrelas ou a sua vez. Quem está em último joga o dado com +1.</p>
    <div class="acoes"><button id="btnFecharAjuda" class="botao" type="button">Entendi</button></div>
  </div>
</div>

<script type="module" src="js/main.js?v=<?= $versao ?>"></script>
</body>
</html>
