<?php
// app/Database.php
// Conexão única (singleton) com o MySQL via PDO.
declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $pdo = null;

    /** Devolve a conexão compartilhada, criando-a na primeira chamada. */
    public static function get(): PDO
    {
        if (self::$pdo === null) {
            self::$pdo = self::connect([
                'host' => DB_HOST,
                'port' => DB_PORT,
                'name' => DB_NAME,
                'user' => DB_USER,
                'pass' => DB_PASS,
            ]);
        }
        return self::$pdo;
    }

    /**
     * Abre uma conexão nova com os parâmetros informados.
     * Usado pelo singleton e pelos testes (ex.: banco de teste, banco "desligado").
     *
     * @param array{host?:string,port?:int|string,name?:string,user?:string,pass?:string,timeout?:int} $p
     * @throws PDOException quando o banco está fora do ar ou as credenciais estão erradas.
     */
    public static function connect(array $p): PDO
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $p['host'] ?? '127.0.0.1',
            (int) ($p['port'] ?? 3306),
            $p['name'] ?? ''
        );
        return new PDO($dsn, $p['user'] ?? '', $p['pass'] ?? '', [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_TIMEOUT            => (int) ($p['timeout'] ?? 5),
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        ]);
    }

    /** Descarta a conexão compartilhada (usado em testes). */
    public static function reset(): void
    {
        self::$pdo = null;
    }
}
