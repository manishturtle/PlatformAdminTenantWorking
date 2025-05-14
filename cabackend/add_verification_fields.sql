-- Add email_verified and mobile_verified columns to Customers table
ALTER TABLE "Customers"
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN mobile_verified BOOLEAN DEFAULT FALSE;
