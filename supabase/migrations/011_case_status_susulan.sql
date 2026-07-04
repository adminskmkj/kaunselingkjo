-- 011_case_status_susulan.sql
-- Tambah fasa Susulan dalam kitaran kes GBK.

ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'susulan';