<?php
// app/Router.php
// Roteador mínimo: método + caminho → callable. Suporta parâmetros {nome}.
// dispatch() nunca envia nada ao navegador; devolve um Response.
declare(strict_types=1);

namespace App;

use Throwable;

final class Router
{
    /** @var array<string, array<int, array{pattern:string, handler:callable, params:string[]}>> */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function add(string $method, string $path, callable $handler): void
    {
        $params = [];
        $pattern = preg_replace_callback('/\{(\w+)\}/', static function (array $m) use (&$params): string {
            $params[] = $m[1];
            return '([^/]+)';
        }, self::normalize($path));
        $this->routes[strtoupper($method)][] = [
            'pattern' => '#^' . $pattern . '$#u',
            'handler' => $handler,
            'params'  => $params,
        ];
    }

    /** Resolve a requisição e devolve a resposta; erros viram 404/405/500 amigáveis. */
    public function dispatch(string $method, string $uri): Response
    {
        $method = strtoupper($method);
        $path = self::normalize((string) parse_url($uri, PHP_URL_PATH));
        if ($method === 'HEAD') {
            $method = 'GET';
        }

        try {
            $allowed = [];
            foreach ($this->routes as $routeMethod => $routes) {
                foreach ($routes as $route) {
                    if (!preg_match($route['pattern'], $path, $m)) {
                        continue;
                    }
                    if ($routeMethod !== $method) {
                        $allowed[] = $routeMethod;
                        continue;
                    }
                    $args = [];
                    foreach ($route['params'] as $i => $name) {
                        $args[$name] = rawurldecode($m[$i + 1]);
                    }
                    $result = ($route['handler'])($args);
                    return $result instanceof Response ? $result : Response::html((string) $result);
                }
            }
            if ($allowed) {
                return $this->error(405, 'Método não permitido para este endereço.');
            }
            return $this->error(404, 'Página não encontrada.');
        } catch (Throwable $e) {
            Log::error('Erro não tratado em ' . $method . ' ' . $path, [
                'tipo' => get_class($e), 'mensagem' => $e->getMessage(),
                'arquivo' => $e->getFile(), 'linha' => $e->getLine(),
            ]);
            $detalhe = APP_DEBUG ? $e->getMessage() : null;
            return $this->error(500, 'Ocorreu um erro interno. Tente novamente em instantes.', $detalhe);
        }
    }

    private function error(int $status, string $message, ?string $detail = null): Response
    {
        return Response::html(View::render('erro', [
            'titulo'   => 'Erro ' . $status,
            'status'   => $status,
            'mensagem' => $message,
            'detalhe'  => $detail,
        ]), $status);
    }

    /** Garante barra inicial e remove barra final (exceto na raiz). */
    public static function normalize(string $path): string
    {
        $path = '/' . trim($path, '/');
        return $path === '//' ? '/' : $path;
    }
}
