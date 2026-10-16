<?php
// app/Log.php
// Registro simples em arquivo (storage/logs/app.log). Detalhes técnicos vão
// para cá; o professor só vê mensagens amigáveis.
declare(strict_types=1);

namespace App;

final class Log
{
    public static function info(string $message, array $context = []): void
    {
        self::write('INFO', $message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::write('AVISO', $message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::write('ERRO', $message, $context);
    }

    private static function write(string $level, string $message, array $context): void
    {
        $line = sprintf(
            "[%s] %s: %s%s\n",
            date('Y-m-d H:i:s'),
            $level,
            $message,
            $context ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : ''
        );
        if (!is_dir(LOG_PATH)) {
            @mkdir(LOG_PATH, 0750, true);
        }
        @file_put_contents(LOG_PATH . '/app.log', $line, FILE_APPEND | LOCK_EX);
    }
}
