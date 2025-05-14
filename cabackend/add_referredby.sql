-- SQL script to add ReferredBy column to Customers table
ALTER TABLE "Customers" ADD COLUMN IF NOT EXISTS "ReferredBy" VARCHAR(100);
