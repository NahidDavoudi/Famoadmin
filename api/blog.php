<?php
// blog.php - Blog Posts API actions
// Extracted from api.php - get_blog_posts, get_blog_post, add_blog_post, update_blog_post, delete_blog_post

function blog_get_blog_posts() {
    global $pdo;
    requireAuth();

    $stmt = $pdo->query("
        SELECT id, title, slug, category, excerpt, content, cover_image, meta_description, published_at, views, is_published
        FROM blog_posts
        ORDER BY published_at DESC
    ");
    $posts = $stmt->fetchAll();

    jsonResponse($posts);
}

function blog_get_blog_post() {
    global $pdo;
    requireAuth();

    $id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'شناسه نامعتبر'], 400);

    $stmt = $pdo->prepare("
        SELECT id, title, slug, category, excerpt, content, cover_image, meta_description, published_at, views, is_published
        FROM blog_posts
        WHERE id = ?
    ");
    $stmt->execute([$id]);
    $post = $stmt->fetch();

    if (!$post) jsonResponse(['error' => 'پست یافت نشد'], 404);

    jsonResponse($post);
}

function blog_add_blog_post() {
    global $pdo;
    requireAdmin();

    $title = trim($_POST['title'] ?? '');
    $slug = trim($_POST['slug'] ?? '');
    $category = trim($_POST['category'] ?? '');
    $excerpt = trim($_POST['excerpt'] ?? '');
    $content = trim($_POST['content'] ?? '');
    $meta_description = trim($_POST['meta_description'] ?? '');
    $is_published = isset($_POST['is_published']) ? 1 : 0;

    if (!$title || !$slug || !$category || !$content) {
        jsonResponse(['error' => 'عنوان، اسلاگ، دسته‌بندی و محتوا الزامی است'], 400);
    }

    // Check slug uniqueness
    $stmt = $pdo->prepare("SELECT id FROM blog_posts WHERE slug = ?");
    $stmt->execute([$slug]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این اسلاگ قبلاً استفاده شده است'], 400);
    }

    // Handle cover image upload
    $cover_image = null;
    if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['cover_image'];
        if ($file['size'] > MAX_BLOG_IMAGE_SIZE) {
            jsonResponse(['error' => 'حجم فایل نباید بیشتر از ۵ مگابایت باشد'], 400);
        }
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_BLOG_IMAGE_EXTENSIONS)) {
            jsonResponse(['error' => 'فرمت فایل مجاز نیست. فقط JPG, PNG, WEBP'], 400);
        }
        $filename = uniqid('blog_') . '_' . time() . '.' . $ext;
        $upload_path = BLOG_IMAGES_PATH . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
            jsonResponse(['error' => 'خطا در آپلود فایل'], 500);
        }
        $cover_image = $filename;
    }

    $stmt = $pdo->prepare("
        INSERT INTO blog_posts (title, slug, category, excerpt, content, cover_image, meta_description, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$title, $slug, $category, $excerpt, $content, $cover_image, $meta_description, $is_published]);

    jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
}

function blog_update_blog_post() {
    global $pdo;
    requireAdmin();

    $id = (int)($_POST['id'] ?? 0);
    $title = trim($_POST['title'] ?? '');
    $slug = trim($_POST['slug'] ?? '');
    $category = trim($_POST['category'] ?? '');
    $excerpt = trim($_POST['excerpt'] ?? '');
    $content = trim($_POST['content'] ?? '');
    $meta_description = trim($_POST['meta_description'] ?? '');
    $is_published = isset($_POST['is_published']) ? 1 : 0;
    $current_cover_image = trim($_POST['current_cover_image'] ?? '');

    if (!$id || !$title || !$slug || !$category || !$content) {
        jsonResponse(['error' => 'داده‌های ناقص'], 400);
    }

    // Check slug uniqueness (excluding current post)
    $stmt = $pdo->prepare("SELECT id FROM blog_posts WHERE slug = ? AND id != ?");
    $stmt->execute([$slug, $id]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این اسلاگ قبلاً استفاده شده است'], 400);
    }

    // Handle cover image upload
    $cover_image = $current_cover_image;
    if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['cover_image'];
        if ($file['size'] > MAX_BLOG_IMAGE_SIZE) {
            jsonResponse(['error' => 'حجم فایل نباید بیشتر از ۵ مگابایت باشد'], 400);
        }
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_BLOG_IMAGE_EXTENSIONS)) {
            jsonResponse(['error' => 'فرمت فایل مجاز نیست. فقط JPG, PNG, WEBP'], 400);
        }
        $filename = uniqid('blog_') . '_' . time() . '.' . $ext;
        $upload_path = BLOG_IMAGES_PATH . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
            jsonResponse(['error' => 'خطا در آپلود فایل'], 500);
        }
        // Delete old cover image if exists
        if ($current_cover_image && file_exists(BLOG_IMAGES_PATH . '/' . $current_cover_image)) {
            unlink(BLOG_IMAGES_PATH . '/' . $current_cover_image);
        }
        $cover_image = $filename;
    }

    $stmt = $pdo->prepare("
        UPDATE blog_posts
        SET title = ?, slug = ?, category = ?, excerpt = ?, content = ?, cover_image = ?, meta_description = ?, is_published = ?
        WHERE id = ?
    ");
    $stmt->execute([$title, $slug, $category, $excerpt, $content, $cover_image, $meta_description, $is_published, $id]);

    jsonResponse(['success' => true]);
}

function blog_delete_blog_post() {
    global $pdo;
    requireAdmin();

    $id = (int)($_POST['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'شناسه نامعتبر'], 400);

    // Get cover image to delete file
    $stmt = $pdo->prepare("SELECT cover_image FROM blog_posts WHERE id = ?");
    $stmt->execute([$id]);
    $post = $stmt->fetch();

    if ($post && $post['cover_image'] && file_exists(BLOG_IMAGES_PATH . '/' . $post['cover_image'])) {
        unlink(BLOG_IMAGES_PATH . '/' . $post['cover_image']);
    }

    $stmt = $pdo->prepare("DELETE FROM blog_posts WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}