<?php
// app/views/layout.php — moldura comum de todas as páginas (mobile-first).
/** @var string $content */
$titulo = $titulo ?? APP_NAME;
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($titulo) ?> · <?= e(APP_NAME) ?></title>
<link rel="stylesheet" href="<?= e(BASE_URL) ?>/assets/css/app.css">
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/cdn.min.js"></script>
<script defer src="<?= e(BASE_URL) ?>/assets/js/app.js"></script>
</head>
<body>
<header class="topo">
  <a class="marca" href="<?= e(BASE_URL) ?>/">
    <span class="marca-icone" aria-hidden="true">📘</span>
    <span><?= e(APP_NAME) ?></span>
  </a>
</header>
<main class="conteudo">
<?= $content ?>
</main>
<footer class="rodape">
  <p>CECAPE · Secretaria de Educação de São Caetano do Sul · versão <?= e(APP_VERSION) ?></p>
</footer>
</body>
</html>
