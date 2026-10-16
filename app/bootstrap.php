<?php
// app/bootstrap.php
// Ponto comum de inicialização: autoload do Composer, configuração e roteador.
// Usado por public/index.php, pelos testes e, nas próximas fases, pelo worker.
declare(strict_types=1);

$autoload = dirname(__DIR__) . '/vendor/autoload.php';
if (!is_file($autoload)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Pasta vendor/ não encontrada. Faça o git pull completo do repositório (a pasta vendor/ é versionada).\n");
}
require $autoload;
require __DIR__ . '/config.php';

/** Monta o roteador com todas as rotas registradas em app/routes.php. */
function app_router(): App\Router
{
    $router = new App\Router();
    (require __DIR__ . '/routes.php')($router);
    return $router;
}
