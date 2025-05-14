-- SQL script to add Password field to Customers table
ALTER TABLE "Customers" ADD COLUMN IF NOT EXISTS "Password" VARCHAR(128) NULL;
COMMENT ON COLUMN "Customers"."Password" IS 'Password for customer portal access';
