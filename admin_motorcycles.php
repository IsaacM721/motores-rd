<?php
// Admin: Makes/Models Management
// This page allows editing of all modelo (make) fields including specs
date_default_timezone_set('America/Santo_Domingo');

// Start session for authentication
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Include database connection
require_once __DIR__ . '/conexion.php';

/**
 * Helper functions for Power BI numeric field parsing
 */
function parsePriceRange($priceString) {
    if (empty($priceString)) return null;
    $clean = preg_replace('/[RD\$\s,]/', '', $priceString);
    if (preg_match('/(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/', $clean, $matches)) {
        return ['min' => (float)$matches[1], 'max' => (float)$matches[2]];
    }
    if (preg_match('/(\d+\.?\d*)/', $clean, $matches)) {
        $value = (float)$matches[1];
        return ['min' => $value, 'max' => $value];
    }
    return null;
}

function parseNumeric($string, $suffixes = []) {
    if (empty($string)) return null;
    $clean = $string;
    foreach ($suffixes as $suffix) {
        $clean = str_ireplace($suffix, '', $clean);
    }
    $clean = preg_replace('/[\s,]/', '', $clean);
    if (preg_match('/(\d+\.?\d*)/', $clean, $matches)) {
        return (float)$matches[1];
    }
    return null;
}

function slugify($text) {
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', (string)$text), '-'));
    if ($slug === '') {
        $slug = 'item-' . uniqid();
    }
    return $slug;
}

// Humanize a slug for display (e.g. "yamaha-mt-07" -> "Yamaha Mt 07")
function humanizeSlug($slug) {
    $clean = str_replace(['-', '_'], ' ', $slug);
    return ucwords($clean);
}

// Check admin or dealer access
if (!isset($_SESSION['user_id'])) {
    header('Location: ?page=login');
    exit;
}

// Allow both admin and dealer roles
$is_admin = isset($_SESSION['is_admin']) && $_SESSION['is_admin'];
$is_dealer = isset($_SESSION['role']) && $_SESSION['role'] === 'dealer';

if (!$is_admin && !$is_dealer) {
    header('Location: ?page=dashboard');
    exit;
}

// Get current view mode from session or default to user's role
if (isset($_GET['switch_view'])) {
    $_SESSION['admin_view_mode'] = $_GET['switch_view']; // 'admin' or 'dealer'
    header('Location: ?page=admin_motorcycles');
    exit;
}

$view_mode = $_SESSION['admin_view_mode'] ?? ($is_admin ? 'admin' : 'dealer');

// Enforce permissions: dealers can only use dealer view
if (!$is_admin && $view_mode === 'admin') {
    $view_mode = 'dealer';
    $_SESSION['admin_view_mode'] = 'dealer';
}

