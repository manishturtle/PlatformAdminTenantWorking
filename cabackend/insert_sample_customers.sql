-- SQL Script to insert 5 sample customer records

-- Insert sample customer 1
INSERT INTO "Customers" (
    "ClientId", "CustomerId", "FirstName", "LastName", "Email", 
    "Phone", "AadharCard", "PANCard", "Source", "CustomerType"
) VALUES (
    1, 101, 'Rahul', 'Sharma', 'rahul.sharma@example.com',
    '9876543210', '123456789012', 'ABCDE1234F', 'Referral', 'Active'
);

-- Insert sample customer 2
INSERT INTO "Customers" (
    "ClientId", "CustomerId", "FirstName", "LastName", "Email", 
    "Phone", "AadharCard", "PANCard", "Source", "CustomerType"
) VALUES (
    1, 102, 'Priya', 'Patel', 'priya.patel@example.com',
    '8765432109', '234567890123', 'BCDEF2345G', 'Google Ads', 'New'
);

-- Insert sample customer 3
INSERT INTO "Customers" (
    "ClientId", "CustomerId", "FirstName", "LastName", "Email", 
    "Phone", "AadharCard", "PANCard", "Source", "CustomerType"
) VALUES (
    1, 103, 'Amit', 'Kumar', 'amit.kumar@example.com',
    '7654321098', '345678901234', 'CDEFG3456H', 'Website', 'Lead'
);

-- Insert sample customer 4
INSERT INTO "Customers" (
    "ClientId", "CustomerId", "FirstName", "LastName", "Email", 
    "Phone", "AadharCard", "PANCard", "Source", "CustomerType"
) VALUES (
    1, 104, 'Sneha', 'Gupta', 'sneha.gupta@example.com',
    '6543210987', '456789012345', 'DEFGH4567I', 'Existing', 'Active'
);

-- Insert sample customer 5
INSERT INTO "Customers" (
    "ClientId", "CustomerId", "FirstName", "LastName", "Email", 
    "Phone", "AadharCard", "PANCard", "Source", "CustomerType"
) VALUES (
    1, 105, 'Vikram', 'Singh', 'vikram.singh@example.com',
    '5432109876', '567890123456', 'EFGHI5678J', 'Others', 'Dormant'
);
