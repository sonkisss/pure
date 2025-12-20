-- Track uncredited sales amount at the contract level
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS uncredited_amount numeric(15, 2) NOT NULL DEFAULT 0;
