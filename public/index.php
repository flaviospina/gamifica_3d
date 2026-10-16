<?php
// public/index.php
// Único ponto de entrada publicado pelo nginx. Tudo fora de public/ é privado.
declare(strict_types=1);

// Servidor embutido do PHP (desenvolvimento): entrega arquivos estáticos existentes.
if (PHP_SAPI === 'cli-server') {
    $arquivo = __DIR__ . (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if ($arquivo !== __DIR__ . '/' && !str_contains($arquivo, '/.') && is_file($arquivo)) {
        return false;
    }
}

require dirname(__DIR__) . '/app/bootstrap.php';

$response = app_router()->dispatch(
    $_SERVER['REQUEST_METHOD'] ?? 'GET',
    $_SERVER['REQUEST_URI'] ?? '/'
);
$response->send();
