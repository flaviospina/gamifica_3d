<?php
// tests/bootstrap.php
// Carrega a aplicação (app/bootstrap.php) apontando para .env.test (ou .env) e define os
// auxiliares de teste: Teste::caso(), Teste::igual(), Teste::verdadeiro()...
declare(strict_types=1);

$envTest = dirname(__DIR__) . '/.env.test';
define('ENV_FILE', is_file($envTest) ? $envTest : dirname(__DIR__) . '/.env');

require dirname(__DIR__) . '/app/bootstrap.php';

final class FalhaDeTeste extends \RuntimeException
{
}

final class Teste
{
    public static int $total = 0;
    public static int $falhas = 0;
    /** @var string[] */
    public static array $nomesFalhos = [];

    /** Executa um caso de teste e imprime OK/FALHOU. */
    public static function caso(string $nome, callable $fn): void
    {
        self::$total++;
        $inicio = microtime(true);
        try {
            $fn();
            printf("  OK      %s (%.0f ms)\n", $nome, (microtime(true) - $inicio) * 1000);
        } catch (\Throwable $e) {
            self::$falhas++;
            self::$nomesFalhos[] = $nome;
            printf("  FALHOU  %s\n          %s\n", $nome, $e->getMessage());
            if (!$e instanceof FalhaDeTeste) {
                printf("          em %s:%d\n", $e->getFile(), $e->getLine());
            }
        }
    }

    public static function verdadeiro(mixed $valor, string $msg = 'Esperava verdadeiro'): void
    {
        if ($valor !== true) {
            throw new FalhaDeTeste($msg . ' — recebido: ' . var_export($valor, true));
        }
    }

    public static function falso(mixed $valor, string $msg = 'Esperava falso'): void
    {
        if ($valor !== false) {
            throw new FalhaDeTeste($msg . ' — recebido: ' . var_export($valor, true));
        }
    }

    public static function igual(mixed $esperado, mixed $recebido, string $msg = 'Valores diferentes'): void
    {
        if ($esperado !== $recebido) {
            throw new FalhaDeTeste(sprintf('%s — esperado %s, recebido %s', $msg, var_export($esperado, true), var_export($recebido, true)));
        }
    }

    public static function contem(string $trecho, string $texto, string $msg = 'Trecho não encontrado'): void
    {
        if (!str_contains($texto, $trecho)) {
            throw new FalhaDeTeste($msg . ' — procurado: ' . var_export($trecho, true));
        }
    }

    public static function naoContem(string $trecho, string $texto, string $msg = 'Trecho proibido encontrado'): void
    {
        if (str_contains($texto, $trecho)) {
            throw new FalhaDeTeste($msg . ' — encontrado: ' . var_export($trecho, true));
        }
    }

    /** Garante que a função lança exceção (opcionalmente de uma classe). */
    public static function lanca(callable $fn, string $classe = \Throwable::class, string $msg = 'Esperava exceção'): \Throwable
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            if (!$e instanceof $classe) {
                throw new FalhaDeTeste($msg . ' — classe recebida: ' . get_class($e));
            }
            return $e;
        }
        throw new FalhaDeTeste($msg . ' — nenhuma exceção lançada');
    }
}
