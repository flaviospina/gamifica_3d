<?php
// app/Response.php
// Resposta HTTP montada em memória: o roteador devolve um objeto e só o
// public/index.php envia para o navegador. Isso permite testar rotas sem servidor.
declare(strict_types=1);

namespace App;

final class Response
{
    /** @param array<string,string> $headers */
    public function __construct(
        public readonly string $body,
        public readonly int $status = 200,
        public readonly array $headers = [],
    ) {
    }

    public static function html(string $body, int $status = 200): self
    {
        return new self($body, $status, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    /** Resposta JSON padronizada; `mensagem` sempre em português. */
    public static function json(array $data, int $status = 200): self
    {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        return new self($json === false ? '{}' : $json, $status, ['Content-Type' => 'application/json; charset=utf-8']);
    }

    public static function redirect(string $to, int $status = 302): self
    {
        return new self('', $status, ['Location' => $to]);
    }

    /** Decodifica o corpo como JSON (usado nos testes). */
    public function json_body(): ?array
    {
        $data = json_decode($this->body, true);
        return is_array($data) ? $data : null;
    }

    public function send(): void
    {
        http_response_code($this->status);
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }
        echo $this->body;
    }
}
