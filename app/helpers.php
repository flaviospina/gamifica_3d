<?php
// app/helpers.php
// Funções globais pequenas usadas em views e controladores.
declare(strict_types=1);

/** Escapa qualquer valor para saída em HTML (sempre use nas views). */
function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
