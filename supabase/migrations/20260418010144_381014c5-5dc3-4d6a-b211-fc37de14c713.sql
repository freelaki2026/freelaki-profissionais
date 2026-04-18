-- Reset and re-trigger completion to fire realtime celebration
UPDATE contracts SET status = 'in_progress', completed_at = NULL WHERE id = 'f4f7149c-9a9a-4acc-bf0c-b4ed5838dcb1';
UPDATE contracts SET status = 'completed', completed_at = NOW() WHERE id = 'f4f7149c-9a9a-4acc-bf0c-b4ed5838dcb1';