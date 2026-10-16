<?php
// app/View.php
// Renderiza arquivos de app/views/ dentro do layout. Toda variável deve ser
// escapada na view com e().
declare(strict_types=1);

namespace App;

use RuntimeException;

final class View
{
    /** @param array<string,mixed> $vars */
    public static function render(string $name, array $vars = [], ?string $layout = 'layout'): string
    {
        $content = self::file($name, $vars);
        if ($layout === null) {
            return $content;
        }
        return self::file($layout, $vars + ['content' => $content]);
    }

    /** @param array<string,mixed> $vars */
    private static function file(string $name, array $vars): string
    {
        $path = ROOT_PATH . '/app/views/' . $name . '.php';
        if (!is_file($path)) {
            throw new RuntimeException("View não encontrada: {$name}");
        }
        extract($vars, EXTR_SKIP);
        ob_start();
        try {
            include $path;
        } finally {
            $out = ob_get_clean();
        }
        return (string) $out;
    }
}
