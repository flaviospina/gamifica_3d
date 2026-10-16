<?php
// tests/cases/fase0_health.php — rota /health com banco ligado e desligado
declare(strict_types=1);

use App\Controllers\HealthController;
use App\Database;
use App\Services\HealthCheck;

Teste::caso('/health: responde 200 e {"status":"ok"} com banco ligado', function () {
    $r = app_router()->dispatch('GET', '/health');
    Teste::igual(200, $r->status);
    Teste::contem('application/json', $r->headers['Content-Type'] ?? '');
    $dados = $r->json_body();
    Teste::igual('ok', $dados['status'] ?? null, 'status');
    Teste::verdadeiro($dados['php']['ok'] ?? false, 'php.ok');
    Teste::verdadeiro($dados['banco']['ok'] ?? false, 'banco.ok');
    Teste::verdadeiro($dados['storage']['ok'] ?? false, 'storage.ok');
    Teste::igual([], $dados['php']['extensoes_faltando'] ?? null, 'Extensões PHP faltando');
    Teste::verdadeiro(isset($dados['hora'], $dados['versao'], $dados['mensagem']), 'Campos hora/versao/mensagem');
});

Teste::caso('/health: responde 503 com mensagem em português quando o banco está desligado', function () {
    $check = new HealthCheck(fn() => Database::connect(['host' => '127.0.0.1', 'port' => 1, 'name' => 'x', 'user' => 'x', 'pass' => 'x', 'timeout' => 2]));
    $r = (new HealthController($check))->index();
    Teste::igual(503, $r->status);
    $dados = $r->json_body();
    Teste::igual('erro', $dados['status'] ?? null);
    Teste::falso($dados['banco']['ok'] ?? true, 'banco.ok deveria ser false');
    Teste::contem('Banco de dados indisponível', $dados['mensagem'] ?? '');
    Teste::contem('Não foi possível conectar ao banco de dados', $dados['banco']['mensagem'] ?? '');
});

Teste::caso('/health: responde 503 quando a pasta storage não é gravável', function () {
    $check = new HealthCheck(fn() => Database::get(), ROOT_PATH . '/pasta-que-nao-existe');
    $r = (new HealthController($check))->index();
    Teste::igual(503, $r->status);
    $dados = $r->json_body();
    Teste::falso($dados['storage']['ok'] ?? true);
    Teste::contem('armazenamento', $dados['mensagem'] ?? '');
});
