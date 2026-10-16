<?php
// app/services/HealthCheck.php
// Verifica PHP, banco e pasta storage. Devolve um relatório pronto para a rota
// /health; a fábrica de conexão pode ser trocada nos testes (banco "desligado").
declare(strict_types=1);

namespace App\Services;

use App\Database;
use Closure;
use PDO;
use Throwable;

final class HealthCheck
{
    /** Extensões PHP necessárias ao sistema (todas as fases). */
    public const REQUIRED_EXTENSIONS = ['pdo_mysql', 'mbstring', 'json', 'curl', 'gd', 'openssl', 'fileinfo'];

    private Closure $pdoFactory;
    private string $storagePath;

    public function __construct(?Closure $pdoFactory = null, ?string $storagePath = null)
    {
        $this->pdoFactory = $pdoFactory ?? static fn(): PDO => Database::get();
        $this->storagePath = $storagePath ?? STORAGE_PATH;
    }

    /**
     * @return array{status:string, http:int, hora:string, mensagem:string, php:array, banco:array, storage:array}
     */
    public function run(): array
    {
        $php = $this->checkPhp();
        $db = $this->checkDatabase();
        $storage = $this->checkStorage();

        $problemas = [];
        if (!$php['ok']) {
            $problemas[] = 'PHP sem as extensões necessárias: ' . implode(', ', $php['extensoes_faltando']) . '.';
        }
        if (!$db['ok']) {
            $problemas[] = 'Banco de dados indisponível.';
        }
        if (!$storage['ok']) {
            $problemas[] = 'Pasta de armazenamento sem permissão de escrita.';
        }
        $ok = $problemas === [];

        return [
            'status'   => $ok ? 'ok' : 'erro',
            'http'     => $ok ? 200 : 503,
            'hora'     => date('c'),
            'versao'   => APP_VERSION,
            'ambiente' => APP_ENV,
            'mensagem' => $ok ? 'Tudo certo: PHP, banco de dados e armazenamento funcionando.' : implode(' ', $problemas),
            'php'      => $php,
            'banco'    => $db,
            'storage'  => $storage,
        ];
    }

    private function checkPhp(): array
    {
        $faltando = array_values(array_filter(self::REQUIRED_EXTENSIONS, static fn(string $ext): bool => !extension_loaded($ext)));
        return [
            'ok'                  => $faltando === [] && PHP_VERSION_ID >= 80200,
            'versao'              => PHP_VERSION,
            'extensoes_faltando'  => $faltando,
            'modo_simulado_ia'    => AI_MOCK,
        ];
    }

    private function checkDatabase(): array
    {
        try {
            $pdo = ($this->pdoFactory)();
            $versao = (string) $pdo->query('SELECT VERSION()')->fetchColumn();
            $charset = (string) $pdo->query("SELECT @@character_set_database")->fetchColumn();
            return ['ok' => true, 'versao' => $versao, 'charset' => $charset, 'mensagem' => 'Conectado.'];
        } catch (Throwable $e) {
            \App\Log::error('Falha na verificação do banco (/health)', ['erro' => $e->getMessage()]);
            return [
                'ok'       => false,
                'versao'   => null,
                'charset'  => null,
                'mensagem' => 'Não foi possível conectar ao banco de dados. Verifique se o MySQL está ativo e se os dados do .env estão corretos.',
            ];
        }
    }

    private function checkStorage(): array
    {
        $gravavel = is_dir($this->storagePath) && is_writable($this->storagePath);
        if ($gravavel) {
            // Testa de fato a escrita, não só a permissão declarada.
            $probe = $this->storagePath . '/.health-' . bin2hex(random_bytes(4));
            $gravavel = @file_put_contents($probe, 'ok') !== false;
            @unlink($probe);
        }
        return [
            'ok'       => $gravavel,
            'caminho'  => $this->storagePath,
            'gravavel' => $gravavel,
            'mensagem' => $gravavel ? 'Pasta de armazenamento gravável.' : 'A pasta de armazenamento não existe ou não permite escrita.',
        ];
    }
}
