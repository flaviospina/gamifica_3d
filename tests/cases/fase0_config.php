<?php
// tests/cases/fase0_config.php — leitura do .env e constantes
declare(strict_types=1);

Teste::caso('config: constantes básicas definidas', function () {
    foreach (['ROOT_PATH', 'APP_NAME', 'APP_ENV', 'BASE_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS', 'STORAGE_PATH', 'LOG_PATH', 'AI_MOCK'] as $c) {
        Teste::verdadeiro(defined($c), "Constante {$c} não definida");
    }
    Teste::verdadeiro(is_int(DB_PORT), 'DB_PORT deve ser inteiro');
    Teste::verdadeiro(is_bool(AI_MOCK), 'AI_MOCK deve ser booleano');
});

Teste::caso('config: testes rodam em modo simulado (AI_MOCK=1)', function () {
    Teste::verdadeiro(AI_MOCK, 'Os testes nunca devem gastar créditos de IA');
});

Teste::caso('config: env_load interpreta aspas, comentários e não sobrescreve', function () {
    $arquivo = sys_get_temp_dir() . '/env-teste-' . bin2hex(random_bytes(4));
    file_put_contents($arquivo, "# comentário\nTESTE_A=\"valor com espaço\"\nTESTE_B='simples'\nTESTE_C=sem_aspas # comentário final\nTESTE_D=\n\nLINHA_INVALIDA\n");
    $_ENV['TESTE_B'] = 'original';
    try {
        env_load($arquivo);
        Teste::igual('valor com espaço', env('TESTE_A'));
        Teste::igual('original', env('TESTE_B'), 'Valor existente não pode ser sobrescrito');
        Teste::igual('sem_aspas', env('TESTE_C'));
        Teste::igual('', env('TESTE_D'));
        Teste::igual('padrao', env('TESTE_INEXISTENTE', 'padrao'));
    } finally {
        unlink($arquivo);
        unset($_ENV['TESTE_A'], $_ENV['TESTE_B'], $_ENV['TESTE_C'], $_ENV['TESTE_D']);
    }
});

Teste::caso('config: env_bool aceita 1/true/sim/on', function () {
    foreach (['1', 'true', 'sim', 'on', 'YES'] as $v) {
        $_ENV['TESTE_BOOL'] = $v;
        Teste::verdadeiro(env_bool('TESTE_BOOL'), "env_bool('{$v}')");
    }
    foreach (['0', 'false', 'nao', 'off', ''] as $v) {
        $_ENV['TESTE_BOOL'] = $v;
        Teste::falso(env_bool('TESTE_BOOL', false), "env_bool('{$v}')");
    }
    unset($_ENV['TESTE_BOOL']);
});

Teste::caso('config: .env.example cobre todas as chaves usadas pelo sistema', function () {
    $exemplo = file_get_contents(ROOT_PATH . '/.env.example');
    foreach (['APP_NAME', 'APP_ENV', 'APP_DEBUG', 'BASE_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS', 'STORAGE_PATH', 'AI_MOCK'] as $chave) {
        Teste::contem("\n{$chave}=", "\n" . $exemplo, "Chave {$chave} ausente no .env.example");
    }
});