// Handle Toggle Highlight Action
if (isset($_GET['action']) && $_GET['action'] === 'toggle_highlight' && isset($_GET['make_id'])) {
    header('Content-Type: application/json');
    try {
        if ($view_mode !== 'admin') {
            throw new Exception("Solo administradores pueden destacar modelos");
        }

        $make_id = (int)$_GET['make_id'];

        // Get current highlight status and brand_id
        $stmt = $conn->prepare("SELECT is_highlighted, brand_id FROM makes WHERE id = ?");
        $stmt->execute([$make_id]);
        $make = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$make) {
            throw new Exception("Modelo no encontrado");
        }

        $new_status = $make['is_highlighted'] ? 0 : 1;

        // If setting to highlighted, check limit
        if ($new_status === 1) {
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM makes WHERE brand_id = ? AND is_highlighted = 1");
            $stmt->execute([$make['brand_id']]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result['count'] >= 3) {
                throw new Exception("Solo puedes destacar hasta 3 modelos por marca. Desmarca otro modelo primero.");
            }
        }

        // Update highlight status
        $stmt = $conn->prepare("UPDATE makes SET is_highlighted = ? WHERE id = ?");
        $stmt->execute([$new_status, $make_id]);

        echo json_encode(['success' => true, 'is_highlighted' => $new_status]);
        exit;

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// Handle CSV Export
if (isset($_GET['action']) && $_GET['action'] === 'export_csv') {
    try {
        $stmt = $conn->prepare("
            SELECT
                b.name as brand_name,
                m.name,
                m.type,
                m.engine_size,
                m.torque,
                m.fuel_capacity,
                m.cylinders,
                m.market_presence,
                m.price_range_new,
                m.price_range_used,
                m.importer,
                m.country_origin,
                m.can_import,
                m.is_highlighted,
                m.key_features,
                m.year_from,
                m.year_to
            FROM makes m
            JOIN brands b ON m.brand_id = b.id
            ORDER BY b.name ASC, m.name ASC
        ");
        $stmt->execute();
        $makes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Set headers for CSV download
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="makes_export_' . date('Y-m-d_His') . '.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        // Create output stream
        $output = fopen('php://output', 'w');

        // Write UTF-8 BOM for Excel compatibility
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

        // Write header row
        fputcsv($output, ['brand_name', 'name', 'type', 'engine_size', 'torque', 'fuel_capacity',
                         'cylinders', 'market_presence', 'price_range_new', 'price_range_used',
                         'importer', 'country_origin', 'can_import', 'is_highlighted', 'key_features', 'year_from', 'year_to'], ',', '"', '\\');

        // Write data rows
        foreach ($makes as $make) {
            fputcsv($output, $make, ',', '"', '\\');
        }

        fclose($output);
        exit;
    } catch (Exception $e) {
        die("Error al exportar CSV: " . $e->getMessage());
    }
}

// Handle SQL Backup
if (isset($_GET['action']) && $_GET['action'] === 'backup_sql') {
    try {
        if (!$is_admin) {
            throw new Exception("Solo administradores pueden crear backups SQL");
        }

        $backup_dir = __DIR__ . '/backups';
        if (!file_exists($backup_dir)) {
            mkdir($backup_dir, 0755, true);
        }

        $backup_file = $backup_dir . '/manual_backup_' . date('Y-m-d_His') . '.sql';

        // Get database credentials from connection file
        $backup_cmd = sprintf(
            'mysqldump -h %s -u %s %s %s > %s 2>&1',
            escapeshellarg($host),
            escapeshellarg($user),
            !empty($pass) ? '-p' . escapeshellarg($pass) : '',
            escapeshellarg($db),
            escapeshellarg($backup_file)
        );

        exec($backup_cmd, $output, $return_var);

        if ($return_var === 0 && file_exists($backup_file) && filesize($backup_file) >= 100) {
            // Set headers for SQL download
            header('Content-Type: application/sql; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . basename($backup_file) . '"');
            header('Content-Length: ' . filesize($backup_file));
            header('Pragma: no-cache');
            header('Expires: 0');

            readfile($backup_file);
            exit;
        } else {
            throw new Exception("Error al crear el backup SQL. Verifique que mysqldump esté instalado y los permisos sean correctos.");
        }
    } catch (Exception $e) {
        die("Error al crear backup SQL: " . $e->getMessage());
    }
}

// Handle JSON Catalog Import (brands + makes only)
if (isset($_GET['action']) && $_GET['action'] === 'import_catalog_json') {
    try {
        if (!$is_admin) {
            throw new Exception("Solo administradores pueden importar el catálogo");
        }

        $catalog_path = __DIR__ . '/database/motoresrd_catalog.json';
        if (!file_exists($catalog_path)) {
            throw new Exception("Archivo de catálogo no encontrado en database/motoresrd_catalog.json");
        }

        $catalog_json = file_get_contents($catalog_path);
        $catalog = json_decode($catalog_json, true);

        if (empty($catalog['brands']) || !is_array($catalog['brands'])) {
            throw new Exception("Catálogo inválido: no hay marcas");
        }

        $conn->beginTransaction();

        $findBrandStmt = $conn->prepare("SELECT id FROM brands WHERE slug = ? LIMIT 1");
        $insertBrandStmt = $conn->prepare("INSERT INTO brands (name, slug) VALUES (?, ?)");
        $findMakeStmt = $conn->prepare("SELECT id FROM makes WHERE brand_id = ? AND slug = ? LIMIT 1");
        $insertMakeStmt = $conn->prepare("INSERT INTO makes (brand_id, name, slug, engine_size, year_from, year_to) VALUES (?, ?, ?, ?, ?, ?)");
        $updateMakeStmt = $conn->prepare("UPDATE makes SET name = ?, engine_size = ?, year_from = ?, year_to = ? WHERE id = ?");

        $brandInserted = 0;
        $makeInserted = 0;
        $makeUpdated = 0;

        foreach ($catalog['brands'] as $brand) {
            $brandName = $brand['name'] ?? null;
            if (empty($brandName)) {
                continue;
            }

            $brandSlug = !empty($brand['slug']) ? slugify($brand['slug']) : slugify($brandName);

            // Find or create brand
            $findBrandStmt->execute([$brandSlug]);
            $brandRow = $findBrandStmt->fetch(PDO::FETCH_ASSOC);

            if ($brandRow) {
                $brandId = (int)$brandRow['id'];
            } else {
                $insertBrandStmt->execute([$brandName, $brandSlug]);
                $brandId = (int)$conn->lastInsertId();
                $brandInserted++;
            }

            if (empty($brand['models']) || !is_array($brand['models'])) {
                continue;
            }

            foreach ($brand['models'] as $model) {
                $modelName = $model['name'] ?? null;
                if (empty($modelName)) {
                    continue;
                }

                $modelSlug = !empty($model['slug']) ? slugify($model['slug']) : slugify($modelName);

                // Normalize numeric fields
                $engineSize = null;
                if (isset($model['engine_size']) && is_numeric($model['engine_size']) && (int)$model['engine_size'] > 0) {
                    $engineSize = (int)$model['engine_size'];
                }

                $yearFrom = isset($model['year_from']) && is_numeric($model['year_from']) ? (int)$model['year_from'] : null;
                $yearTo = isset($model['year_to']) && is_numeric($model['year_to']) ? (int)$model['year_to'] : null;

                // Find or create make
                $findMakeStmt->execute([$brandId, $modelSlug]);
                $makeRow = $findMakeStmt->fetch(PDO::FETCH_ASSOC);

                if ($makeRow) {
                    $updateMakeStmt->execute([
                        $modelName,
                        $engineSize,
                        $yearFrom,
                        $yearTo,
                        $makeRow['id']
                    ]);
                    $makeUpdated++;
                } else {
                    $insertMakeStmt->execute([
                        $brandId,
                        $modelName,
                        $modelSlug,
                        $engineSize,
                        $yearFrom,
                        $yearTo
                    ]);
                    $makeInserted++;
                }
            }
        }

        $conn->commit();

        $message = "Catálogo importado exitosamente. Marcas nuevas: {$brandInserted}. Modelos nuevos: {$makeInserted}. Modelos actualizados: {$makeUpdated}.";
        $message_type = "success";
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        $message = "Error al importar catálogo: " . $e->getMessage();
        $message_type = "error";
    }
}

// Handle Import From Backup SQL file
if (isset($_GET['action']) && $_GET['action'] === 'import_backup') {
    try {
        if (!$is_admin) {
            throw new Exception("Solo administradores pueden importar desde backup");
        }

        $backupFile = __DIR__ . '/backups/backup_20251025_212432.sql';
        if (!file_exists($backupFile)) {
            throw new Exception("Archivo de backup no encontrado: backups/backup_20251025_212432.sql");
        }

        $sqlContent = file_get_contents($backupFile);
        $brandsImported = 0;
        $makesImported = 0;
        $makesErrors = 0;
        
        // Map old category values to new type values
        $categoryToType = [
            'Motos' => 'motorcycle',
            'Carros' => 'car', 
            'Camiones' => 'truck',
            'Botes' => 'both',
            'Otros' => 'both'
        ];
        
        // Map old market_presence to new enum
        $presenceMap = [
            'Very Common' => 'Alta',
            'Common' => 'Media',
            'Uncommon' => 'Baja',
            'Rare' => 'Baja'
        ];
        
        // Extract brands INSERT
        if (preg_match("/INSERT INTO `brands` VALUES\s*(.+?);/s", $sqlContent, $brandsMatch)) {
            $brandsData = $brandsMatch[1];
            
            // Parse brand values - format: (id,'name','slug',logo_url,'category','created_at')
            preg_match_all("/\((\d+),'([^']*?)','([^']*?)',([^,]*?),'([^']*?)','([^']*?)'\)/", $brandsData, $matches, PREG_SET_ORDER);
            
            $brandUpsertStmt = $conn->prepare("
                INSERT INTO brands (id, name, slug, logo_url, type) 
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    name = VALUES(name),
                    slug = VALUES(slug),
                    logo_url = COALESCE(VALUES(logo_url), logo_url),
                    type = COALESCE(VALUES(type), type)
            ");
            
            foreach ($matches as $m) {
                $logoUrl = $m[4] === 'NULL' ? null : trim($m[4], "'");
                $category = $m[5] ?? 'Motos';
                $type = $categoryToType[$category] ?? 'motorcycle';
                try {
                    $brandUpsertStmt->execute([
                        (int)$m[1],
                        $m[2],
                        $m[3],
                        $logoUrl,
                        $type
                    ]);
                    $brandsImported++;
                } catch (Exception $e) {
                    // Brand may already exist with different ID, try update by slug
                    error_log("Brand import issue: " . $e->getMessage());
                }
            }
        }

        // Extract makes INSERT
        if (preg_match("/INSERT INTO `makes` VALUES\s*(.+?);/s", $sqlContent, $makesMatch)) {
            $makesData = $makesMatch[1];
            
            // Split by ),\n( to get individual records
            $records = preg_split("/\),\s*\(/", $makesData);
            
            $makeUpsertStmt = $conn->prepare("
                INSERT INTO makes (brand_id, name, slug, type, engine_size, market_presence, key_features) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    name = VALUES(name),
                    type = COALESCE(VALUES(type), type),
                    engine_size = COALESCE(VALUES(engine_size), engine_size),
                    market_presence = COALESCE(VALUES(market_presence), market_presence),
                    key_features = COALESCE(VALUES(key_features), key_features)
            ");
            
            foreach ($records as $i => $record) {
                $record = trim($record, " \t\n\r()\x0B");
                if (empty($record)) continue;
                
                try {
                    // Extract first numeric values for id and brand_id
                    preg_match("/^(\d+),(\d+),/", $record, $numericStart);
                    if (!$numericStart) continue;
                    
                    $brandId = (int)$numericStart[2];
                    
                    // Get string values in quotes
                    preg_match_all("/'([^']*?)'/", $record, $stringValues);
                    $strings = $stringValues[1] ?? [];
                    
                    if (count($strings) < 2) continue;
                    
                    $name = $strings[0] ?? '';
                    $slug = $strings[1] ?? '';
                    $typeOld = $strings[2] ?? 'Standard';
                    $marketPresenceOld = $strings[3] ?? 'Common';
                    $keyFeatures = $strings[4] ?? null;
                    
                    // Skip empty records
                    if (empty($name) && empty($slug)) continue;
                    if (empty($slug)) $slug = slugify($name);
                    if (empty($name)) $name = humanizeSlug($slug);
                    
                    // Clean up garbage data (like "4 models available...")
                    if (strpos($name, 'models available') !== false) continue;
                    if (strpos($name, 'more reviews') !== false) continue;
                    
                    // Map old type to new type enum
                    $typeMap = [
                        'Sport' => 'Sport', 'Naked' => 'Naked', 'Cruiser' => 'Cruiser',
                        'Adventure' => 'Adventure', 'Touring' => 'Touring', 'Scooter' => 'Scooter',
                        'Scrambler' => 'Classic', 'Supermoto' => 'Dual Sport', 
                        'Dirt Bike' => 'Dirt Bike', 'Standard' => 'Standard'
                    ];
                    $type = $typeMap[$typeOld] ?? 'Standard';
                    
                    // Map market presence
                    $marketPresence = $presenceMap[$marketPresenceOld] ?? 'Media';
                    
                    // Extract engine_size
                    preg_match("/^\d+,\d+,'[^']*','[^']*','[^']*',(\d+|NULL)/", $record, $engineMatch);
                    $engineSize = ($engineMatch[1] ?? 'NULL') !== 'NULL' ? (int)$engineMatch[1] : null;
                    
                    // Check if brand exists
                    $checkBrand = $conn->prepare("SELECT id FROM brands WHERE id = ?");
                    $checkBrand->execute([$brandId]);
                    if (!$checkBrand->fetch()) {
                        continue; // Skip makes with non-existent brands
                    }
                    
                    $makeUpsertStmt->execute([
                        $brandId, $name, $slug, $type, $engineSize, $marketPresence, $keyFeatures
                    ]);
                    $makesImported++;
                } catch (Exception $e) {
                    $makesErrors++;
                    if ($makesErrors <= 5) {
                        error_log("Make import error at record $i: " . $e->getMessage());
                    }
                }
            }
        }

        $message = "✅ Importación desde backup completada.<br>";
        $message .= "• Marcas procesadas: {$brandsImported}<br>";
        $message .= "• Modelos procesados: {$makesImported}<br>";
        if ($makesErrors > 0) {
            $message .= "• Errores: {$makesErrors}";
        }
        $message_type = "success";

    } catch (Exception $e) {
        $message = "Error al importar desde backup: " . $e->getMessage();
        $message_type = "error";
    }
}

// Handle Import From Images directory (brand/model slugs -> DB)
if (isset($_GET['action']) && $_GET['action'] === 'import_from_images') {
    try {
        if (!$is_admin) {
            throw new Exception("Solo administradores pueden importar desde imágenes");
        }

        $baseDir = __DIR__ . '/images/';
        if (!is_dir($baseDir)) {
            throw new Exception("Directorio de imágenes no encontrado en images/");
        }

        $conn->beginTransaction();

        $findBrandStmt = $conn->prepare("SELECT id FROM brands WHERE slug = ? LIMIT 1");
        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle existing brands
        $upsertBrandStmt = $conn->prepare("
            INSERT INTO brands (name, slug) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE slug = VALUES(slug)
        ");
        $findMakeStmt = $conn->prepare("SELECT id, available_colors FROM makes WHERE brand_id = ? AND slug = ? LIMIT 1");
        $insertMakeStmt = $conn->prepare("
            INSERT INTO makes (
                brand_id, name, slug, available_colors
            ) VALUES (?, ?, ?, ?)
        ");
        $updateMakeColorsStmt = $conn->prepare("UPDATE makes SET available_colors = ? WHERE id = ?");

        $brandCreated = 0;
        $makeCreated = 0;
        $makeUpdated = 0;
        $makeSkipped = 0;

        $brandDirs = glob($baseDir . '*', GLOB_ONLYDIR);

        foreach ($brandDirs as $brandDir) {
            $brandSlug = basename($brandDir);
            if ($brandSlug === '.' || $brandSlug === '..' || $brandSlug === '.DS_Store') {
                continue;
            }

            $findBrandStmt->execute([$brandSlug]);
            $brandRow = $findBrandStmt->fetch(PDO::FETCH_ASSOC);

            if ($brandRow) {
                $brandId = (int)$brandRow['id'];
            } else {
                $brandName = humanizeSlug($brandSlug);
                try {
                    $upsertBrandStmt->execute([$brandName, $brandSlug]);
                    $brandId = (int)$conn->lastInsertId();
                    if ($brandId > 0) {
                        $brandCreated++;
                    } else {
                        // Brand was updated, fetch its ID
                        $findBrandStmt->execute([$brandSlug]);
                        $brandRow = $findBrandStmt->fetch(PDO::FETCH_ASSOC);
                        $brandId = $brandRow ? (int)$brandRow['id'] : 0;
                    }
                } catch (Exception $e) {
                    // Try to find by name instead
                    $stmtByName = $conn->prepare("SELECT id FROM brands WHERE name = ? LIMIT 1");
                    $stmtByName->execute([$brandName]);
                    $brandRow = $stmtByName->fetch(PDO::FETCH_ASSOC);
                    $brandId = $brandRow ? (int)$brandRow['id'] : 0;
                }
                if (!$brandId) continue;
            }

            $modelDirs = glob($brandDir . '/*', GLOB_ONLYDIR);

            foreach ($modelDirs as $modelDir) {
                $modelSlug = basename($modelDir);
                if ($modelSlug === '.' || $modelSlug === '..' || $modelSlug === '.DS_Store') {
                    continue;
                }

                // Collect available colors from IMAGE FILENAMES (not subfolders)
                // Images are named like: matte-ballistic-black-metallic.jpg, pearl-glare-white.jpg
                $imageFiles = array_merge(
                    glob($modelDir . '/*.jpg') ?: [],
                    glob($modelDir . '/*.jpeg') ?: [],
                    glob($modelDir . '/*.png') ?: [],
                    glob($modelDir . '/*.webp') ?: []
                );
                
                $colors = [];
                foreach ($imageFiles as $imageFile) {
                    $filename = pathinfo($imageFile, PATHINFO_FILENAME);
                    // Skip "default" as a color name
                    if ($filename !== 'default' && $filename !== '') {
                        // Humanize the slug: "matte-ballistic-black" -> "Matte Ballistic Black"
                        $colors[] = humanizeSlug($filename);
                    }
                }
                $availableColors = !empty($colors) ? implode(', ', array_unique($colors)) : null;

                $findMakeStmt->execute([$brandId, $modelSlug]);
                $makeRow = $findMakeStmt->fetch(PDO::FETCH_ASSOC);

                if ($makeRow) {
                    // Update existing make with colors if we found new ones
                    if ($availableColors && $availableColors !== $makeRow['available_colors']) {
                        $updateMakeColorsStmt->execute([$availableColors, $makeRow['id']]);
                        $makeUpdated++;
                    } else {
                        $makeSkipped++;
                    }
                    continue;
                }

                // Insert minimal make record with brand, name, slug, and colors
                $insertMakeStmt->execute([
                    $brandId,                      // brand_id
                    humanizeSlug($modelSlug),      // name
                    $modelSlug,                    // slug
                    $availableColors               // available_colors
                ]);

                $makeCreated++;
            }
        }

        $conn->commit();

        $message = "Importación desde imágenes completada. Marcas nuevas: {$brandCreated}. Modelos nuevos: {$makeCreated}. Modelos actualizados: {$makeUpdated}. Sin cambios: {$makeSkipped}.";
        $message_type = "success";
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        $message = "Error al importar desde imágenes: " . $e->getMessage();
        $message_type = "error";
    }
}

// Handle Sync Images - Scan images folder and update makes with available colors
if (isset($_GET['action']) && $_GET['action'] === 'sync_images') {
    try {
        if (!$is_admin) {
            throw new Exception("Solo administradores pueden sincronizar imágenes");
        }

        $baseDir = __DIR__ . '/images/';
        if (!is_dir($baseDir)) {
            throw new Exception("Directorio de imágenes no encontrado en images/");
        }

        $synced = 0;
        $skipped = 0;
        $notFound = [];

        // Get all makes with their brand slug
        $stmt = $conn->prepare("
            SELECT m.id, m.slug as make_slug, m.available_colors, b.slug as brand_slug 
            FROM makes m 
            JOIN brands b ON m.brand_id = b.id
        ");
        $stmt->execute();
        $makes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $updateStmt = $conn->prepare("UPDATE makes SET available_colors = ? WHERE id = ?");

        foreach ($makes as $make) {
            $modelDir = $baseDir . $make['brand_slug'] . '/' . $make['make_slug'] . '/';
            
            if (!is_dir($modelDir)) {
                $notFound[] = $make['brand_slug'] . '/' . $make['make_slug'];
                continue;
            }

            // Collect colors from image filenames (not subfolders)
            $imageFiles = array_merge(
                glob($modelDir . '*.jpg') ?: [],
                glob($modelDir . '*.jpeg') ?: [],
                glob($modelDir . '*.png') ?: [],
                glob($modelDir . '*.webp') ?: []
            );
            
            // Also check subfolders (color folders)
            $colorFolders = glob($modelDir . '*', GLOB_ONLYDIR) ?: [];
            
            $colors = [];
            
            // Colors from filenames (direct in model folder)
            foreach ($imageFiles as $imageFile) {
                $filename = pathinfo($imageFile, PATHINFO_FILENAME);
                if ($filename !== 'default' && $filename !== '' && !is_numeric($filename)) {
                    $colors[] = humanizeSlug($filename);
                }
            }
            
            // Colors from subfolders
            foreach ($colorFolders as $colorFolder) {
                $colorName = basename($colorFolder);
                if ($colorName !== '.' && $colorName !== '..' && $colorName !== '.DS_Store') {
                    $colors[] = humanizeSlug($colorName);
                }
            }

            $availableColors = !empty($colors) ? implode(', ', array_unique($colors)) : null;

            // Update if colors changed
            if ($availableColors !== $make['available_colors']) {
                $updateStmt->execute([$availableColors, $make['id']]);
                $synced++;
            } else {
                $skipped++;
            }
        }

        $message = "✅ Sincronización de imágenes completada.<br>";
        $message .= "• Modelos actualizados: {$synced}<br>";
        $message .= "• Sin cambios: {$skipped}<br>";
        if (!empty($notFound)) {
            $message .= "• Sin carpeta de imágenes: " . count($notFound);
            if (count($notFound) <= 10) {
                $message .= " (" . implode(', ', $notFound) . ")";
            }
        }
        $message_type = "success";

    } catch (Exception $e) {
        $message = "Error al sincronizar imágenes: " . $e->getMessage();
        $message_type = "error";
    }
}

// Handle Image Upload
if (isset($_GET['action']) && $_GET['action'] === 'upload_image' && isset($_GET['make_id'])) {
    header('Content-Type: application/json');
    try {
        $make_id = (int)$_GET['make_id'];

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Error al subir la imagen");
        }

        // Get color and year from POST
        $color = isset($_POST['color']) ? trim($_POST['color']) : '';
        $year = isset($_POST['year']) ? trim($_POST['year']) : '';

        if (empty($color)) {
            throw new Exception("Debe especificar el color de la imagen");
        }

        // Sanitize color for filename and folder (remove special chars, spaces to hyphens)
        $colorSlug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $color));
        $colorSlug = trim($colorSlug, '-');

        // Get make info for folder structure
        $stmt = $conn->prepare("SELECT m.name as make_name, m.slug as make_slug, b.name as brand_name, b.slug as brand_slug FROM makes m JOIN brands b ON m.brand_id = b.id WHERE m.id = ?");
        $stmt->execute([$make_id]);
        $make = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$make) {
            throw new Exception("Modelo no encontrado");
        }

        // Create directory with color subfolder: images/brand/model/color/
        $uploadDir = __DIR__ . "/images/{$make['brand_slug']}/{$make['make_slug']}/{$colorSlug}/";
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Validate image
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($fileInfo, $_FILES['image']['tmp_name']);
        finfo_close($fileInfo);

        if (!in_array($mimeType, $allowedTypes)) {
            throw new Exception("Tipo de archivo no permitido");
        }

        // Generate SEO-friendly filename: brand-modelo-color-year-timestamp.ext
        $extension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $timestamp = time();

        // Build filename parts
        $filenameParts = [
            $make['brand_slug'],
            $make['make_slug'],
            $colorSlug
        ];

        if (!empty($year)) {
            $filenameParts[] = $year;
        }

        $filenameParts[] = $timestamp;

        $filename = implode('-', $filenameParts) . '.' . $extension;
        $uploadPath = $uploadDir . $filename;

        if (!move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
            throw new Exception("Error al guardar la imagen");
        }

        $relativePath = "images/{$make['brand_slug']}/{$make['make_slug']}/{$colorSlug}/{$filename}";

        echo json_encode([
            'success' => true,
            'path' => $relativePath,
            'filename' => $filename,
            'color' => $color,
            'colorSlug' => $colorSlug,
            'year' => $year
        ]);
        exit;

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// Handle Image Update (move to new color folder and/or rename)
if (isset($_GET['action']) && $_GET['action'] === 'update_image') {
    header('Content-Type: application/json');
    try {
        $imagePath = $_POST['image_path'] ?? '';
        $newColor = trim($_POST['color'] ?? '');
        $newYear = trim($_POST['year'] ?? '');

        if (empty($imagePath)) {
            throw new Exception("Ruta de imagen no especificada");
        }

        if (empty($newColor)) {
            throw new Exception("Debe especificar el color");
        }

        $fullPath = __DIR__ . '/' . $imagePath;

        if (!file_exists($fullPath)) {
            throw new Exception("Imagen no encontrada");
        }

        // Parse current path: images/brand/model/[color]/filename
        $pathParts = explode('/', $imagePath);
        $filename = array_pop($pathParts);
        $currentFolder = implode('/', $pathParts);

        // Get brand and model slugs from path
        $brandSlug = $pathParts[2] ?? '';
        $modelSlug = $pathParts[3] ?? '';

        if (empty($brandSlug) || empty($modelSlug)) {
            throw new Exception("Ruta de imagen inválida");
        }

        // Sanitize new color for folder
        $newColorSlug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $newColor));
        $newColorSlug = trim($newColorSlug, '-');

        // Build new path
        $newFolder = __DIR__ . "/images/{$brandSlug}/{$modelSlug}/{$newColorSlug}";

        if (!file_exists($newFolder)) {
            mkdir($newFolder, 0755, true);
        }

        // Build new filename: brand-model-color-year-timestamp.ext
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $timestamp = time();

        $filenameParts = [$brandSlug, $modelSlug, $newColorSlug];

        if (!empty($newYear)) {
            $filenameParts[] = $newYear;
        }

        $filenameParts[] = $timestamp;

        $newFilename = implode('-', $filenameParts) . '.' . $extension;
        $newPath = $newFolder . '/' . $newFilename;

        // Move/rename the file
        if (!rename($fullPath, $newPath)) {
            throw new Exception("Error al mover la imagen");
        }

        // Try to delete old folder if empty (only if it's a color subfolder)
        $oldFolder = dirname($fullPath);
        if (basename($oldFolder) !== $modelSlug) { // It's a color subfolder
            $remainingFiles = array_diff(scandir($oldFolder), ['.', '..']);
            if (empty($remainingFiles)) {
                @rmdir($oldFolder);
            }
        }

        $relativePath = "images/{$brandSlug}/{$modelSlug}/{$newColorSlug}/{$newFilename}";

        echo json_encode([
            'success' => true,
            'path' => $relativePath,
            'filename' => $newFilename,
            'color' => $newColor,
            'colorSlug' => $newColorSlug,
            'year' => $newYear
        ]);
        exit;

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// Handle Image Delete
if (isset($_GET['action']) && $_GET['action'] === 'delete_image') {
    header('Content-Type: application/json');
    try {
        $imagePath = $_POST['image_path'] ?? '';

        if (empty($imagePath)) {
            throw new Exception("Ruta de imagen no especificada");
        }

        $fullPath = __DIR__ . '/' . $imagePath;

        if (file_exists($fullPath)) {
            if (!unlink($fullPath)) {
                throw new Exception("Error al eliminar la imagen");
            }

            // Try to delete folder if empty (only if it's a color subfolder)
            $folder = dirname($fullPath);
            $pathParts = explode('/', $imagePath);
            $modelSlug = $pathParts[3] ?? '';

            if (basename($folder) !== $modelSlug) { // It's a color subfolder
                $remainingFiles = array_diff(scandir($folder), ['.', '..']);
                if (empty($remainingFiles)) {
                    @rmdir($folder);
                }
            }
        }

        echo json_encode(['success' => true]);
        exit;

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// Handle Get Images
if (isset($_GET['action']) && $_GET['action'] === 'get_images') {
    header('Content-Type: application/json');
    try {
        $brand = $_GET['brand'] ?? '';
        $make = $_GET['make'] ?? '';

        if (empty($brand) || empty($make)) {
            throw new Exception("Parámetros faltantes");
        }

        $imageDir = __DIR__ . "/images/{$brand}/{$make}/";
        $images = [];

        if (is_dir($imageDir)) {
            // First check for images in root folder (legacy)
            $files = array_merge(
                glob($imageDir . '*.jpg'),
                glob($imageDir . '*.jpeg'),
                glob($imageDir . '*.png'),
                glob($imageDir . '*.webp'),
                glob($imageDir . '*.gif')
            );

            foreach ($files as $file) {
                $relativePath = "images/{$brand}/{$make}/" . basename($file);
                $filename = basename($file);

                $images[] = [
                    'path' => $relativePath,
                    'filename' => $filename,
                    'color' => null,
                    'year' => null
                ];
            }

            // Now check for images in color subfolders
            $colorDirs = glob($imageDir . '*', GLOB_ONLYDIR);

            foreach ($colorDirs as $colorDir) {
                $colorName = basename($colorDir);

                $colorFiles = array_merge(
                    glob($colorDir . '/*.jpg'),
                    glob($colorDir . '/*.jpeg'),
                    glob($colorDir . '/*.png'),
                    glob($colorDir . '/*.webp'),
                    glob($colorDir . '/*.gif')
                );

                foreach ($colorFiles as $file) {
                    $relativePath = "images/{$brand}/{$make}/{$colorName}/" . basename($file);
                    $filename = basename($file);

                    // Parse color and year from filename: brand-model-color-year-timestamp.ext
                    // or from folder name
                    $year = null;

                    // Try to extract year from filename (look for 4-digit year pattern)
                    if (preg_match('/-(\d{4})-\d+\.[a-z]+$/i', $filename, $matches)) {
                        $year = $matches[1];
                    }

                    $images[] = [
                        'path' => $relativePath,
                        'filename' => $filename,
                        'color' => ucfirst(str_replace('-', ' ', $colorName)),
                        'colorSlug' => $colorName,
                        'year' => $year
                    ];
                }
            }
        }

        echo json_encode(['success' => true, 'images' => $images]);
        exit;

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// Handle DELETE Make
if (isset($_GET['action']) && $_GET['action'] === 'delete_make' && isset($_GET['make_id'])) {
    header('Content-Type: application/json');
    try {
        $make_id = (int)$_GET['make_id'];

        // Get make info before deleting
        $stmt = $conn->prepare("SELECT m.name, m.slug as make_slug, b.slug as brand_slug FROM makes m JOIN brands b ON m.brand_id = b.id WHERE m.id = ?");
        $stmt->execute([$make_id]);
        $make = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$make) {
            throw new Exception("Modelo no encontrado");
        }

        // Check if there are active motores (listings) for this make
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM motores WHERE make_id = ? AND status = 'active'");
        $stmt->execute([$make_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result['count'] > 0) {
            throw new Exception("No se puede eliminar este modelo porque tiene {$result['count']} motores activos asociados. Desactive o elimine los motores primero.");
        }

        // Delete the make
        $stmt = $conn->prepare("DELETE FROM makes WHERE id = ?");
        $stmt->execute([$make_id]);

        // Optionally delete images folder (commented out for safety)
        // $imageDir = __DIR__ . "/images/{$make['brand_slug']}/{$make['make_slug']}/";
        // if (is_dir($imageDir)) {
        //     // Recursive delete directory
        // }

        echo json_encode(['success' => true, 'message' => "Modelo '{$make['name']}' eliminado exitosamente"]);
        exit;

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? null;

    if ($action === 'create_make') {
        try {
            $brand_id = (int)$_POST['brand_id'];
            $name = trim($_POST['name']);

            if (empty($brand_id) || empty($name)) {
                throw new Exception("Marca y nombre son requeridos");
            }

            // Generate slug
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));

            // Check if slug already exists for this brand
            $stmt = $conn->prepare("SELECT id FROM makes WHERE brand_id = ? AND slug = ?");
            $stmt->execute([$brand_id, $slug]);
            if ($stmt->fetch()) {
                throw new Exception("Ya existe un modelo con este nombre para esta marca");
            }

            // Parse Power BI numeric fields from text inputs
            $price_new = parsePriceRange($_POST['price_range_new'] ?? '');
            $price_used = parsePriceRange($_POST['price_range_used'] ?? '');
            $torque_nm = parseNumeric($_POST['torque'] ?? '', ['Nm', 'nm', 'NM']);
            $fuel_liters = parseNumeric($_POST['fuel_capacity'] ?? '', ['L', 'l', 'Litros', 'litros']);
            $engine_cc = !empty($_POST['engine_size']) ? (int)$_POST['engine_size'] : null;
            $weight_kg = parseNumeric($_POST['weight'] ?? '', ['kg', 'KG', 'Kg']);

            // Validate admin-only fields
            $assigned_seller_id = null;
            if ($view_mode === 'admin' && !empty($_POST['assigned_seller_id'])) {
                $assigned_seller_id = (int)$_POST['assigned_seller_id'];
            }

            // Insert new make
            $stmt = $conn->prepare("
                INSERT INTO makes (
                    brand_id, name, slug, type, engine_size, torque, fuel_capacity,
                    cylinders, market_presence, price_range_new, price_range_used,
                    importer, country_origin, can_import, key_features, year_from, year_to,
                    price_new_min, price_new_max, price_used_min, price_used_max,
                    torque_nm, fuel_capacity_liters, engine_cc,
                    weight, weight_kg, seat_height, available_colors, top_speed, horsepower,
                    assigned_seller_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $brand_id,
                $name,
                $slug,
                $_POST['type'] ?: null,
                !empty($_POST['engine_size']) ? (int)$_POST['engine_size'] : null,
                $_POST['torque'] ?: null,
                $_POST['fuel_capacity'] ?: null,
                !empty($_POST['cylinders']) ? (int)$_POST['cylinders'] : null,
                $_POST['market_presence'] ?: null,
                $_POST['price_range_new'] ?: null,
                $_POST['price_range_used'] ?: null,
                $_POST['importer'] ?: null,
                $_POST['country_origin'] ?: null,
                $_POST['can_import'] ?: 'no',
                $_POST['key_features'] ?: null,
                !empty($_POST['year_from']) ? (int)$_POST['year_from'] : null,
                !empty($_POST['year_to']) ? (int)$_POST['year_to'] : null,
                $price_new ? $price_new['min'] : null,
                $price_new ? $price_new['max'] : null,
                $price_used ? $price_used['min'] : null,
                $price_used ? $price_used['max'] : null,
                $torque_nm,
                $fuel_liters,
                $engine_cc,
                $_POST['weight'] ?: null,
                $weight_kg,
                $_POST['seat_height'] ?: null,
                $_POST['available_colors'] ?: null,
                $_POST['top_speed'] ?: null,
                $_POST['horsepower'] ?: null,
                $assigned_seller_id
            ]);

            $message = "Modelo '$name' creado exitosamente.";
            $message_type = "success";
        } catch (Exception $e) {
            $message = "Error al crear modelo: " . $e->getMessage();
            $message_type = "error";
        }
    }

    if ($action === 'import_csv') {
        try {
            if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("No se pudo subir el archivo CSV");
            }

            // CREATE AUTOMATIC BACKUP BEFORE IMPORT (best-effort)
            $backup_notice = null;
            $backup_dir = __DIR__ . '/backups';
            if (!file_exists($backup_dir)) {
                mkdir($backup_dir, 0755, true);
            }

            $backup_file = $backup_dir . '/pre_import_' . date('Y-m-d_His') . '.sql';

            // Get database credentials from connection
            $backup_cmd = sprintf(
                'mysqldump -h %s -u %s %s %s > %s 2>&1',
                escapeshellarg($host),
                escapeshellarg($user),
                !empty($pass) ? '-p' . escapeshellarg($pass) : '',
                escapeshellarg($db),
                escapeshellarg($backup_file)
            );

            exec($backup_cmd, $output, $return_var);

            if ($return_var === 0 && file_exists($backup_file) && filesize($backup_file) >= 100) {
                $backup_size = filesize($backup_file);
                $backup_size_formatted = $backup_size > 1024 ? round($backup_size / 1024, 2) . ' KB' : $backup_size . ' bytes';
                $backup_notice = "✓ Backup creado: " . basename($backup_file) . " ($backup_size_formatted)<br>";
            } else {
                $backup_notice = "⚠️ Backup automático no disponible. Continuando sin backup.<br>";
            }

            $file = $_FILES['csv_file']['tmp_name'];
            $handle = fopen($file, 'r');

            if (!$handle) {
                throw new Exception("No se pudo leer el archivo CSV");
            }

            // Read header row
            $header = fgetcsv($handle);

            if (!$header) {
                throw new Exception("El archivo CSV está vacío o no tiene encabezado");
            }

            // Build header map (case-insensitive)
            $headerMap = [];
            foreach ($header as $index => $colName) {
                $key = strtolower(trim((string)$colName));
                if ($key !== '') {
                    $headerMap[$key] = $index;
                }
            }

            // Column aliases: map CSV column names to expected names
            $columnAliases = [
                'brand'               => 'brand_name',
                'model'               => 'name',
                'model_slug'          => 'slug',
                'engine_displacement' => 'engine_size',
                'max_power'           => 'horsepower',
                'max_torque'          => 'torque',
            ];
            foreach ($columnAliases as $csvCol => $expectedCol) {
                if (isset($headerMap[$csvCol]) && !isset($headerMap[$expectedCol])) {
                    $headerMap[$expectedCol] = $headerMap[$csvCol];
                }
            }

            // Minimum required columns (after aliases applied)
            $required_columns = ['brand_name', 'name'];
            foreach ($required_columns as $required) {
                if (!array_key_exists($required, $headerMap)) {
                    throw new Exception("Faltan columnas requeridas en el CSV: brand_name/brand, name/model");
                }
            }

            $imported = 0;
            $errors = [];
            $line = 2; // Start at 2 (1 is header)

            while (($data = fgetcsv($handle)) !== false) {
                try {
                    $getValue = function ($key) use ($data, $headerMap) {
                        return array_key_exists($key, $headerMap) ? ($data[$headerMap[$key]] ?? null) : null;
                    };

                    $brandName = trim((string)$getValue('brand_name'));
                    $makeName = trim((string)$getValue('name'));

                    if ($brandName === '' || $makeName === '') {
                        $errors[] = "Línea $line: brand_name y name son requeridos";
                        $line++;
                        continue;
                    }

                    // Get or create brand_id from brand_name
                    $stmt = $conn->prepare("SELECT id FROM brands WHERE name = ? LIMIT 1");
                    $stmt->execute([$brandName]);
                    $brand = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($brand) {
                        $brandId = (int)$brand['id'];
                    } else {
                        $brandSlug = slugify($brandName);
                        $stmt = $conn->prepare("INSERT INTO brands (name, slug) VALUES (?, ?)");
                        $stmt->execute([$brandName, $brandSlug]);
                        $brandId = (int)$conn->lastInsertId();
                    }

                    // Parse Power BI numeric fields from CSV data
                    $price_new = parsePriceRange($getValue('price_range_new') ?? '');
                    $price_used = parsePriceRange($getValue('price_range_used') ?? '');
                    $torque_nm = parseNumeric($getValue('torque') ?? '', ['Nm', 'nm', 'NM']);
                    $fuel_liters = parseNumeric($getValue('fuel_capacity') ?? '', ['L', 'l', 'Litros', 'litros']);
                    
                    // Parse engine_size from string like "160 cc" to integer
                    $engineRaw = $getValue('engine_size');
                    $engine_cc = $engineRaw ? (int)preg_replace('/[^0-9]/', '', $engineRaw) : null;
                    
                    // Parse available_colors (convert pipe separator to comma)
                    $availableColors = $getValue('available_colors');
                    if ($availableColors) {
                        $availableColors = str_replace(' | ', ', ', $availableColors);
                    }
                    
                    // Parse horsepower from string like "18.76 BHP"
                    $horsepower = $getValue('horsepower');
                    
                    // Get slug from CSV if provided, otherwise generate
                    $csvSlug = $getValue('slug');
                    $slug = !empty($csvSlug) ? $csvSlug : strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $makeName), '-'));

                    // Check if make already exists by slug (unique constraint is on brand_id + slug)
                    // Also check by name as fallback for updating existing records
                    $stmt = $conn->prepare("SELECT id FROM makes WHERE brand_id = ? AND (slug = ? OR name = ?)");
                    $stmt->execute([$brandId, $slug, $makeName]);
                    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($existing) {
                        // Update existing make with Power BI fields
                        $stmt = $conn->prepare("
                            UPDATE makes SET
                                type = COALESCE(?, type),
                                engine_size = COALESCE(?, engine_size),
                                torque = COALESCE(?, torque),
                                fuel_capacity = COALESCE(?, fuel_capacity),
                                cylinders = COALESCE(?, cylinders),
                                market_presence = COALESCE(?, market_presence),
                                price_range_new = COALESCE(?, price_range_new),
                                price_range_used = COALESCE(?, price_range_used),
                                importer = COALESCE(?, importer),
                                key_features = COALESCE(?, key_features),
                                year_from = COALESCE(?, year_from),
                                year_to = COALESCE(?, year_to),
                                price_new_min = COALESCE(?, price_new_min),
                                price_new_max = COALESCE(?, price_new_max),
                                price_used_min = COALESCE(?, price_used_min),
                                price_used_max = COALESCE(?, price_used_max),
                                torque_nm = COALESCE(?, torque_nm),
                                fuel_capacity_liters = COALESCE(?, fuel_capacity_liters),
                                engine_cc = COALESCE(?, engine_cc),
                                available_colors = COALESCE(?, available_colors),
                                horsepower = COALESCE(?, horsepower)
                            WHERE id = ?
                        ");

                        $stmt->execute([
                            $getValue('type') ?: null,
                            $engine_cc,
                            $getValue('torque') ?: null,
                            $getValue('fuel_capacity') ?: null,
                            !empty($getValue('cylinders')) ? (int)$getValue('cylinders') : null,
                            $getValue('market_presence') ?: null,
                            $getValue('price_range_new') ?: null,
                            $getValue('price_range_used') ?: null,
                            $getValue('importer') ?: null,
                            $getValue('key_features') ?: null,
                            !empty($getValue('year_from')) ? (int)$getValue('year_from') : null,
                            !empty($getValue('year_to')) ? (int)$getValue('year_to') : null,
                            $price_new ? $price_new['min'] : null,
                            $price_new ? $price_new['max'] : null,
                            $price_used ? $price_used['min'] : null,
                            $price_used ? $price_used['max'] : null,
                            $torque_nm,
                            $fuel_liters,
                            $engine_cc,
                            $availableColors ?: null,
                            $horsepower ?: null,
                            $existing['id']
                        ]);
                    } else {
                        // Insert new make - slug was already generated above

                        $stmt = $conn->prepare("
                            INSERT INTO makes (brand_id, name, slug, type, engine_size, torque, fuel_capacity,
                                             cylinders, market_presence, price_range_new, price_range_used,
                                             importer, key_features, year_from, year_to,
                                             price_new_min, price_new_max, price_used_min, price_used_max,
                                             torque_nm, fuel_capacity_liters, engine_cc,
                                             available_colors, horsepower)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ");

                        $stmt->execute([
                            $brandId,
                            $makeName,
                            $slug,
                            $getValue('type') ?: null,
                            $engine_cc,
                            $getValue('torque') ?: null,
                            $getValue('fuel_capacity') ?: null,
                            !empty($getValue('cylinders')) ? (int)$getValue('cylinders') : null,
                            $getValue('market_presence') ?: null,
                            $getValue('price_range_new') ?: null,
                            $getValue('price_range_used') ?: null,
                            $getValue('importer') ?: null,
                            $getValue('key_features') ?: null,
                            !empty($getValue('year_from')) ? (int)$getValue('year_from') : null,
                            !empty($getValue('year_to')) ? (int)$getValue('year_to') : null,
                            $price_new ? $price_new['min'] : null,
                            $price_new ? $price_new['max'] : null,
                            $price_used ? $price_used['min'] : null,
                            $price_used ? $price_used['max'] : null,
                            $torque_nm,
                            $fuel_liters,
                            $engine_cc,
                            $availableColors ?: null,
                            $horsepower ?: null
                        ]);
                    }

                    $imported++;
                } catch (Exception $e) {
                    $errors[] = "Línea $line: " . $e->getMessage();
                }
                $line++;
            }

            fclose($handle);

            $message = $backup_notice ?? '';
            $message .= "✓ Importación completada: $imported registros procesados.";
            if (!empty($errors)) {
                $message .= "<br><strong>Errores:</strong><br>" . implode("<br>", array_slice($errors, 0, 10));
                if (count($errors) > 10) {
                    $message .= "<br>... y " . (count($errors) - 10) . " más.";
                }
            }
            $message_type = empty($errors) ? "success" : "error";

        } catch (Exception $e) {
            $message = "Error al importar: " . $e->getMessage();
            $message_type = "error";
        }
    }

    if ($action === 'edit_make') {
        try {
            $make_id = (int)$_POST['make_id'];

            // Validate make exists
            $stmt = $conn->prepare("SELECT id FROM makes WHERE id = ?");
            $stmt->execute([$make_id]);
            if (!$stmt->fetch()) {
                throw new Exception("Make no encontrado");
            }

            // Parse Power BI numeric fields from text inputs
            $price_new = parsePriceRange($_POST['price_range_new'] ?? '');
            $price_used = parsePriceRange($_POST['price_range_used'] ?? '');
            $torque_nm = parseNumeric($_POST['torque'] ?? '', ['Nm', 'nm', 'NM']);
            $fuel_liters = parseNumeric($_POST['fuel_capacity'] ?? '', ['L', 'l', 'Litros', 'litros']);
            $engine_cc = !empty($_POST['engine_size']) ? (int)$_POST['engine_size'] : null;

            // Parse weight
            $weight_kg = parseNumeric($_POST['weight'] ?? '', ['kg', 'KG', 'Kg']);

            // Validate admin-only fields
            $assigned_seller_id = null;
            if ($view_mode === 'admin' && !empty($_POST['assigned_seller_id'])) {
                $assigned_seller_id = (int)$_POST['assigned_seller_id'];
            }

            // Update make with all fields including Power BI numeric fields + new fields
            $stmt = $conn->prepare("
                UPDATE makes SET
                    name = ?,
                    type = ?,
                    engine_size = ?,
                    torque = ?,
                    fuel_capacity = ?,
                    cylinders = ?,
                    market_presence = ?,
                    price_range_new = ?,
                    price_range_used = ?,
                    importer = ?,
                    country_origin = ?,
                    can_import = ?,
                    key_features = ?,
                    year_from = ?,
                    year_to = ?,
                    price_new_min = ?,
                    price_new_max = ?,
                    price_used_min = ?,
                    price_used_max = ?,
                    torque_nm = ?,
                    fuel_capacity_liters = ?,
                    engine_cc = ?,
                    weight = ?,
                    weight_kg = ?,
                    seat_height = ?,
                    available_colors = ?,
                    top_speed = ?,
                    horsepower = ?,
                    assigned_seller_id = ?
                WHERE id = ?
            ");

            $stmt->execute([
                $_POST['name'],
                $_POST['type'] ?: null,
                !empty($_POST['engine_size']) ? (int)$_POST['engine_size'] : null,
                $_POST['torque'] ?: null,
                $_POST['fuel_capacity'] ?: null,
                !empty($_POST['cylinders']) ? (int)$_POST['cylinders'] : null,
                $_POST['market_presence'] ?: null,
                $_POST['price_range_new'] ?: null,
                $_POST['price_range_used'] ?: null,
                $_POST['importer'] ?: null,
                $_POST['country_origin'] ?: null,
                $_POST['can_import'] ?: 'no',
                $_POST['key_features'] ?: null,
                !empty($_POST['year_from']) ? (int)$_POST['year_from'] : null,
                !empty($_POST['year_to']) ? (int)$_POST['year_to'] : null,
                $price_new ? $price_new['min'] : null,
                $price_new ? $price_new['max'] : null,
                $price_used ? $price_used['min'] : null,
                $price_used ? $price_used['max'] : null,
                $torque_nm,
                $fuel_liters,
                $engine_cc,
                $_POST['weight'] ?: null,
                $weight_kg,
                $_POST['seat_height'] ?: null,
                $_POST['available_colors'] ?: null,
                $_POST['top_speed'] ?: null,
                $_POST['horsepower'] ?: null,
                $assigned_seller_id,
                $make_id
            ]);

            $message = "Make actualizado exitosamente (incluyendo campos Power BI).";
            $message_type = "success";
        } catch (Exception $e) {
            $message = "Error al actualizar: " . $e->getMessage();
            $message_type = "error";
        }
    }
}

// Get all brands for the create form
$stmt = $conn->prepare("SELECT id, name FROM brands ORDER BY name ASC");
$stmt->execute();
$brands = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get all dealers for seller assignment (admin view only)
$dealers = [];
if ($view_mode === 'admin') {
    $stmt = $conn->prepare("SELECT id, username, full_name, business_name FROM users WHERE role = 'dealer' ORDER BY username ASC");
    $stmt->execute();
    $dealers = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Get all makes with brand info
$stmt = $conn->prepare("
    SELECT
        m.id,
        m.name as make_name,
        m.slug,
        m.type,
        m.engine_size,
        m.torque,
        m.fuel_capacity,
        m.cylinders,
        m.market_presence,
        m.price_range_new,
        m.price_range_used,
        m.importer,
        m.country_origin,
        m.can_import,
        m.is_highlighted,
        m.assigned_seller_id,
        m.key_features,
        m.year_from,
        m.year_to,
        m.weight,
        m.seat_height,
        m.available_colors,
        m.top_speed,
        m.horsepower,
        b.id as brand_id,
        b.name as brand_name,
        b.slug as brand_slug,
        u.username as seller_username,
        u.full_name as seller_name,
        COUNT(DISTINCT mot.id) as motor_count
    FROM makes m
    JOIN brands b ON m.brand_id = b.id
    LEFT JOIN users u ON m.assigned_seller_id = u.id
    LEFT JOIN motores mot ON m.id = mot.make_id AND mot.status = 'active'
    GROUP BY m.id
    ORDER BY b.name ASC, m.name ASC
");
$stmt->execute();
$makes = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Gestionar Makes/Modelos | MotoresRD</title>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
            --primary-dark: #0D0D0D;
            --primary-light: #F5F5F5;
            --accent: #FF4500;
            --shadow: rgba(0, 0, 0, 0.15);
            --success: #4CAF50;
            --error: #f44336;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background: var(--primary-light);
            color: var(--primary-dark);
        }

        .admin-header {
            background: white;
            box-shadow: 0 2px 10px var(--shadow);
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        .admin-header h1 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 2rem;
            letter-spacing: 1px;
        }

        .admin-header a {
            color: var(--primary-dark);
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s;
        }

        .admin-header a:hover {
            color: var(--accent);
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 30px 60px;
        }

        .message {
            padding: 15px 20px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-left: 4px solid;
        }

        .message.success {
            background: #e8f5e9;
            border-color: var(--success);
            color: #2e7d32;
        }

        .message.error {
            background: #ffebee;
            border-color: var(--error);
            color: #c62828;
        }

        .makes-table {
            background: white;
            border: 2px solid var(--primary-dark);
            border-collapse: collapse;
            width: 100%;
            box-shadow: 4px 4px 0 var(--primary-dark);
        }

        .makes-table th {
            background: var(--primary-dark);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 0.5px;
        }

        .makes-table td {
            padding: 15px;
            border-bottom: 1px solid #e0e0e0;
        }

        .makes-table tr:hover {
            background: #f9f9f9;
        }

        .make-brand {
            font-weight: 600;
            font-size: 0.95rem;
        }

        .make-name {
            font-size: 0.9rem;
            color: #666;
        }

        .specs-preview {
            font-size: 0.85rem;
            color: #999;
            max-width: 300px;
        }

        .motor-count {
            background: var(--accent);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            display: inline-block;
        }

        .edit-btn {
            background: var(--primary-dark);
            color: white;
            border: 2px solid var(--primary-dark);
            padding: 8px 16px;
            cursor: pointer;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            transition: all 0.3s;
            border-radius: 0;
        }

        .edit-btn:hover {
            background: var(--accent);
            border-color: var(--accent);
        }

        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            overflow-y: auto;
        }

        .modal.show {
            display: block;
        }

        .modal-content {
            background: white;
            margin: 5% auto;
            padding: 40px;
            border: 2px solid var(--primary-dark);
            width: 90%;
            max-width: 900px;
            box-shadow: 8px 8px 0 var(--primary-dark);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--primary-dark);
        }

        .modal-header h2 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 2rem;
            letter-spacing: 1px;
            margin: 0;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: var(--primary-dark);
            transition: color 0.3s;
        }

        .close-btn:hover {
            color: var(--accent);
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group.full {
            grid-column: 1 / -1;
        }

        label {
            font-weight: 600;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            color: var(--primary-dark);
        }

        input[type="text"],
        input[type="number"],
        textarea,
        select {
            padding: 12px;
            border: 2px solid #ddd;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 0.95rem;
            transition: all 0.3s;
        }

        input[type="text"]:focus,
        input[type="number"]:focus,
        textarea:focus,
        select:focus {
            outline: none;
            border-color: var(--primary-dark);
            box-shadow: 0 0 0 3px rgba(255, 69, 0, 0.1);
        }

        textarea {
            min-height: 100px;
            resize: vertical;
        }

        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid var(--primary-dark);
        }

        .btn {
            padding: 12px 30px;
            border: 2px solid;
            cursor: pointer;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s;
        }

        .btn-primary {
            background: var(--primary-dark);
            color: white;
            border-color: var(--primary-dark);
        }

        .btn-primary:hover {
            background: var(--accent);
            border-color: var(--accent);
        }

        .btn-secondary {
            background: white;
            color: var(--primary-dark);
            border-color: var(--primary-dark);
        }

        .btn-secondary:hover {
            background: var(--primary-dark);
            color: white;
        }

        .action-bar {
            background: white;
            border: 2px solid var(--primary-dark);
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 4px 4px 0 var(--primary-dark);
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }

        .action-bar h3 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.5rem;
            margin: 0;
            flex: 1;
        }

        .btn-export {
            background: var(--success);
            color: white;
            border: 2px solid var(--success);
            padding: 10px 20px;
            cursor: pointer;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-export:hover {
            background: #388E3C;
            border-color: #388E3C;
        }

        .btn-import {
            background: #2196F3;
            color: white;
            border: 2px solid #2196F3;
            padding: 10px 20px;
            cursor: pointer;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-import:hover {
            background: #1976D2;
            border-color: #1976D2;
        }

        .import-form {
            display: none;
            position: fixed;
            z-index: 999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }

        .import-form.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .import-form-content {
            background: white;
            padding: 30px;
            border: 2px solid var(--primary-dark);
            width: 90%;
            max-width: 600px;
            box-shadow: 8px 8px 0 var(--primary-dark);
        }

        .import-form-content h3 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 1.8rem;
            margin-bottom: 20px;
        }

        .file-input-wrapper {
            border: 2px dashed var(--primary-dark);
            padding: 30px;
            text-align: center;
            margin: 20px 0;
            background: #f9f9f9;
            cursor: pointer;
            transition: all 0.3s;
        }

        .file-input-wrapper:hover {
            background: #f0f0f0;
            border-color: var(--accent);
        }

        .file-input-wrapper input[type="file"] {
            display: none;
        }

        .file-input-label {
            cursor: pointer;
            display: block;
        }

        .instructions {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 0.9rem;
        }

        .instructions strong {
            display: block;
            margin-bottom: 8px;
        }

        .instructions code {
            background: rgba(0,0,0,0.05);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85rem;
        }

        @media (max-width: 768px) {
            .admin-header {
                flex-direction: column;
                gap: 15px;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .makes-table th,
            .makes-table td {
                padding: 10px;
                font-size: 0.85rem;
            }

            .specs-preview {
                display: none;
            }

            .modal-content {
                width: 95%;
                padding: 20px;
                margin: 20% auto;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="admin-header">
        <div>
            <h1>Gestionar Makes/Modelos</h1>
            <?php if ($is_admin): ?>
                <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
                    <span style="font-size: 0.9rem; color: #666;">Vista:</span>
                    <a href="?page=admin_makes&switch_view=admin"
                       class="view-switch-btn <?php echo $view_mode === 'admin' ? 'active' : ''; ?>"
                       style="padding: 6px 15px; border: 2px solid var(--primary-dark); text-decoration: none; font-size: 0.85rem; font-weight: 600; transition: all 0.3s; <?php echo $view_mode === 'admin' ? 'background: var(--primary-dark); color: white;' : 'background: white; color: var(--primary-dark);'; ?>">
                        <i class="fas fa-user-shield"></i> Admin
                    </a>
                    <a href="?page=admin_makes&switch_view=dealer"
                       class="view-switch-btn <?php echo $view_mode === 'dealer' ? 'active' : ''; ?>"
                       style="padding: 6px 15px; border: 2px solid var(--primary-dark); text-decoration: none; font-size: 0.85rem; font-weight: 600; transition: all 0.3s; <?php echo $view_mode === 'dealer' ? 'background: var(--primary-dark); color: white;' : 'background: white; color: var(--primary-dark);'; ?>">
                        <i class="fas fa-store"></i> Dealer
                    </a>
                </div>
            <?php else: ?>
                <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                    <i class="fas fa-store"></i> Vista de Dealer
                </div>
            <?php endif; ?>
        </div>
        <a href="/?page=admin"><i class="fas fa-arrow-left"></i> Volver al Admin</a>
    </div>

    <!-- Messages -->
    <div class="container">
        <?php if (isset($message)): ?>
            <div class="message <?php echo $message_type ?? 'info'; ?>">
                <?php echo $message; ?>
            </div>
        <?php endif; ?>

        <!-- Action Bar -->
        <?php if ($view_mode === 'admin'): ?>
        <div class="action-bar">
            <h3>Gestión de Datos</h3>
            <button onclick="openCreateMakeModal()" class="btn btn-primary" style="background: var(--accent); border-color: var(--accent);">
                <i class="fas fa-plus"></i> Crear Nuevo Modelo
            </button>
            <a href="/?page=admin_motorcycles&action=sync_images" class="btn-import" style="background: #07c; border-color: #07c;">
                <i class="fas fa-sync-alt"></i> Sincronizar Imágenes
            </a>
            <a href="/?page=admin_motorcycles&action=import_backup" class="btn-import" style="background: #c70; border-color: #c70;">
                <i class="fas fa-history"></i> Importar Backup SQL
            </a>
            <a href="/?page=admin_motorcycles&action=import_from_images" class="btn-import" style="background: #0b5; border-color: #0b5;">
                <i class="fas fa-folder-open"></i> Importar desde Imágenes
            </a>
            <a href="/admin/export_makes_csv.php" class="btn-export" target="_blank">
                <i class="fas fa-download"></i> Exportar CSV
            </a>
            <a href="/admin/backup_database.php" class="btn-export" style="background: #9C27B0; border-color: #9C27B0;" target="_blank">
                <i class="fas fa-database"></i> Backup SQL
            </a>
            <button onclick="showImportForm()" class="btn-import">
                <i class="fas fa-upload"></i> Importar CSV
            </button>
        </div>
        <?php else: ?>
        <div class="action-bar">
            <h3>Catálogo de Modelos</h3>
            <div style="font-size: 0.9rem; color: #666;">
                <i class="fas fa-info-circle"></i> Vista de solo lectura - Contacte al administrador para hacer cambios
            </div>
        </div>
        <?php endif; ?>

        <!-- Makes Table -->
        <table class="makes-table">
            <thead>
                <tr>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>País/Importar</th>
                    <?php if ($view_mode === 'admin'): ?>
                        <th>Vendedor</th>
                        <th>Destacado</th>
                    <?php endif; ?>
                    <th>Especificaciones</th>
                    <th>Motores</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($makes as $make): ?>
                <tr>
                    <td>
                        <div class="make-brand"><?php echo htmlspecialchars($make['brand_name']); ?></div>
                    </td>
                    <td>
                        <div class="make-name"><?php echo htmlspecialchars($make['make_name']); ?></div>
                    </td>
                    <td style="font-size: 0.85rem;">
                        <?php if ($make['country_origin']): ?>
                            <div style="margin-bottom: 5px;">
                                <i class="fas fa-globe" style="color: #2196F3;"></i>
                                <strong><?php echo htmlspecialchars($make['country_origin']); ?></strong>
                            </div>
                        <?php endif; ?>
                        <?php if ($make['can_import'] === 'yes'): ?>
                            <span style="display: inline-block; background: #4CAF50; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem;">
                                <i class="fas fa-check"></i> Se puede importar
                            </span>
                        <?php else: ?>
                            <span style="display: inline-block; background: #999; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem;">
                                <i class="fas fa-times"></i> No se importa
                            </span>
                        <?php endif; ?>
                    </td>
                    <?php if ($view_mode === 'admin'): ?>
                        <td style="font-size: 0.85rem;">
                            <?php if ($make['seller_username']): ?>
                                <i class="fas fa-user"></i>
                                <?php echo htmlspecialchars($make['seller_name'] ?: $make['seller_username']); ?>
                            <?php else: ?>
                                <em style="color: #999;">Sin asignar</em>
                            <?php endif; ?>
                        </td>
                        <td style="text-align: center;">
                            <button onclick="toggleHighlight(<?php echo $make['id']; ?>, <?php echo $make['is_highlighted'] ? 'true' : 'false'; ?>)"
                                    class="highlight-btn"
                                    data-make-id="<?php echo $make['id']; ?>"
                                    style="background: none; border: none; cursor: pointer; font-size: 1.5rem; transition: all 0.3s;"
                                    title="<?php echo $make['is_highlighted'] ? 'Click para desactivar destacado' : 'Click para destacar (máx. 3 por marca)'; ?>">
                                <i class="<?php echo $make['is_highlighted'] ? 'fas fa-star' : 'far fa-star'; ?>"
                                   style="color: <?php echo $make['is_highlighted'] ? '#FFD700' : '#ddd'; ?>;"></i>
                            </button>
                        </td>
                    <?php endif; ?>
                    <td>
                        <div class="specs-preview">
                            <?php
                            $specs = [];
                            if ($make['engine_size']) $specs[] = $make['engine_size'] . " cc";
                            if ($make['torque']) $specs[] = "Torque: " . $make['torque'];
                            if ($make['fuel_capacity']) $specs[] = "Tank: " . $make['fuel_capacity'];
                            if ($make['cylinders']) $specs[] = $make['cylinders'] . " cyl";
                            echo implode(" | ", $specs) ?: "No specs";
                            ?>
                        </div>
                    </td>
                    <td>
                        <span class="motor-count">
                            <i class="fas fa-motorcycle"></i> <?php echo $make['motor_count']; ?>
                        </span>
                    </td>
                    <td>
                        <?php if ($view_mode === 'admin'): ?>
                            <button class="edit-btn" onclick="openEditModal(<?php echo htmlspecialchars(json_encode($make)); ?>)">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="edit-btn" onclick="deleteMake(<?php echo $make['id']; ?>, '<?php echo htmlspecialchars($make['make_name'], ENT_QUOTES); ?>')"
                                    style="background: #f44336; border-color: #f44336; margin-left: 5px;">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        <?php else: ?>
                            <button class="edit-btn" onclick="viewMakeDetails(<?php echo htmlspecialchars(json_encode($make)); ?>)"
                                    style="background: #2196F3; border-color: #2196F3;">
                                <i class="fas fa-eye"></i> Ver Detalles
                            </button>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <!-- Edit Modal -->
    <div id="editModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Editar Make</h2>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <a id="viewModeloBtn" href="#" target="_blank" style="display: none; padding: 8px 16px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-size: 0.9rem; font-weight: bold;">
                        <i class="fas fa-external-link-alt"></i> Ver Modelo
                    </a>
                    <button class="close-btn" onclick="closeEditModal()">&times;</button>
                </div>
            </div>

            <form id="editForm" method="POST">
                <input type="hidden" id="formAction" name="action" value="edit_make">
                <input type="hidden" name="make_id" id="make_id">

                <div class="form-grid">
                    <!-- Brand Selection (only visible when creating) -->
                    <div class="form-group full" id="brandSelectGroup" style="display: none;">
                        <label for="brand_id">Marca *</label>
                        <select name="brand_id" id="brand_id">
                            <option value="">-- Seleccionar Marca --</option>
                            <?php foreach ($brands as $brand): ?>
                                <option value="<?php echo $brand['id']; ?>"><?php echo htmlspecialchars($brand['name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <!-- Model Name -->
                    <div class="form-group full">
                        <label for="name">Nombre del Modelo *</label>
                        <input type="text" name="name" id="name" required>
                    </div>

                    <!-- Type -->
                    <div class="form-group">
                        <label for="type">Tipo de Moto</label>
                        <select name="type" id="type">
                            <option value="">-- Seleccionar --</option>
                            <option value="Sport">Sport</option>
                            <option value="Naked">Naked</option>
                            <option value="Scooter">Scooter</option>
                            <option value="Dirt Bike">Dirt Bike</option>
                            <option value="Cruiser">Cruiser</option>
                            <option value="Touring">Touring</option>
                            <option value="Adventure">Adventure</option>
                            <option value="Standard">Standard</option>
                        </select>
                    </div>

                    <!-- Engine Size -->
                    <div class="form-group">
                        <label for="engine_size">Cilindrada (CC)</label>
                        <input type="number" name="engine_size" id="engine_size" step="1">
                    </div>

                    <!-- Torque -->
                    <div class="form-group">
                        <label for="torque">Torque (e.g., "120 Nm")</label>
                        <input type="text" name="torque" id="torque">
                    </div>

                    <!-- Fuel Capacity -->
                    <div class="form-group">
                        <label for="fuel_capacity">Capacidad Combustible (e.g., "15L")</label>
                        <input type="text" name="fuel_capacity" id="fuel_capacity">
                    </div>

                    <!-- Cylinders -->
                    <div class="form-group">
                        <label for="cylinders">Cilindros</label>
                        <input type="number" name="cylinders" id="cylinders" step="1" min="1" max="12">
                    </div>

                    <!-- Market Presence -->
                    <div class="form-group full">
                        <label for="market_presence">Disponibilidad en Mercado</label>
                        <select name="market_presence" id="market_presence">
                            <option value="">-- Seleccionar --</option>
                            <option value="Very Common">Muy Común</option>
                            <option value="Common">Común</option>
                            <option value="Uncommon">Poco Común</option>
                            <option value="Rare">Raro</option>
                        </select>
                    </div>

                    <!-- Price Ranges -->
                    <div class="form-group">
                        <label for="price_range_new">Rango Precio Nuevo</label>
                        <input type="text" name="price_range_new" id="price_range_new" placeholder="RD$ 180,000 - 220,000">
                    </div>

                    <div class="form-group">
                        <label for="price_range_used">Rango Precio Usado</label>
                        <input type="text" name="price_range_used" id="price_range_used" placeholder="RD$ 120,000 - 180,000">
                    </div>

                    <!-- Importer -->
                    <div class="form-group">
                        <label for="importer">Importador en RD</label>
                        <input type="text" name="importer" id="importer">
                    </div>

                    <!-- Country of Origin -->
                    <div class="form-group">
                        <label for="country_origin">País de Origen</label>
                        <input type="text" name="country_origin" id="country_origin" placeholder="Ej: Japón, Italia, USA">
                    </div>

                    <!-- Can Import -->
                    <div class="form-group full">
                        <label for="can_import">¿Se puede importar?</label>
                        <select name="can_import" id="can_import">
                            <option value="no">No</option>
                            <option value="yes">Sí</option>
                        </select>
                    </div>

                    <!-- Assigned Seller (Admin Only) -->
                    <?php if ($view_mode === 'admin'): ?>
                    <div class="form-group full" id="sellerAssignGroup">
                        <label for="assigned_seller_id">
                            <i class="fas fa-user-tie"></i> Asignar Vendedor (Opcional)
                        </label>
                        <select name="assigned_seller_id" id="assigned_seller_id">
                            <option value="">-- Sin Asignar --</option>
                            <?php foreach ($dealers as $dealer): ?>
                                <option value="<?php echo $dealer['id']; ?>">
                                    <?php
                                    $displayName = $dealer['business_name'] ?: $dealer['full_name'] ?: $dealer['username'];
                                    echo htmlspecialchars($displayName);
                                    ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <?php endif; ?>

                    <!-- Year Range -->
                    <div class="form-group">
                        <label for="year_from">Año Desde</label>
                        <input type="number" name="year_from" id="year_from" step="1" min="1900" max="2100">
                    </div>

                    <div class="form-group">
                        <label for="year_to">Año Hasta</label>
                        <input type="number" name="year_to" id="year_to" step="1" min="1900" max="2100">
                    </div>

                    <!-- Key Features -->
                    <div class="form-group full">
                        <label for="key_features">Características Principales</label>
                        <textarea name="key_features" id="key_features" placeholder="Describa las características principales de este modelo..."></textarea>
                    </div>

                    <!-- NEW FIELDS -->
                    <!-- Weight -->
                    <div class="form-group">
                        <label for="weight">Peso (e.g., "180 kg")</label>
                        <input type="text" name="weight" id="weight" placeholder="180 kg">
                    </div>

                    <!-- Seat Height -->
                    <div class="form-group">
                        <label for="seat_height">Altura de Asiento (e.g., "810 mm")</label>
                        <input type="text" name="seat_height" id="seat_height" placeholder="810 mm">
                    </div>

                    <!-- Top Speed -->
                    <div class="form-group">
                        <label for="top_speed">Velocidad Máxima (e.g., "180 km/h")</label>
                        <input type="text" name="top_speed" id="top_speed" placeholder="180 km/h">
                    </div>

                    <!-- Horsepower -->
                    <div class="form-group">
                        <label for="horsepower">Caballos de Fuerza (e.g., "150 HP")</label>
                        <input type="text" name="horsepower" id="horsepower" placeholder="150 HP">
                    </div>

                    <!-- Available Colors -->
                    <div class="form-group full">
                        <label for="available_colors">Colores Disponibles (separados por coma)</label>
                        <input type="text" name="available_colors" id="available_colors" placeholder="Rojo, Azul, Negro, Blanco">
                    </div>
                </div>

                <!-- IMAGE MANAGEMENT SECTION -->
                <div style="border-top: 2px solid var(--primary-dark); padding-top: 30px; margin-top: 30px;">
                    <h3 style="font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; margin-bottom: 20px;">
                        <i class="fas fa-images"></i> Gestión de Imágenes
                    </h3>

                    <!-- Upload Area -->
                    <div style="border: 2px dashed #ddd; padding: 20px; background: #f9f9f9; margin-bottom: 20px;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">
                                <i class="fas fa-palette"></i> Color de la Imagen *
                            </label>
                            <input type="text" id="imageColor" placeholder="Ej: Rojo, Azul, Negro..."
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; font-size: 0.95rem;">
                            <div id="colorSuggestions" style="margin-top: 8px; font-size: 0.85rem; color: #666;">
                                <!-- Color suggestions will appear here -->
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">
                                <i class="fas fa-calendar"></i> Año (opcional)
                            </label>
                            <input type="number" id="imageYear" placeholder="Ej: 2024" min="1900" max="2100"
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; font-size: 0.95rem;">
                        </div>

                        <input type="file" id="imageUpload" accept="image/*" style="display: none;" onchange="uploadImage()">
                        <button type="button" class="btn btn-primary" onclick="document.getElementById('imageUpload').click()" style="margin: 10px 0;">
                            <i class="fas fa-upload"></i> Seleccionar y Subir Imagen
                        </button>
                        <div style="font-size: 0.85rem; color: #666; margin-top: 10px;">
                            Formatos: JPG, PNG, WEBP, GIF | Máx: 5MB
                        </div>
                    </div>

                    <!-- Images Gallery -->
                    <div id="imagesGallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                        <!-- Images will be loaded here dynamically -->
                    </div>

                    <div id="uploadProgress" style="display: none; text-align: center; padding: 15px; background: #e3f2fd; border: 2px solid #2196F3; margin-top: 15px; border-radius: 4px;">
                        <i class="fas fa-spinner fa-spin"></i> Subiendo imagen...
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Import CSV Form -->
    <div id="importForm" class="import-form">
        <div class="import-form-content">
            <div class="modal-header">
                <h3>Importar Makes desde CSV</h3>
                <button class="close-btn" onclick="hideImportForm()">&times;</button>
            </div>

            <div class="instructions">
                <strong>🛡️ Backup Automático:</strong>
                Se creará un backup completo de la base de datos automáticamente antes de importar. El archivo se guardará en la carpeta <code>/backups</code>.
                <br><br>
                <strong>Formato del archivo CSV:</strong>
                El archivo debe incluir al menos estas columnas:<br>
                <code>brand_name, name</code>
                <br><br>
                Columnas opcionales soportadas:<br>
                <code>type, engine_size, torque, fuel_capacity, cylinders, market_presence, price_range_new, price_range_used, importer, key_features, year_from, year_to</code>
                <br><br>
                <strong>Nota:</strong> Si un modelo ya existe (mismo brand y name), será actualizado. Los modelos nuevos serán creados.
            </div>

            <form method="POST" enctype="multipart/form-data">
                <input type="hidden" name="action" value="import_csv">

                <div class="file-input-wrapper" onclick="document.getElementById('csv_file').click()">
                    <label class="file-input-label">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--primary-dark); margin-bottom: 10px;"></i>
                        <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 5px;">
                            Click para seleccionar archivo CSV
                        </div>
                        <div style="font-size: 0.9rem; color: #666;">
                            o arrastra el archivo aquí
                        </div>
                        <input type="file" name="csv_file" id="csv_file" accept=".csv" required onchange="updateFileName(this)">
                    </label>
                </div>

                <div id="selected-file" style="text-align: center; margin: 10px 0; font-weight: 600; color: var(--accent);"></div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="hideImportForm()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-upload"></i> Importar
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function showImportForm() {
            document.getElementById('importForm').classList.add('show');
        }

        function hideImportForm() {
            document.getElementById('importForm').classList.remove('show');
            document.getElementById('csv_file').value = '';
            document.getElementById('selected-file').textContent = '';
        }

        function updateFileName(input) {
            const fileName = input.files[0]?.name || '';
            document.getElementById('selected-file').textContent = fileName ? 'Archivo: ' + fileName : '';
        }

        // Close import form when clicking outside
        window.addEventListener('click', function(event) {
            const importForm = document.getElementById('importForm');
            if (event.target === importForm) {
                hideImportForm();
            }
        });

        // Global variable to store current make being edited
        let currentMakeId = null;
        let currentBrandSlug = null;
        let currentMakeSlug = null;
        let availableColors = [];

        function openEditModal(makeData) {
            // Store current make info
            currentMakeId = makeData.id;
            currentBrandSlug = makeData.brand_slug;
            currentMakeSlug = makeData.slug;

            // Set up "Ver Modelo" button with link to public modelo page
            const viewModeloBtn = document.getElementById('viewModeloBtn');
            if (currentBrandSlug && currentMakeSlug) {
                // Link to the main site's modelo page (adjust URL as needed)
                viewModeloBtn.href = `/?page=modelo&brand=${currentBrandSlug}&make=${currentMakeSlug}`;
                viewModeloBtn.style.display = 'inline-flex';
            } else {
                viewModeloBtn.style.display = 'none';
            }
            // Change modal title
            document.getElementById('modalTitle').textContent = 'Editar Make';

            // Set form action to edit
            document.getElementById('formAction').value = 'edit_make';

            // Hide brand selector (can't change brand when editing)
            document.getElementById('brandSelectGroup').style.display = 'none';

            // Show image management section
            const imageSection = document.querySelector('[style*="border-top: 2px solid var(--primary-dark)"]');
            if (imageSection) {
                imageSection.style.display = 'block';
            }

            // Set form values
            document.getElementById('make_id').value = makeData.id;
            document.getElementById('name').value = makeData.make_name;
            document.getElementById('type').value = makeData.type || '';
            document.getElementById('engine_size').value = makeData.engine_size || '';
            document.getElementById('torque').value = makeData.torque || '';
            document.getElementById('fuel_capacity').value = makeData.fuel_capacity || '';
            document.getElementById('cylinders').value = makeData.cylinders || '';
            document.getElementById('market_presence').value = makeData.market_presence || '';
            document.getElementById('price_range_new').value = makeData.price_range_new || '';
            document.getElementById('price_range_used').value = makeData.price_range_used || '';
            document.getElementById('importer').value = makeData.importer || '';
            document.getElementById('year_from').value = makeData.year_from || '';
            document.getElementById('year_to').value = makeData.year_to || '';
            document.getElementById('key_features').value = makeData.key_features || '';

            // New fields
            document.getElementById('weight').value = makeData.weight || '';
            document.getElementById('seat_height').value = makeData.seat_height || '';
            document.getElementById('top_speed').value = makeData.top_speed || '';
            document.getElementById('horsepower').value = makeData.horsepower || '';
            document.getElementById('available_colors').value = makeData.available_colors || '';

            // New admin fields (available in both views)
            document.getElementById('country_origin').value = makeData.country_origin || '';
            document.getElementById('can_import').value = makeData.can_import || 'no';

            // Seller assignment (only in admin view)
            <?php if ($view_mode === 'admin'): ?>
            const sellerField = document.getElementById('assigned_seller_id');
            if (sellerField) {
                sellerField.value = makeData.assigned_seller_id || '';
            }
            <?php endif; ?>

            // Parse available colors for suggestions
            if (makeData.available_colors) {
                availableColors = makeData.available_colors.split(',').map(c => c.trim());
                showColorSuggestions();
            } else {
                availableColors = [];
            }

            // Load images for this make
            loadMakeImages();

            document.getElementById('editModal').classList.add('show');
        }

        // Show color suggestions based on available_colors field
        function showColorSuggestions() {
            const suggestionsDiv = document.getElementById('colorSuggestions');

            if (availableColors.length > 0) {
                suggestionsDiv.innerHTML = '<strong>Colores disponibles:</strong> ' +
                    availableColors.map(color =>
                        `<span style="display: inline-block; background: #e0e0e0; padding: 4px 10px; margin: 2px; border-radius: 12px; cursor: pointer; font-size: 0.85rem;"
                               onclick="document.getElementById('imageColor').value = '${color}'">${color}</span>`
                    ).join('');
            } else {
                suggestionsDiv.innerHTML = '<em>Agregue colores en el campo "Colores Disponibles" arriba para ver sugerencias aquí.</em>';
            }
        }

        // Load existing images for the make
        function loadMakeImages() {
            const gallery = document.getElementById('imagesGallery');
            gallery.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;"><i class="fas fa-spinner fa-spin"></i> Cargando imágenes...</div>';

            // Check if images directory exists and get images
            const imagePath = `images/${currentBrandSlug}/${currentMakeSlug}/`;

            fetch(`?page=admin_motorcycles&action=get_images&brand=${currentBrandSlug}&make=${currentMakeSlug}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.images && data.images.length > 0) {
                        gallery.innerHTML = '';
                        data.images.forEach(img => {
                            addImageToGallery(img);
                        });
                    } else {
                        gallery.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No hay imágenes. Sube la primera imagen para este modelo.</div>';
                    }
                })
                .catch(err => {
                    console.error('Error loading images:', err);
                    gallery.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Sin imágenes</div>';
                });
        }

        // Add image to gallery
        function addImageToGallery(imageData) {
            const gallery = document.getElementById('imagesGallery');

            // Remove "no images" message if exists
            if (gallery.innerHTML.includes('No hay imágenes')) {
                gallery.innerHTML = '';
            }

            // Handle both old format (string) and new format (object)
            const imagePath = typeof imageData === 'string' ? imageData : imageData.path;
            const color = imageData.color || null;
            const year = imageData.year || null;
            const colorSlug = imageData.colorSlug || null;

            const imageCard = document.createElement('div');
            imageCard.style.cssText = 'position: relative; border: 2px solid #ddd; border-radius: 4px; overflow: hidden; background: #f9f9f9;';

            // Build info badges HTML
            let infoBadges = '';
            if (color) {
                infoBadges += `<span style="display: inline-block; background: var(--primary-dark); color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.75rem; margin-right: 4px;">
                    <i class="fas fa-palette"></i> ${color}
                </span>`;
            } else {
                infoBadges += `<span style="display: inline-block; background: #ff9800; color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.75rem; margin-right: 4px;">
                    <i class="fas fa-exclamation-triangle"></i> Sin color
                </span>`;
            }
            if (year) {
                infoBadges += `<span style="display: inline-block; background: var(--accent); color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.75rem;">
                    <i class="fas fa-calendar"></i> ${year}
                </span>`;
            }

            // Escape single quotes for onclick attribute
            const escapedPath = imagePath.replace(/'/g, "\\'");
            const escapedColor = (color || '').replace(/'/g, "\\'");
            const escapedYear = (year || '').replace(/'/g, "\\'");

            imageCard.innerHTML = `
                <img src="${imagePath}" alt="Model Image" style="width: 100%; height: 150px; object-fit: cover;">
                <div style="position: absolute; bottom: 5px; left: 5px; right: 70px;">${infoBadges}</div>
                <button type="button" onclick="editImageMetadata('${escapedPath}', '${escapedColor}', '${escapedYear}')"
                        style="position: absolute; top: 5px; right: 40px; background: #2196F3; color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"
                        title="Editar color y año">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" onclick="deleteImage('${escapedPath}')"
                        style="position: absolute; top: 5px; right: 5px; background: #f44336; color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"
                        title="Eliminar imagen">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            gallery.appendChild(imageCard);
        }

        // Edit image metadata (color and year)
        function editImageMetadata(imagePath, currentColor, currentYear) {
            // Create a simple prompt dialog
            const newColor = prompt('Ingrese el color de la imagen:', currentColor || '');

            if (newColor === null) {
                return; // User cancelled
            }

            if (newColor.trim() === '') {
                alert('El color no puede estar vacío');
                return;
            }

            const newYear = prompt('Ingrese el año (opcional, dejar vacío si no aplica):', currentYear || '');

            if (newYear === null) {
                return; // User cancelled
            }

            // Show progress
            const gallery = document.getElementById('imagesGallery');
            const progressDiv = document.createElement('div');
            progressDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid var(--primary-dark); box-shadow: 8px 8px 0 var(--primary-dark); z-index: 10000;';
            progressDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando imagen...';
            document.body.appendChild(progressDiv);

            const formData = new FormData();
            formData.append('image_path', imagePath);
            formData.append('color', newColor.trim());
            formData.append('year', newYear.trim());

            fetch('?page=admin_motorcycles&action=update_image', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                document.body.removeChild(progressDiv);

                if (data.success) {
                    alert(`Imagen actualizada exitosamente!\nColor: ${data.color}${data.year ? '\nAño: ' + data.year : ''}`);
                    // Reload images to reflect changes
                    loadMakeImages();
                } else {
                    alert('Error al actualizar imagen: ' + data.error);
                }
            })
            .catch(err => {
                document.body.removeChild(progressDiv);
                console.error('Update error:', err);
                alert('Error al actualizar la imagen');
            });
        }

        // Upload new image
        function uploadImage() {
            const fileInput = document.getElementById('imageUpload');
            const colorInput = document.getElementById('imageColor');
            const yearInput = document.getElementById('imageYear');
            const file = fileInput.files[0];

            if (!file) return;

            // Validate color is provided
            const color = colorInput.value.trim();
            if (!color) {
                alert('Por favor ingrese el color de la imagen antes de subir.');
                colorInput.focus();
                fileInput.value = ''; // Clear file selection
                return;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen es demasiado grande. Máximo 5MB.');
                fileInput.value = '';
                return;
            }

            // Show progress
            document.getElementById('uploadProgress').style.display = 'block';

            const formData = new FormData();
            formData.append('image', file);
            formData.append('color', color);

            const year = yearInput.value.trim();
            if (year) {
                formData.append('year', year);
            }

            fetch(`?page=admin_motorcycles&action=upload_image&make_id=${currentMakeId}`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('uploadProgress').style.display = 'none';

                if (data.success) {
                    // Add image to gallery with color and year info
                    addImageToGallery({
                        path: data.path,
                        filename: data.filename,
                        color: data.color,
                        year: data.year
                    });

                    // Clear inputs
                    fileInput.value = '';
                    colorInput.value = '';
                    yearInput.value = '';

                    // Show success message
                    alert(`Imagen subida exitosamente!\nColor: ${data.color}${data.year ? '\nAño: ' + data.year : ''}`);
                } else {
                    alert('Error al subir imagen: ' + data.error);
                }
            })
            .catch(err => {
                document.getElementById('uploadProgress').style.display = 'none';
                console.error('Upload error:', err);
                alert('Error al subir la imagen');
            });
        }

        // Delete image
        function deleteImage(imagePath) {
            if (!confirm('¿Estás seguro de eliminar esta imagen?')) {
                return;
            }

            const formData = new FormData();
            formData.append('image_path', imagePath);

            fetch(`?page=admin_motorcycles&action=delete_image`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Reload images
                    loadMakeImages();
                    alert('Imagen eliminada exitosamente!');
                } else {
                    alert('Error al eliminar imagen: ' + data.error);
                }
            })
            .catch(err => {
                console.error('Delete error:', err);
                alert('Error al eliminar la imagen');
            });
        }

        function closeEditModal() {
            document.getElementById('editModal').classList.remove('show');
        }

        // Open modal for creating new make
        function openCreateMakeModal() {
            // Reset form
            document.getElementById('editForm').reset();

            // Change modal title
            document.getElementById('modalTitle').textContent = 'Crear Nuevo Modelo';

            // Change form action to create
            document.getElementById('formAction').value = 'create_make';

            // Clear make_id (no ID for new make)
            document.getElementById('make_id').value = '';

            // Show brand selector
            document.getElementById('brandSelectGroup').style.display = 'block';

            // Hide "Ver Modelo" button for new makes
            document.getElementById('viewModeloBtn').style.display = 'none';

            // Hide image management section for new makes
            const imageSection = document.querySelector('[style*="border-top: 2px solid var(--primary-dark)"]');
            if (imageSection) {
                imageSection.style.display = 'none';
            }

            // Clear color suggestions
            availableColors = [];
            document.getElementById('colorSuggestions').innerHTML = '';

            // Open modal
            document.getElementById('editModal').classList.add('show');
        }

        // Delete make function
        function deleteMake(makeId, makeName) {
            if (!confirm(`¿Estás seguro de eliminar el modelo "${makeName}"?\n\nEsta acción no se puede deshacer.`)) {
                return;
            }

            fetch(`?page=admin_motorcycles&action=delete_make&make_id=${makeId}`, {
                method: 'GET'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message || 'Modelo eliminado exitosamente');
                    // Reload page to refresh the table
                    window.location.reload();
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(err => {
                console.error('Delete error:', err);
                alert('Error al eliminar el modelo');
            });
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('editModal');
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        }

        // View make details (read-only for dealers)
        function viewMakeDetails(makeData) {
            // Open modal in read-only mode
            openEditModal(makeData);

            // Disable all form inputs
            const form = document.getElementById('editForm');
            const inputs = form.querySelectorAll('input, select, textarea, button[type="submit"]');
            inputs.forEach(input => {
                input.disabled = true;
            });

            // Change title
            document.getElementById('modalTitle').textContent = 'Ver Detalles del Modelo (Solo Lectura)';

            // Hide form submit button
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.style.display = 'none';
            }
        }

        // Toggle highlight status (admin only)
        <?php if ($view_mode === 'admin'): ?>
        function toggleHighlight(makeId, currentStatus) {
            const button = document.querySelector(`button[data-make-id="${makeId}"]`);
            const icon = button.querySelector('i');

            // Show loading state
            icon.className = 'fas fa-spinner fa-spin';
            button.disabled = true;

            fetch(`?page=admin_motorcycles&action=toggle_highlight&make_id=${makeId}`)
                .then(response => response.json())
                .then(data => {
                    button.disabled = false;

                    if (data.success) {
                        const isHighlighted = data.is_highlighted;

                        // Update icon
                        if (isHighlighted) {
                            icon.className = 'fas fa-star';
                            icon.style.color = '#FFD700';
                            button.title = 'Click para desactivar destacado';
                        } else {
                            icon.className = 'far fa-star';
                            icon.style.color = '#ddd';
                            button.title = 'Click para destacar (máx. 3 por marca)';
                        }

                        // Show brief success message
                        const successMsg = document.createElement('div');
                        successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600;';
                        successMsg.innerHTML = isHighlighted ? '<i class="fas fa-star"></i> Modelo destacado!' : '<i class="far fa-star"></i> Destacado removido';
                        document.body.appendChild(successMsg);

                        setTimeout(() => {
                            successMsg.remove();
                        }, 2000);
                    } else {
                        // Show error
                        icon.className = currentStatus ? 'fas fa-star' : 'far fa-star';
                        icon.style.color = currentStatus ? '#FFD700' : '#ddd';

                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => {
                    button.disabled = false;
                    icon.className = currentStatus ? 'fas fa-star' : 'far fa-star';
                    icon.style.color = currentStatus ? '#FFD700' : '#ddd';

                    console.error('Toggle error:', err);
                    alert('Error al cambiar el estado de destacado');
                });
        }
        <?php endif; ?>
    </script>
</body>
</html>
