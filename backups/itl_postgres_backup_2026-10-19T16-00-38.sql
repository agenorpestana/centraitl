-- ====================================================================
-- ITL CLOUD CAMERA SURVEILLANCE - ENTERPRISE POSTGRESQL DATABASE BACKUP
-- Gerado em: 2026-10-19T16:00:38.957Z
-- Engine: PostgreSQL (Compatível com PostgreSQL 12+, RDS, Supabase, Cloud SQL)
-- Host: 127.0.0.1 | Banco: itl_cameras
-- ====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

BEGIN;

-- 1. Tabela: cameras
CREATE TABLE IF NOT EXISTS "cameras" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "location" VARCHAR(255),
  "status" VARCHAR(50) DEFAULT 'ONLINE',
  "rtsp_url" TEXT,
  "sub_rtsp_url" TEXT,
  "stream_key" VARCHAR(100),
  "is_recording" SMALLINT DEFAULT 1,
  "cloud_recordings_active" SMALLINT DEFAULT 1,
  "cloud_retention_days" INT DEFAULT 7,
  "record_quality" VARCHAR(20) DEFAULT '1080p',
  "record_fps" INT DEFAULT 15,
  "e2ee_enabled" SMALLINT DEFAULT 0,
  "bitrate" VARCHAR(50) DEFAULT '2048k',
  "storage_used_gb" DOUBLE PRECISION DEFAULT 0,
  "last_motion_detected" VARCHAR(100),
  "model" VARCHAR(100),
  "firmware" VARCHAR(100),
  "ip_address" VARCHAR(100),
  "ptz_support" SMALLINT DEFAULT 0,
  "audio_enabled" SMALLINT DEFAULT 0,
  "two_way_audio" SMALLINT DEFAULT 0,
  "ai_detection_types" JSONB,
  "tags" JSONB,
  "company_id" VARCHAR(64),
  "created_at" VARCHAR(100)
);

