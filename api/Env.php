<?php
namespace App;
class Env
{
    public static function load($path = null)
    {
        $path = '.env'; // ریشه پروژه

        if (!file_exists($path)) {
            throw new \RuntimeException(".env فایل یافت نشد: {$path}");
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#')) {
                continue;
            }
            if (str_contains($line, '=')) {
                [$name, $value] = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                $value = trim($value, '"\'');
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
            }
        }
    }
    public static function get(string $key, mixed $default = null): mixed
    {
        return $_ENV[$key] ?? getenv($key) ?? $default;
    }
}