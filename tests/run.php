<?php
// tests/run.php
// Executor de testes sem PHPUnit. Uso: php tests/run.php [filtro]
// Lê .env.test se existir (senão .env), roda tests/cases/*.php em ordem e
// imprime OK/FALHOU por teste. Sai com código 1 se houver qualquer falha.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit("Execute pela linha de comando ou pelo botão de testes do painel.\n");
}

require __DIR__ . '/bootstrap.php';

$filtro = $argv[1] ?? '';
$arquivos = glob(__DIR__ . '/cases/*.php') ?: [];
sort($arquivos);

foreach ($arquivos as $arquivo) {
    if ($filtro !== '' && !str_contains(basename($arquivo), $filtro)) {
        continue;
    }
    echo "\n▶ " . basename($arquivo) . "\n";
    require $arquivo;
}

$total = Teste::$total;
$falhas = Teste::$falhas;
echo "\n" . str_repeat('─', 60) . "\n";
printf("Resultado: %d testes, %d falhas%s\n", $total, $falhas, $falhas === 0 ? ' ✅' : ' ❌');
if ($falhas > 0) {
    echo "Falharam:\n";
    foreach (Teste::$nomesFalhos as $nome) {
        echo "  - {$nome}\n";
    }
}
exit($falhas === 0 ? 0 : 1);