INSERT INTO "cameras" ("id", "name", "location", "status", "rtsp_url", "sub_rtsp_url", "stream_key", "is_recording", "cloud_recordings_active", "cloud_retention_days", "record_quality", "record_fps", "e2ee_enabled", "bitrate", "storage_used_gb", "last_motion_detected", "model", "firmware", "ip_address", "ptz_support", "audio_enabled", "two_way_audio", "ai_detection_types", "tags", "company_id", "created_at") VALUES (
  'cam-5218', 'Câmera Entrada Norte', 'Portão 1', 'ONLINE', 'rtsp://admin:12345@192.168.1.101:554/live', '', 'cam_285218', 1, 1, 7, '1080p Full HD', 30, 1, '2048k', 0.1, '', '', '', '', 0, 1, 1, '["MOTION"]'::jsonb, '[]'::jsonb, NULL, '2026-07-28'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "status" = EXCLUDED."status", "rtsp_url" = EXCLUDED."rtsp_url", "sub_rtsp_url" = EXCLUDED."sub_rtsp_url", "stream_key" = EXCLUDED."stream_key", "is_recording" = EXCLUDED."is_recording", "cloud_recordings_active" = EXCLUDED."cloud_recordings_active", "cloud_retention_days" = EXCLUDED."cloud_retention_days", "company_id" = EXCLUDED."company_id";
INSERT INTO "cameras" ("id", "name", "location", "status", "rtsp_url", "sub_rtsp_url", "stream_key", "is_recording", "cloud_recordings_active", "cloud_retention_days", "record_quality", "record_fps", "e2ee_enabled", "bitrate", "storage_used_gb", "last_motion_detected", "model", "firmware", "ip_address", "ptz_support", "audio_enabled", "two_way_audio", "ai_detection_types", "tags", "company_id", "created_at") VALUES (
  'cam-6291', 'Câmera Teste DB', 'Portaria Principal', 'ONLINE', 'rtsp://admin:12345@192.168.1.100:554/stream1', '', 'cam_886291', 1, 1, 7, '1080p Full HD', 30, 1, '2048k', 0.1, '', '', '', '', 0, 1, 1, '["MOTION"]'::jsonb, '[]'::jsonb, NULL, '2026-07-28'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "status" = EXCLUDED."status", "rtsp_url" = EXCLUDED."rtsp_url", "sub_rtsp_url" = EXCLUDED."sub_rtsp_url", "stream_key" = EXCLUDED."stream_key", "is_recording" = EXCLUDED."is_recording", "cloud_recordings_active" = EXCLUDED."cloud_recordings_active", "cloud_retention_days" = EXCLUDED."cloud_retention_days", "company_id" = EXCLUDED."company_id";

-- 2. Tabela: users
CREATE TABLE IF NOT EXISTS "users" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "role" VARCHAR(50) DEFAULT 'VIEWER',
  "company_id" VARCHAR(64),
  "plan_id" VARCHAR(64),
  "plan_name" VARCHAR(255),
  "monthly_fee" DOUBLE PRECISION DEFAULT 0,
  "chosen_due_day" INT DEFAULT 5,
  "financial_status" VARCHAR(50) DEFAULT 'OK',
  "days_overdue" INT DEFAULT 0,
  "last_active" VARCHAR(100) DEFAULT 'Agora',
  "created_at" VARCHAR(100) DEFAULT '2026-01-01'
);

INSERT INTO "users" ("id", "name", "email", "role", "company_id", "plan_id", "plan_name", "monthly_fee", "chosen_due_day", "financial_status", "days_overdue", "last_active", "created_at") VALUES (
  'user-superadmin-01', 'Super Admin Unity', 'suporte@unityautomacoes.com.br', 'ADMIN', NULL, NULL, '', 0, 5, 'OK', 0, 'Agora mesmo', '2026-01-01'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "role" = EXCLUDED."role", "company_id" = EXCLUDED."company_id", "plan_id" = EXCLUDED."plan_id", "plan_name" = EXCLUDED."plan_name", "monthly_fee" = EXCLUDED."monthly_fee", "financial_status" = EXCLUDED."financial_status";
INSERT INTO "users" ("id", "name", "email", "role", "company_id", "plan_id", "plan_name", "monthly_fee", "chosen_due_day", "financial_status", "days_overdue", "last_active", "created_at") VALUES (
  'user-muran3p0-ivmb', 'Carlos Gerente Atualizado', 'carlos@empresa.com.br', 'COMPANY_ADMIN', NULL, NULL, '', 0, 5, 'OK', 0, 'Nunca', '2026-10-02'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "role" = EXCLUDED."role", "company_id" = EXCLUDED."company_id", "plan_id" = EXCLUDED."plan_id", "plan_name" = EXCLUDED."plan_name", "monthly_fee" = EXCLUDED."monthly_fee", "financial_status" = EXCLUDED."financial_status";
INSERT INTO "users" ("id", "name", "email", "role", "company_id", "plan_id", "plan_name", "monthly_fee", "chosen_due_day", "financial_status", "days_overdue", "last_active", "created_at") VALUES (
  'user-murbfucm-jt2q', 'Usuario Teste Local Editado', 'testelocal@unity.com.br', 'RESIDENT', NULL, NULL, '', 0, 5, 'OK', 0, 'Nunca', '2026-10-02'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "role" = EXCLUDED."role", "company_id" = EXCLUDED."company_id", "plan_id" = EXCLUDED."plan_id", "plan_name" = EXCLUDED."plan_name", "monthly_fee" = EXCLUDED."monthly_fee", "financial_status" = EXCLUDED."financial_status";
INSERT INTO "users" ("id", "name", "email", "role", "company_id", "plan_id", "plan_name", "monthly_fee", "chosen_due_day", "financial_status", "days_overdue", "last_active", "created_at") VALUES (
  'user-murbmg2c-ay16', 'Maria Silva Editada', 'maria@provedor.com.br', 'GUARD', NULL, NULL, '', 0, 5, 'OK', 0, 'Nunca', '2026-10-02'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "role" = EXCLUDED."role", "company_id" = EXCLUDED."company_id", "plan_id" = EXCLUDED."plan_id", "plan_name" = EXCLUDED."plan_name", "monthly_fee" = EXCLUDED."monthly_fee", "financial_status" = EXCLUDED."financial_status";

-- 3. Tabela: companies
CREATE TABLE IF NOT EXISTS "companies" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "cnpj" VARCHAR(30),
  "brand_name" VARCHAR(255),
  "logo_url" TEXT,
  "primary_color" VARCHAR(50),
  "domain" VARCHAR(255),
  "custom_domain" VARCHAR(255),
  "is_active" SMALLINT DEFAULT 1,
  "created_at" VARCHAR(100)
);

INSERT INTO "companies" ("id", "name", "cnpj", "brand_name", "logo_url", "primary_color", "domain", "custom_domain", "is_active", "created_at") VALUES (
  'empresa-seguranca-sul', 'Sul Segurança & Monitoramento', '12.345.678/0001-90', 'Sul Segurança & Monitoramento', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&h=100&auto=format&fit=crop&q=80', '#38BDF8', 'monitoramento.sulsecurance.com.br', 'monitoramento.sulsecurance.com.br', 1, '2026-01-15'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "cnpj" = EXCLUDED."cnpj", "brand_name" = EXCLUDED."brand_name", "logo_url" = EXCLUDED."logo_url", "primary_color" = EXCLUDED."primary_color", "is_active" = EXCLUDED."is_active";
INSERT INTO "companies" ("id", "name", "cnpj", "brand_name", "logo_url", "primary_color", "domain", "custom_domain", "is_active", "created_at") VALUES (
  'empresa-condominio-alpha', 'Alpha Proteção Patrimonial', '98.765.432/0001-10', 'Alpha Proteção Patrimonial', 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=300&h=100&auto=format&fit=crop&q=80', '#A855F7', 'camerasaovivo.alphaprotecao.com.br', 'camerasaovivo.alphaprotecao.com.br', 1, '2026-02-01'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "cnpj" = EXCLUDED."cnpj", "brand_name" = EXCLUDED."brand_name", "logo_url" = EXCLUDED."logo_url", "primary_color" = EXCLUDED."primary_color", "is_active" = EXCLUDED."is_active";

-- 4. Tabela: cloud_recordings
CREATE TABLE IF NOT EXISTS "cloud_recordings" (
  "id" VARCHAR(64) PRIMARY KEY,
  "camera_id" VARCHAR(64),
  "camera_name" VARCHAR(255),
  "start_time" VARCHAR(100),
  "end_time" VARCHAR(100),
  "duration_sec" INT DEFAULT 0,
  "file_size_mb" DOUBLE PRECISION DEFAULT 0,
  "stream_url" TEXT,
  "thumbnail_url" TEXT,
  "is_e2ee_locked" SMALLINT DEFAULT 0,
  "tags" JSONB,
  "created_at" VARCHAR(100)
);


-- 5. Tabela: financial_plans
CREATE TABLE IF NOT EXISTS "financial_plans" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "monthly_price" DOUBLE PRECISION DEFAULT 0,
  "cameras_included" INT DEFAULT 4,
  "cloud_retention_days" INT DEFAULT 7,
  "description" TEXT,
  "popular" SMALLINT DEFAULT 0,
  "created_at" VARCHAR(100)
);

INSERT INTO "financial_plans" ("id", "name", "monthly_price", "cameras_included", "cloud_retention_days", "description", "popular", "created_at") VALUES (
  'plan-basic-49', 'Plano Residencial Essencial', 49.9, 2, 7, 'Acesso ao vivo e gravação em nuvem por 7 dias para até 2 câmeras.', 1, '2026-10-19T16:00:38.957Z'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "monthly_price" = EXCLUDED."monthly_price", "cameras_included" = EXCLUDED."cameras_included", "cloud_retention_days" = EXCLUDED."cloud_retention_days", "description" = EXCLUDED."description", "popular" = EXCLUDED."popular";
INSERT INTO "financial_plans" ("id", "name", "monthly_price", "cameras_included", "cloud_retention_days", "description", "popular", "created_at") VALUES (
  'plan-pro-89', 'Plano Comercial Pro', 89.9, 5, 15, 'Monitoramento 24h, alerta inteligente de IA e gravação de 15 dias.', 0, '2026-10-19T16:00:38.957Z'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "monthly_price" = EXCLUDED."monthly_price", "cameras_included" = EXCLUDED."cameras_included", "cloud_retention_days" = EXCLUDED."cloud_retention_days", "description" = EXCLUDED."description", "popular" = EXCLUDED."popular";
INSERT INTO "financial_plans" ("id", "name", "monthly_price", "cameras_included", "cloud_retention_days", "description", "popular", "created_at") VALUES (
  'plan-vizinhanca-149', 'Plano Vizinhança Protegida ITL', 149.9, 10, 30, 'Ideal para condomínios e bairros com gravação HD de 30 dias na nuvem.', 0, '2026-10-19T16:00:38.957Z'
) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "monthly_price" = EXCLUDED."monthly_price", "cameras_included" = EXCLUDED."cameras_included", "cloud_retention_days" = EXCLUDED."cloud_retention_days", "description" = EXCLUDED."description", "popular" = EXCLUDED."popular";

-- 6. Tabela: financial_invoices
CREATE TABLE IF NOT EXISTS "financial_invoices" (
  "id" VARCHAR(64) PRIMARY KEY,
  "user_id" VARCHAR(64),
  "user_name" VARCHAR(255),
  "user_email" VARCHAR(255),
  "plan_name" VARCHAR(255),
  "amount" DOUBLE PRECISION DEFAULT 0,
  "original_amount" DOUBLE PRECISION DEFAULT 0,
  "due_date" VARCHAR(50),
  "payment_date" VARCHAR(50),
  "status" VARCHAR(50) DEFAULT 'PENDING',
  "is_pro_rata" SMALLINT DEFAULT 0,
  "pro_rata_days" INT DEFAULT 0,
  "pix_code" TEXT,
  "pix_qr_code_url" TEXT,
  "mercado_pago_payment_id" VARCHAR(100),
  "created_at" VARCHAR(100)
);


-- 7. Tabela: whitelabel_config
CREATE TABLE IF NOT EXISTS "whitelabel_config" (
  "id" VARCHAR(64) PRIMARY KEY DEFAULT 'default',
  "system_name" VARCHAR(255),
  "portal_title" VARCHAR(255),
  "logo_url" TEXT,
  "favicon_url" TEXT,
  "primary_color" VARCHAR(50),
  "accent_color" VARCHAR(50),
  "support_email" VARCHAR(255),
  "support_phone" VARCHAR(100),
  "login_footer_text" TEXT,
  "custom_domain" VARCHAR(255),
  "is_active" SMALLINT DEFAULT 1,
  "updated_at" VARCHAR(100)
);

INSERT INTO "whitelabel_config" ("id", "system_name", "portal_title", "logo_url", "favicon_url", "primary_color", "accent_color", "support_email", "support_phone", "login_footer_text", "custom_domain", "is_active", "updated_at") VALUES (
  'default', 'CENTRAL ITL', 'CENTRAL ITL', 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300&h=100&auto=format&fit=crop&q=80', '', '#D93B58', '#F2F2F2', '', '', '', '', 1, '2026-10-19T16:00:38.957Z'
) ON CONFLICT ("id") DO UPDATE SET "system_name" = EXCLUDED."system_name", "portal_title" = EXCLUDED."portal_title", "logo_url" = EXCLUDED."logo_url", "primary_color" = EXCLUDED."primary_color", "accent_color" = EXCLUDED."accent_color", "updated_at" = EXCLUDED."updated_at";

-- 8. Tabela: backup_settings
CREATE TABLE IF NOT EXISTS "backup_settings" (
  "id" VARCHAR(64) PRIMARY KEY DEFAULT 'default',
  "schedule" VARCHAR(50),
  "destination" VARCHAR(50),
  "retention_days" INT DEFAULT 30,
  "encrypt_backups" SMALLINT DEFAULT 1,
  "auto_backup_enabled" SMALLINT DEFAULT 1,
  "last_backup_date" VARCHAR(100),
  "next_backup_date" VARCHAR(100),
  "status" VARCHAR(50),
  "storage_path" VARCHAR(255),
  "storage_limit_gb" INT DEFAULT 100
);

INSERT INTO "backup_settings" ("id", "schedule", "destination", "retention_days", "encrypt_backups", "auto_backup_enabled", "last_backup_date", "next_backup_date", "status", "storage_path", "storage_limit_gb") VALUES (
  'default', 'WEEKLY_SUNDAY_0200', 'LOCAL_VPS', 30, 1, 1, '2026-07-20 02:00:00', '2026-07-27 02:00:00', 'IDLE', '/var/www/itl-backups/', 100
) ON CONFLICT ("id") DO UPDATE SET "schedule" = EXCLUDED."schedule", "destination" = EXCLUDED."destination", "retention_days" = EXCLUDED."retention_days", "encrypt_backups" = EXCLUDED."encrypt_backups", "auto_backup_enabled" = EXCLUDED."auto_backup_enabled", "last_backup_date" = EXCLUDED."last_backup_date", "next_backup_date" = EXCLUDED."next_backup_date", "status" = EXCLUDED."status";

COMMIT;
-- ====================================================================
-- Fim do Backup PostgreSQL (2 câmeras, 4 usuários, 2 empresas, 3 planos, 0 faturas)
-- ====================================================================
