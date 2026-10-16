<?php
// tests/cases/fase0_banco.php — conexão com o banco de teste
declare(strict_types=1);

use App\Database;

Teste::caso('banco: conecta ao banco de teste e executa SELECT 1', function () {
    Teste::verdadeiro(DB_NAME !== '', 'DB_NAME vazio: configure .env.test (veja .env.test.example)');
    $pdo = Database::get();
    Teste::igual(1, (int) $pdo->query('SELECT 1')->fetchColumn());
    Teste::verdadeiro(Database::get() === $pdo, 'Database::get() deve devolver a mesma instância');
});

Teste::caso('banco: conexão usa utf8mb4 e prepared statements reais', function () {
    $pdo = Database::get();
    $charset = (string) $pdo->query("SELECT @@character_set_connection")->fetchColumn();
    Teste::igual('utf8mb4', $charset, 'Charset da conexão');
    Teste::falso((bool) $pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES), 'Prepared statements não podem ser emulados');
    $stmt = $pdo->prepare('SELECT :valor AS v');
    $stmt->execute(['valor' => 'ação']);
    Teste::igual('ação', $stmt->fetchColumn(), 'Acentuação preservada');
});

Teste::caso('banco: host inválido lança PDOException rapidamente', function () {
    $inicio = microtime(true);
    Teste::lanca(fn() => Database::connect(['host' => '127.0.0.1', 'port' => 1, 'name' => 'x', 'user' => 'x', 'pass' => 'x', 'timeout' => 2]), PDOException::class);
    Teste::verdadeiro(microtime(true) - $inicio < 10, 'Falha de conexão demorou demais');
});
