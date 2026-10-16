<?php
// app/views/erro.php — página de erro amigável (404, 405, 500).
/** @var int $status @var string $mensagem @var ?string $detalhe */
?>
<section class="erro-pagina">
  <h1><?= e($status) ?></h1>
  <p><?= e($mensagem) ?></p>
  <?php if (!empty($detalhe)): ?>
  <pre class="detalhe"><?= e($detalhe) ?></pre>
  <?php endif; ?>
  <p><a class="botao" href="<?= e(BASE_URL) ?>/">Voltar ao início</a></p>
</section>
