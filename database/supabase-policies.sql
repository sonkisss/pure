ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_inquiries_authenticated ON inquiries FOR SELECT USING (true);
CREATE POLICY insert_inquiries_authenticated ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY update_inquiries_authenticated ON inquiries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_inquiries_authenticated ON inquiries FOR DELETE USING (true);

CREATE POLICY select_items_authenticated ON inquiry_items FOR SELECT USING (true);
CREATE POLICY insert_items_authenticated ON inquiry_items FOR INSERT WITH CHECK (true);
CREATE POLICY update_items_authenticated ON inquiry_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_items_authenticated ON inquiry_items FOR DELETE USING (true);