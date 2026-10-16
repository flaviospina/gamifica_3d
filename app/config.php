<?php
// app/config.php
// Carrega o arquivo .env (fora de public/) e define as constantes globais.
// Nada de chave ou senha neste arquivo: tudo vem do .env.
declare(strict_types=1);

define('ROOT_PATH', dirname(__DIR__));
require_once __DIR__ . '/helpers.php';

/**
 * Lê um arquivo .env simples (CHAVE=valor, aspas opcionais, # comentário).
 * Variáveis já definidas no ambiente (getenv/$_ENV) têm prioridade e não
 * são sobrescritas — isso permite aos testes e ao systemd ajustarem valores.
 */
function env_load(string $file): void
{
    if (!is_file($file) || !is_readable($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if ($key === '' || array_key_exists($key, $_ENV)) {
            continue;
        }
        $len = strlen($value);
        if ($len >= 2 && (($value[0] === '"' && $value[$len - 1] === '"') || ($value[0] === "'" && $value[$len - 1] === "'"))) {
            $value = substr($value, 1, -1);
        } else {
            // Remove comentário no fim da linha (valor sem aspas).
            $pos = strpos($value, ' #');
            if ($pos !== false) {
                $value = rtrim(substr($value, 0, $pos));
            }
        }
        $_ENV[$key] = $value;
    }
}

/** Devolve uma variável de ambiente (string) ou o padrão. */
function env(string $key, ?string $default = null): ?string
{
    if (array_key_exists($key, $_ENV)) {
        return (string) $_ENV[$key];
    }
    $value = getenv($key);
    return $value === false ? $default : $value;
}

/** Interpreta "1", "true", "sim", "on" como verdadeiro. */
function env_bool(string $key, bool $default = false): bool
{
    $value = env($key);
    if ($value === null || $value === '') {
        return $default;
    }
    return in_array(strtolower($value), ['1', 'true', 'sim', 'yes', 'on'], true);
}

// Permite que testes apontem para outro arquivo (.env.test) antes de incluir este arquivo.
env_load(defined('ENV_FILE') ? ENV_FILE : ROOT_PATH . '/.env');

define('APP_NAME', env('APP_NAME', 'Materiais Visuais CECAPE'));
define('APP_ENV', env('APP_ENV', 'production'));
define('APP_DEBUG', env_bool('APP_DEBUG', false));
define('BASE_URL', rtrim((string) env('BASE_URL', ''), '/'));
define('APP_VERSION', '0.0.1');

define('DB_HOST', env('DB_HOST', '127.0.0.1'));
define('DB_PORT', (int) env('DB_PORT', '3306'));
define('DB_NAME', env('DB_NAME', ''));
define('DB_USER', env('DB_USER', ''));
define('DB_PASS', env('DB_PASS', ''));

$storagePath = (string) env('STORAGE_PATH', '');
define('STORAGE_PATH', $storagePath !== '' ? rtrim($storagePath, '/') : ROOT_PATH . '/storage');
define('LOG_PATH', STORAGE_PATH . '/logs');
unset($storagePath);

define('AI_MOCK', env_bool('AI_MOCK', true));

date_default_timezone_set(env('APP_TIMEZONE', 'America/Sao_Paulo') ?: 'America/Sao_Paulo');
mb_internal_encoding('UTF-8');

// Erros: nunca na tela em produção; sempre no log.
error_reporting(E_ALL);
ini_set('display_errors', APP_DEBUG && APP_ENV !== 'production' ? '1' : '0');
ini_set('log_errors', '1');
if (is_dir(LOG_PATH) && is_writable(LOG_PATH)) {
    ini_set('error_log', LOG_PATH . '/php-error.log');
}

// Cookies de sessão seguros (valem para todas as fases). A sessão em si só é
// iniciada por quem precisar dela.
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
if (APP_ENV === 'production' || str_starts_with(BASE_URL, 'https://')) {
    ini_set('session.cookie_secure', '1');
}
