# Inventory API Testing Guide

## Prerequisites
Before testing the inventory APIs, ensure you have:
1. A running instance of the TurtleEComm_Backend server
2. Valid JWT token for authentication
3. Access to Postman or similar API testing tool

## Step 1: Create a Category
```
POST http://localhost:8000/api/yash/products/categories/
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "name": "General",
  "slug": "general",
  "description": "General product category"
}
```

## Step 2: Create a Brand
```
POST http://localhost:8000/api/yash/products/brands/
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "name": "Test Brand",
  "slug": "test-brand",
  "description": "Test brand for products"
}
```

## Step 3: Create a Product
```
POST http://localhost:8000/api/yash/products/products/
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "name": "Test Product",
  "sku": "TP001",
  "description": "Test product for inventory management",
  "price": "100.00",
  "is_active": true,
  "category": 1
}
```

## Step 4: Create a Fulfillment Location
```
POST http://localhost:8000/api/yash/inventory/fulfillment-locations/
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "name": "Main Warehouse",
  "address": "123 Warehouse Street, Mumbai",
  "is_active": true
}
```

## Step 5: Create an Adjustment Reason
```
POST http://localhost:8000/api/yash/inventory/adjustment-reasons/
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "name": "Initial Stock",
  "description": "Initial inventory receipt",
  "adjustment_type": "ADD",
  "is_active": true
}
```

## Step 6: Create Inventory
```
POST http://localhost:8000/api/yash/inventory/inventory/
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "product": 1,
  "location": 1,
  "quantity": 0
}
```

## Step 7: Add Inventory (Key API)
```
POST http://localhost:8000/api/yash/inventory/inventory/add_inventory/
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "product_id": 1,
  "location_id": 1,
  "quantity": 100,
  "adjustment_reason_id": 1,
  "notes": "Initial inventory setup"
}
```

## Step 8: Get Inventory
```
GET http://localhost:8000/api/yash/inventory/inventory/
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Important Notes:
1. Replace `YOUR_JWT_TOKEN` with your actual JWT token
2. The IDs (1) used in the requests may need to be adjusted based on the actual IDs created in your system
3. The tenant slug 'yash' in the URLs should be replaced with your actual tenant slug if different
4. If you encounter 404 errors, double-check the URL paths and ensure the server is running
5. If you encounter permission errors, verify your JWT token is valid and has the necessary permissions
