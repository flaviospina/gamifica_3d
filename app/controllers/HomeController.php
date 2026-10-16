<?php
// app/controllers/HomeController.php
// GET / — página inicial.
declare(strict_types=1);

namespace App\Controllers;

use App\Response;
use App\View;

final class HomeController
{
    public function index(): Response
    {
        return Response::html(View::render('home', [
            'titulo' => APP_NAME,
        ]));
    }
}
