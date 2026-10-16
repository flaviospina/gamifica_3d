<?php
// app/views/home.php — página inicial (Fase 0: apresentação e estado do sistema).
?>
<section class="hero">
  <h1>Materiais visuais com IA para a sala de aula</h1>
  <p>Apostilas A4, cartazes de eventos e planos de aula alinhados à BNCC, criados pelos professores da rede municipal de São Caetano do Sul.</p>
</section>

<section class="cartoes">
  <article class="cartao">
    <h2>1. Conteúdo aprovado antes da imagem</h2>
    <p>A IA de texto propõe; o professor revisa; só então a página é desenhada.</p>
  </article>
  <article class="cartao">
    <h2>2. Habilidades BNCC oficiais</h2>
    <p>Os códigos vêm da base oficial carregada no sistema. Nenhum código é inventado.</p>
  </article>
  <article class="cartao">
    <h2>3. Página-imagem ou página editável</h2>
    <p>Escolha entre a página inteira desenhada pela IA ou texto editável com ilustração.</p>
  </article>
</section>

<section class="estado" x-data="estadoSistema()" x-init="carregar()">
  <h2>Estado do sistema</h2>
  <p x-show="carregando">Verificando…</p>
  <template x-if="!carregando">
    <div>
      <p :class="ok ? 'ok' : 'erro'" x-text="mensagem"></p>
      <ul class="lista-estado">
        <li>PHP: <strong x-text="php"></strong></li>
        <li>Banco de dados: <strong x-text="banco"></strong></li>
        <li>Armazenamento: <strong x-text="storage"></strong></li>
      </ul>
    </div>
  </template>
  <p class="nota">Detalhes em <a href="<?= e(BASE_URL) ?>/health"><code>/health</code></a>.</p>
</section>
