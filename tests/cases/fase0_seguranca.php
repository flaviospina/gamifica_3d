<?php
// tests/cases/fase0_seguranca.php — .env e app/ fora do alcance do navegador
declare(strict_types=1);

Teste::caso('segurança: nenhum .env, .sql, .md ou .log dentro de public/', function () {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(ROOT_PATH . '/public', FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
        /** @var SplFileInfo $f */
        $nome = $f->getFilename();
        Teste::falso((bool) preg_match('/^\.env|\.(sql|md|log|env)$/i', $nome), 'Arquivo sensível em public/: ' . $f->getPathname());
    }
});

Teste::caso('segurança: public/storage é link para storage/public e não contém PHP', function () {
    $link = ROOT_PATH . '/public/storage';
    Teste::verdadeiro(is_link($link), 'public/storage deve ser um link simbólico');
    Teste::igual(realpath(ROOT_PATH . '/storage/public'), realpath($link), 'Destino do link');
    foreach (glob(ROOT_PATH . '/storage/public/*.php') ?: [] as $php) {
        throw new FalhaDeTeste('PHP em pasta pública gerada: ' . $php);
    }
});

Teste::caso('segurança: .gitignore ignora .env e arquivos gerados', function () {
    $gi = file_get_contents(ROOT_PATH . '/.gitignore');
    Teste::contem("\n.env\n", "\n" . $gi);
    Teste::contem("\n.env.test\n", "\n" . $gi);
    Teste::contem("\nstorage/*\n", "\n" . $gi);
    Teste::naoContem("\nvendor", "\n" . $gi, 'vendor/ deve ser versionado');
});

Teste::caso('segurança: nginx.conf de exemplo publica só public/ e nega arquivos sensíveis', function () {
    $conf = file_get_contents(ROOT_PATH . '/deploy/nginx.conf.example');
    Teste::verdadeiro((bool) preg_match('#^\s*root\s+\S+/public;#m', $conf), 'root deve terminar em /public');
    Teste::verdadeiro((bool) preg_match('#location\s+~\s+/\\\\\.[^{]*\{[^}]*deny\s+all#s', $conf), 'Deve negar arquivos iniciados por ponto (.env, .git)');
    Teste::verdadeiro((bool) preg_match('#location\s+~\*\s+\\\\\.\(env\|sql\|md\|log\|lock\|json\)\$[^{]*\{[^}]*deny\s+all#s', $conf), 'Deve negar .env/.sql/.md/.log/.lock/.json');
    Teste::verdadeiro((bool) preg_match('#location\s+~\*\s+\^/storage/\.\*\\\\\.php\$[^{]*\{[^}]*deny\s+all#s', $conf), 'Deve negar PHP em /storage/');
    Teste::contem('try_files $uri $uri/ /index.php?$args;', $conf);
    Teste::naoContem('listen 80', $conf, 'Só porta 443 (regra do DTI)');
});

Teste::caso('segurança: cookies de sessão HttpOnly e SameSite=Lax', function () {
    Teste::igual('1', ini_get('session.cookie_httponly'));
    Teste::igual('Lax', ini_get('session.cookie_samesite'));
    Teste::igual('1', ini_get('session.use_strict_mode'));
});
