-- Drop redundant indexes (covered by composite unique indexes)
DROP INDEX IF EXISTS "public"."idx_sales_invoices_seller_id";
DROP INDEX IF EXISTS "public"."idx_purchase_invoices_seller_id";

-- Note: The following indexes reported as unused are retained because they are Foreign Key indexes
-- or critical link indexes, and removing them would trigger "Unindexed Foreign Keys" warnings:
-- idx_customers_company_id
-- idx_contracts_created_by
-- idx_customer_credit_records_customer_id
-- idx_customer_payments_customer_id
-- idx_expenses_contract_id
-- idx_inquiry_items_inquiry_id
-- idx_purchase_invoices_created_by
-- idx_sales_invoices_created_by
-- idx_users_auth_id
-- idx_sales_invoices_buyer_id
