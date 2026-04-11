-- Hibernate önce varchar(255) oluşturmuş olabilir; Flyway V3 ADD IF NOT EXISTS mevcut sütunu değiştirmez.
-- Uzun base64 kesilmeden saklanabilsin diye TEXT zorunlu.
ALTER TABLE users
  ALTER COLUMN avatar_url TYPE TEXT USING (avatar_url::text);
