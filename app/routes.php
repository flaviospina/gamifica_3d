<?php
// app/routes.php
// Mapa de rotas da aplicação. Cada fase acrescenta as suas aqui.
declare(strict_types=1);

use App\Controllers\HealthController;
use App\Controllers\HomeController;
use App\Router;

return static function (Router $router): void {
    $router->get('/', [new HomeController(), 'index']);
    $router->get('/health', [new HealthController(), 'index']);
};
