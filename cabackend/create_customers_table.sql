-- SQL Script to create the Customers table as specified

CREATE TABLE IF NOT EXISTS "Customers" (
    "CustomerID" SERIAL PRIMARY KEY,
    "ClientId" INTEGER NOT NULL DEFAULT 1,
    "CustomerId" INTEGER NOT NULL DEFAULT 1,
    "FirstName" VARCHAR(100) NOT NULL,
    "LastName" VARCHAR(100) NOT NULL,
    "Email" VARCHAR(255) NOT NULL UNIQUE,
    "Phone" VARCHAR(20) NOT NULL,
    "AadharCard" VARCHAR(16) NOT NULL UNIQUE,
    "PANCard" VARCHAR(10) NOT NULL UNIQUE,
    "Source" VARCHAR(20) NOT NULL CHECK ("Source" IN ('Existing', 'Referral', 'Google Ads', 'Website', 'Others')),
    "CustomerType" VARCHAR(20) NOT NULL CHECK ("CustomerType" IN ('Lead', 'New', 'Active', 'Dormant')),
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create a trigger to automatically update the UpdatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON "Customers"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to the table and columns for better documentation
COMMENT ON TABLE "Customers" IS 'Stores customer information for the ITR App';
COMMENT ON COLUMN "Customers"."CustomerID" IS 'Primary Key, Auto-incremented';
COMMENT ON COLUMN "Customers"."ClientId" IS 'Client ID, Default: 1';
COMMENT ON COLUMN "Customers"."CustomerId" IS 'Customer ID, Default: 1';
COMMENT ON COLUMN "Customers"."FirstName" IS 'Customer first name';
COMMENT ON COLUMN "Customers"."LastName" IS 'Customer last name';
COMMENT ON COLUMN "Customers"."Email" IS 'Customer email address, must be unique';
COMMENT ON COLUMN "Customers"."Phone" IS 'Customer phone number';
COMMENT ON COLUMN "Customers"."AadharCard" IS 'Customer Aadhar card number, must be unique';
COMMENT ON COLUMN "Customers"."PANCard" IS 'Customer PAN card number, must be unique';
COMMENT ON COLUMN "Customers"."Source" IS 'Source of the customer: Existing, Referral, Google Ads, Website, Others';
COMMENT ON COLUMN "Customers"."CustomerType" IS 'Type of customer: Lead, New, Active, Dormant';
COMMENT ON COLUMN "Customers"."CreatedAt" IS 'Timestamp when the record was created';
COMMENT ON COLUMN "Customers"."UpdatedAt" IS 'Timestamp when the record was last updated';
