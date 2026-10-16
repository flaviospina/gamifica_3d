<?php
// app/controllers/HealthController.php
// GET /health — JSON com o estado do PHP, do banco e da pasta storage.
declare(strict_types=1);

namespace App\Controllers;

use App\Response;
use App\Services\HealthCheck;

final class HealthController
{
    public function __construct(private ?HealthCheck $check = null)
    {
    }

    public function index(): Response
    {
        $report = ($this->check ?? new HealthCheck())->run();
        $status = $report['http'];
        unset($report['http']);
        return Response::json($report, $status);
    }
}
