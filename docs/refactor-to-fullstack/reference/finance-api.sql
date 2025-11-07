
-- ----------------------------
-- Table structure for accounts
-- ----------------------------
DROP TABLE IF EXISTS "public"."accounts";
CREATE TABLE "public"."accounts" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "personal_id" int8 NOT NULL,
  "name" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "icon" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "active" bool NOT NULL,
  "usability" varchar(32) COLLATE "pg_catalog"."default" NOT NULL,
  "account_type" varchar(32) COLLATE "pg_catalog"."default" NOT NULL,
  "color" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "initial_amount" float8,
  "group_id" varchar(36) COLLATE "pg_catalog"."default",
  "position" json,
  "created_at" date NOT NULL,
  "created_by" varchar(64) COLLATE "pg_catalog"."default",
  "updated_at" date,
  "updated_by" varchar(64) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of accounts
-- ----------------------------
INSERT INTO "public"."accounts" VALUES ('b5254f61-ad34-4856-bd7b-9eaa44298a60', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 1, 'Cash Eko', 'FaMoneyBillWave', 't', 'USABLE', 'Cash', '#047857', 0, NULL, NULL, '0001-01-01', NULL, '2025-11-01', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979');
INSERT INTO "public"."accounts" VALUES ('0618245a-7783-47fa-9691-73d331a87532', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 2, 'Saldo Pulsa', 'FaMobileAlt', 't', 'USABLE', 'General', '#0284c7', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('08b15c70-39c2-4d6f-b385-9fd5b9d90ac1', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 3, 'CIMB Syariah', 'FaUniversity', 't', 'USABLE', 'Checking account', '#b91c1c', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('d754b19d-208a-4e7a-a6de-98b46d04e52b', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 4, 'OVO Eko', 'FaWallet', 't', 'USABLE', 'General', '#7c3aed', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('f3fc8342-539f-4eb4-886b-d9017fc769c9', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 5, 'Shopee Pay Eko', 'FaStore', 't', 'USABLE', 'General', '#ea580c', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('a3dba572-ceca-4060-bed2-21f4f4d91aff', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 6, 'Saldo Tokped', 'FaShoppingCart', 't', 'USABLE', 'General', '#16a34a', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('f9003b8f-cfdd-492d-a22f-4352030b0857', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 7, 'Gopay', 'FaWallet', 't', 'USABLE', 'General', '#0ea5e9', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('977587a3-f950-440b-b1f3-4f0c925e8d1b', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 8, 'DANA', 'FaPiggyBank', 't', 'USABLE', 'General', '#2563eb', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('45308f7f-cb55-4406-929a-976ae5557c7c', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 9, 'BCA', 'FaUniversity', 't', 'USABLE', 'Checking account', '#1d4ed8', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('90e1646d-ae32-4b47-a279-354a62f38363', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 10, 'Cash Dewi', 'FaMoneyBillWave', 't', 'USABLE', 'Cash', '#be123c', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('0a9b9a81-4c83-4ecd-b4d8-ada9c0f1e9cc', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 11, 'Savings Jar (Archived)', 'FaPiggyBank', 'f', 'USABLE', 'General', '#7c3aed', NULL, NULL, NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL);
INSERT INTO "public"."accounts" VALUES ('7173bf1c-e9ec-4b7f-bc59-554082a5fd5d', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 13, 'Test Initial Amount', 'FaWallet', 't', 'USABLE', 'Cash', '#ce9600', 120000.123, NULL, NULL, '2025-11-01', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-11-01', NULL);

-- ----------------------------
-- Table structure for categories
-- ----------------------------
DROP TABLE IF EXISTS "public"."categories";
CREATE TABLE "public"."categories" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "personal_id" int8 NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "parent_id" varchar(36) COLLATE "pg_catalog"."default",
  "name" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "icon" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "nature" varchar(8) COLLATE "pg_catalog"."default" NOT NULL,
  "is_active" bool NOT NULL,
  "position" json,
  "created_at" date NOT NULL,
  "created_by" varchar(64) COLLATE "pg_catalog"."default",
  "updated_at" date,
  "updated_by" varchar(64) COLLATE "pg_catalog"."default",
  "color" varchar(36) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of categories
-- ----------------------------
INSERT INTO "public"."categories" VALUES ('1a64c526-b949-4db2-9a09-126aead9f89e', 27, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Transportation', 'FaBus', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('637e4bcf-b129-4819-80a4-e8b4f0475c2c', 28, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1a64c526-b949-4db2-9a09-126aead9f89e', 'Transportation', 'FaBus', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('f7ed4d85-48a9-4572-9fef-25315b58c284', 29, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1a64c526-b949-4db2-9a09-126aead9f89e', 'Business trips', 'FaSuitcase', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('01b547c1-0c17-4316-b8ba-f2725dca009a', 30, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1a64c526-b949-4db2-9a09-126aead9f89e', 'Long distance', 'FaPlane', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('29251481-7042-4e63-a108-b2a1f1c8f56d', 31, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1a64c526-b949-4db2-9a09-126aead9f89e', 'Public transport', 'FaTrain', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('548cb62e-3dc9-4d80-b02f-a97ecf76e754', 32, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1a64c526-b949-4db2-9a09-126aead9f89e', 'Taxi', 'FaTaxi', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('65409875-ab3b-4ded-a964-c6c914fae23e', 33, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Vehicle', 'FaCar', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('0b318849-8fc6-46fd-9337-89aac0634a01', 34, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '65409875-ab3b-4ded-a964-c6c914fae23e', 'Vehicle', 'FaCar', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('5851b35f-56bd-45ae-80ed-cc51bd6fbf21', 35, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '65409875-ab3b-4ded-a964-c6c914fae23e', 'Fuel', 'FaGasPump', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('ff74780a-e2a1-411d-b67c-dc51e2546e0d', 36, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '65409875-ab3b-4ded-a964-c6c914fae23e', 'Leasing', 'FaMoneyBillWave', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('d044cf09-8850-46aa-bad1-98297095d9e9', 37, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '65409875-ab3b-4ded-a964-c6c914fae23e', 'Parking', 'FaParking', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('4a7ef849-6397-41ad-a060-8d63a303f391', 38, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '65409875-ab3b-4ded-a964-c6c914fae23e', 'Rentals', 'FaCar', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('4e8d2f88-d7bf-43eb-99ed-352064697e59', 39, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '65409875-ab3b-4ded-a964-c6c914fae23e', 'Vehicle insurance', 'FaShieldAlt', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('80de1085-02fd-4c17-89e1-1219e2504ec6', 40, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '65409875-ab3b-4ded-a964-c6c914fae23e', 'Vehicle maintenance', 'FaWrench', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('f3a3ae04-1790-4200-b35f-75ae19552ae5', 23, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '49d02bc8-82a1-4902-b7eb-9d0bc63d1134', 'Mortgage', 'FaFileInvoiceDollar', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#997d7d');
INSERT INTO "public"."categories" VALUES ('5b63bf15-b698-4e5f-a3d6-022c85457a15', 24, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '49d02bc8-82a1-4902-b7eb-9d0bc63d1134', 'Property insurance', 'FaShieldAlt', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#997d7d');
INSERT INTO "public"."categories" VALUES ('d61eb436-ac41-4cdc-8f11-762c3d9f303e', 25, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '49d02bc8-82a1-4902-b7eb-9d0bc63d1134', 'Rent', 'FaKey', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#997d7d');
INSERT INTO "public"."categories" VALUES ('5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 6, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Shopping', 'FaShoppingBag', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('49d02bc8-82a1-4902-b7eb-9d0bc63d1134', 19, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Housing', 'FaHome', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#997d7d');
INSERT INTO "public"."categories" VALUES ('e95889a0-0d55-412d-ab1b-99842cb62a3f', 20, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '49d02bc8-82a1-4902-b7eb-9d0bc63d1134', 'Housing', 'FaHome', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#997d7d');
INSERT INTO "public"."categories" VALUES ('1fd969b9-8a4b-4445-8105-358ea8034390', 21, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '49d02bc8-82a1-4902-b7eb-9d0bc63d1134', 'Energy, utilities', 'FaBolt', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#997d7d');
INSERT INTO "public"."categories" VALUES ('ffdef188-e219-4486-ac3f-d833de0dab7e', 22, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '49d02bc8-82a1-4902-b7eb-9d0bc63d1134', 'Maintenance, repairs', 'FaTools', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#997d7d');
INSERT INTO "public"."categories" VALUES ('14ce52c3-25e1-4ff7-9ac7-ec275f3c8086', 26, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '49d02bc8-82a1-4902-b7eb-9d0bc63d1134', 'Services', 'FaCogs', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#997d7d');
INSERT INTO "public"."categories" VALUES ('9cf34f43-38df-441e-b683-0815e6966f5f', 41, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Life & entertainment', 'FaSmileBeam', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('15cb1a70-b54f-4046-970b-4baa569f79b7', 42, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Life & entertainment', 'FaSmileBeam', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('6e346498-beea-498d-8656-c053b18fdbf8', 43, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Active sport, fitness', 'FaDumbbell', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('d16a2ea3-5707-4ecb-bd5a-d25ede2a37db', 44, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Alcohol, tobacco', 'FaWineBottle', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('c58cbc8d-a5fc-4a1a-8561-7f03566fedd5', 45, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Books, audio, subscriptions', 'FaBookOpen', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('595bd084-2983-4c38-996b-445a9a8c6535', 46, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Charity, gifts', 'FaHeart', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('76f45d3b-32c1-4c70-8f64-f0ecfe537e3c', 47, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Culture, sport events', 'FaTicketAlt', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('6052a378-309c-4e8f-810b-caef5849b7ec', 48, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Education, development', 'FaGraduationCap', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('cad04fea-3213-4447-9293-025a27736057', 49, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Health care, doctor', 'FaStethoscope', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('16c81413-7e50-4bf6-a4b8-7f623fbde8dc', 50, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Hobbies', 'FaPuzzlePiece', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('5d442bc4-84ec-4b9c-aa8e-2f89b13a9a96', 51, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Holiday, trips, hotels', 'FaUmbrellaBeach', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('cdee8d2b-fec5-46a6-b964-79bbfe9de28d', 52, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Life events', 'FaBirthdayCake', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('af2a170a-76bb-47fa-a4ec-1a61d21c6412', 53, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Lottery, gambling', 'FaDice', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('af7778db-048b-44d4-9252-7cd8797094a9', 54, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Wellness, beauty', 'FaLeaf', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('8f1a8c9b-38cd-48eb-ad9b-9957bea96605', 55, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '9cf34f43-38df-441e-b683-0815e6966f5f', 'Movie, TV, Streaming', 'FaFilm', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('f7e8c717-93cf-412c-84eb-a2dff3775296', 56, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Communication, Gadgets', 'FaMobileAlt', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('bf80a932-05bc-43d7-a181-67b0f9cabff3', 57, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f7e8c717-93cf-412c-84eb-a2dff3775296', 'Communication, Gadgets', 'FaMobileAlt', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('733b2a53-404c-43b2-84b5-0fbf2f1d8565', 58, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f7e8c717-93cf-412c-84eb-a2dff3775296', 'Internet, phone credit', 'FaWifi', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('a86d374a-8c0e-48b4-8b06-8290bb5c0cee', 59, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f7e8c717-93cf-412c-84eb-a2dff3775296', 'Laptop, Smartphone', 'FaLaptop', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('c15c1b97-8120-4962-a148-31e4b1b553ac', 60, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f7e8c717-93cf-412c-84eb-a2dff3775296', 'Postal services', 'FaEnvelope', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('2d26bc2d-757c-4037-a343-1ddaf1f9ad91', 61, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f7e8c717-93cf-412c-84eb-a2dff3775296', 'Software, apps, games', 'FaGamepad', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('f58c825c-8c01-41bc-8c23-d4bde25809d1', 62, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Financial expenses', 'FaUniversity', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('01adbb6e-812e-40f4-bbe9-5f626eba7df1', 63, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f58c825c-8c01-41bc-8c23-d4bde25809d1', 'Financial expenses', 'FaUniversity', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('2cf80dc4-7ddd-40d4-9070-892fdd061901', 64, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f58c825c-8c01-41bc-8c23-d4bde25809d1', 'Advisory', 'FaUserTie', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('187209b8-301a-4287-ad33-9cf82745d0a9', 65, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f58c825c-8c01-41bc-8c23-d4bde25809d1', 'Charges, Fees', 'FaFileInvoice', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('65733673-87db-421b-9203-160f20da99e5', 66, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f58c825c-8c01-41bc-8c23-d4bde25809d1', 'Child Support', 'FaBabyCarriage', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('d09cdb37-c049-44be-b61e-bd9fe3510e5c', 67, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f58c825c-8c01-41bc-8c23-d4bde25809d1', 'Fines', 'FaGavel', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('81a83f7a-6739-4965-8281-5167997c561d', 68, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f58c825c-8c01-41bc-8c23-d4bde25809d1', 'Insurances', 'FaShieldAlt', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('4e0d3a57-191d-441e-b1ed-9bcee49d223d', 69, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f58c825c-8c01-41bc-8c23-d4bde25809d1', 'Loan, interests', 'FaMoneyBillWave', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('37505341-c5c7-4f45-a399-a8f670420e3b', 70, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'f58c825c-8c01-41bc-8c23-d4bde25809d1', 'Taxes', 'FaFileInvoiceDollar', 'MUST', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('1fdd0889-7bcb-47b6-8b32-adcdbb022962', 71, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Investments', 'FaChartLine', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('f1a74c93-baa0-4069-8e9c-77efc2e07c4b', 72, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1fdd0889-7bcb-47b6-8b32-adcdbb022962', 'Investments', 'FaChartLine', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('bad904f6-af9d-4268-9982-98bd34b1b9c4', 73, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1fdd0889-7bcb-47b6-8b32-adcdbb022962', 'Collection', 'FaBoxOpen', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('5f502607-a04a-47fb-98e8-60597ace1588', 74, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1fdd0889-7bcb-47b6-8b32-adcdbb022962', 'Financial investments', 'FaChartPie', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('bed0d430-e348-47bb-b9c8-6045f9a51042', 75, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1fdd0889-7bcb-47b6-8b32-adcdbb022962', 'Realty', 'FaBuilding', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('4cc4836c-7564-4c62-a93e-6f8f04bd35f0', 76, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1fdd0889-7bcb-47b6-8b32-adcdbb022962', 'Savings', 'FaPiggyBank', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('7921d7cb-3eb9-4fde-b46b-306933c880c9', 77, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '1fdd0889-7bcb-47b6-8b32-adcdbb022962', 'Vehicles, chattels', 'FaCar', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 78, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Income', 'FaWallet', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('59bb69ab-be8f-42be-8904-08f663b20341', 79, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Income', 'FaWallet', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('3f11f23b-9d0a-4f34-8636-ce39d5d5111c', 80, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Checks, coupons', 'FaTicketAlt', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('fb028401-0f3b-40ae-a18d-aea6d14d9c12', 81, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Child Support', 'FaBabyCarriage', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('45c19b08-fa8a-480d-980a-c6f85e677630', 82, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Dues & grants', 'FaHandshake', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('281cfb51-df99-4ce0-a23c-1e729a8871cb', 83, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Gifts', 'FaGift', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('4cc0010d-50e2-474f-8352-65af76f3d36f', 84, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Interests', 'FaPercentage', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('9dad00c7-5954-4ffc-b80e-5ec610f58923', 85, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Lending, renting', 'FaExchangeAlt', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('683d2be5-bb9c-4a51-b87e-a4b53d50e8ad', 86, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Dividens', 'FaCoins', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('caf849b2-f907-4ecc-9369-ac658fcacb54', 87, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Refunds (tax, purchase)', 'FaUndoAlt', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('4bdc1135-1695-4917-abba-dc3032c72bb7', 88, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Rental income', 'FaHome', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('8e19d3e9-2f8f-45bf-bdc5-f9ffc53ae3ec', 89, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Sale', 'FaTags', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('093cba1e-d417-4f9a-a444-795eec8731e8', 90, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '4b9ad3e3-4229-4fd6-9820-1033c4f5a7d1', 'Wage, invoices', 'FaMoneyBillWave', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('6c4f042e-f2ee-4c18-80fe-8de82485f792', 91, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Others', 'FaEllipsisH', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('1a102503-be01-4de2-b8ae-5a30e7b43979', 92, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '6c4f042e-f2ee-4c18-80fe-8de82485f792', 'Others', 'FaEllipsisH', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('021e444a-b947-4397-92d6-da249055ae56', 93, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '6c4f042e-f2ee-4c18-80fe-8de82485f792', 'Missing', 'FaQuestionCircle', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-21', NULL, '#868080');
INSERT INTO "public"."categories" VALUES ('21d1f0d8-70ec-47bf-b0b3-88d0a98505a3', 1, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', NULL, 'Food & Drinks', 'FaUtensils', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#d51212');
INSERT INTO "public"."categories" VALUES ('8c24fa08-d031-47a0-a7dc-c366ed557bf5', 2, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '21d1f0d8-70ec-47bf-b0b3-88d0a98505a3', 'Food & Drinks', 'FaUtensils', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#d51212');
INSERT INTO "public"."categories" VALUES ('3f7884db-af3d-4701-9241-8cda98ab7a58', 3, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '21d1f0d8-70ec-47bf-b0b3-88d0a98505a3', 'Bar, cafe, snack', 'FaCoffee', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#d51212');
INSERT INTO "public"."categories" VALUES ('0211eb19-4afa-48a3-bc06-c72c2bb3b0c6', 4, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '21d1f0d8-70ec-47bf-b0b3-88d0a98505a3', 'Groceries, main meal', 'FaShoppingBasket', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#d51212');
INSERT INTO "public"."categories" VALUES ('7c454b5d-4344-4aaf-b104-7ac322e31869', 5, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '21d1f0d8-70ec-47bf-b0b3-88d0a98505a3', 'Restaurant, fast-food', 'FaHamburger', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#d51212');
INSERT INTO "public"."categories" VALUES ('561110a8-ec59-4a8d-8a56-80aec79e3c27', 7, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Shopping', 'FaShoppingBag', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('70898c9f-e0ac-48d6-afdd-52abe73f2586', 8, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Clothes & shoes', 'FaTshirt', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('234a45bb-e7be-4eab-b837-c6f508772a12', 9, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Drug-store, chemist', 'FaPrescriptionBottleAlt', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('fb16629d-bd05-413a-b51d-5bedce6b6551', 10, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Electronics, accessories', 'FaMobileAlt', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('9988b5cc-c6c6-4466-95d6-a257795a7322', 11, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Toiletries', 'FaPumpSoap', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('b420f661-8452-49e1-87b5-a98bbff32787', 12, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Gifts, joy', 'FaGift', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('e541702f-defb-4351-8caf-c896c16a1430', 13, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Skincare, Make Up', 'FaAirFreshener', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('ad3ddfdf-2ac5-4a88-b179-4611f487fef3', 14, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Home, garden', 'FaHome', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('920f70eb-6d7f-41cd-9c23-4a39b374ce04', 15, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Jewels, accessories', 'FaGem', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('aa5303db-1bb9-428e-bf4e-2a3f4de9791c', 16, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Kids', 'FaBaby', 'NEED', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('fcf6b46e-4c2c-4b57-a580-62b7874f4b21', 17, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Pets, animals', 'FaPaw', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');
INSERT INTO "public"."categories" VALUES ('b9c8cfc6-e577-4d8c-8cd7-1642d59fa490', 18, 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '5078dcf5-7e41-48f6-ba3c-8f141ef6316a', 'Stationery, tools', 'FaPencilRuler', 'WANT', 't', NULL, '2025-10-22', 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', '2025-10-22', NULL, '#f0f02b');

-- ----------------------------
-- Table structure for debts
-- ----------------------------
DROP TABLE IF EXISTS "public"."debts";
CREATE TABLE "public"."debts" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "personal_id" int8 NOT NULL,
  "account_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "type" varchar(16) COLLATE "pg_catalog"."default" NOT NULL,
  "position" json,
  "created_at" date NOT NULL,
  "created_by" varchar(64) COLLATE "pg_catalog"."default",
  "updated_at" date,
  "updated_by" varchar(64) COLLATE "pg_catalog"."default"
)
;


-- ----------------------------
-- Table structure for groups
-- ----------------------------
DROP TABLE IF EXISTS "public"."groups";
CREATE TABLE "public"."groups" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "personal_id" int8 NOT NULL,
  "name" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" date NOT NULL,
  "created_by" varchar(64) COLLATE "pg_catalog"."default",
  "updated_at" date,
  "updated_by" varchar(64) COLLATE "pg_catalog"."default"
)
;


-- ----------------------------
-- Table structure for transactions
-- ----------------------------
DROP TABLE IF EXISTS "public"."transactions";
CREATE TABLE "public"."transactions" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "personal_id" int8 NOT NULL,
  "date" date NOT NULL,
  "account_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "category_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "amount" float8 NOT NULL,
  "type" varchar(16) COLLATE "pg_catalog"."default" NOT NULL,
  "note" text COLLATE "pg_catalog"."default",
  "position" json NOT NULL,
  "transfer_id" varchar(36) COLLATE "pg_catalog"."default",
  "debt_id" varchar(36) COLLATE "pg_catalog"."default",
  "created_at" date NOT NULL,
  "created_by" varchar(64) COLLATE "pg_catalog"."default",
  "updated_at" date,
  "updated_by" varchar(64) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for transfers
-- ----------------------------
DROP TABLE IF EXISTS "public"."transfers";
CREATE TABLE "public"."transfers" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "personal_id" int8 NOT NULL,
  "date" date NOT NULL,
  "from_account" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "to_account" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "amount" float8 NOT NULL,
  "note" text COLLATE "pg_catalog"."default" NOT NULL,
  "position" json,
  "created_at" date NOT NULL,
  "created_by" varchar(64) COLLATE "pg_catalog"."default",
  "updated_at" date,
  "updated_by" varchar(64) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "username" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "password" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" date NOT NULL,
  "created_by" varchar(64) COLLATE "pg_catalog"."default",
  "updated_at" date,
  "updated_by" varchar(64) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO "public"."users" VALUES ('c3cda74f-cb21-4aba-ac57-ffdd8e6b8979', 'Test User', 'test@example.com', 'testuser', '$2y$12$Smm01TLmTriK838UJG2GJuWMWi/4IpwvxggdeYjpOCjVGLHR2l9by', '2025-11-01', NULL, '2025-11-01', NULL);

-- ----------------------------
-- Uniques structure for table accounts
-- ----------------------------
ALTER TABLE "public"."accounts" ADD CONSTRAINT "ak_personal_account_k_accounts" UNIQUE ("user_id", "personal_id");

-- ----------------------------
-- Primary Key structure for table accounts
-- ----------------------------
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table categories
-- ----------------------------
ALTER TABLE "public"."categories" ADD CONSTRAINT "ak_personal_categorie_categori" UNIQUE ("personal_id", "user_id");

-- ----------------------------
-- Primary Key structure for table categories
-- ----------------------------
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table debts
-- ----------------------------
ALTER TABLE "public"."debts" ADD CONSTRAINT "debts_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table groups
-- ----------------------------
ALTER TABLE "public"."groups" ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");


-- ----------------------------
-- Uniques structure for table transactions
-- ----------------------------
ALTER TABLE "public"."transactions" ADD CONSTRAINT "ak_personal_transacti_transact" UNIQUE ("user_id", "personal_id");

-- ----------------------------
-- Primary Key structure for table transactions
-- ----------------------------
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table transfers
-- ----------------------------
ALTER TABLE "public"."transfers" ADD CONSTRAINT "transfers_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table accounts
-- ----------------------------
ALTER TABLE "public"."accounts" ADD CONSTRAINT "fk_accounts_reference_groups" FOREIGN KEY ("group_id") REFERENCES "public"."groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."accounts" ADD CONSTRAINT "fk_accounts_reference_users" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table categories
-- ----------------------------
ALTER TABLE "public"."categories" ADD CONSTRAINT "fk_categori_reference_categori" FOREIGN KEY ("parent_id") REFERENCES "public"."categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."categories" ADD CONSTRAINT "fk_categori_reference_users" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table debts
-- ----------------------------
ALTER TABLE "public"."debts" ADD CONSTRAINT "fk_debts_reference_accounts" FOREIGN KEY ("account_id") REFERENCES "public"."accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."debts" ADD CONSTRAINT "fk_debts_reference_users" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table groups
-- ----------------------------
ALTER TABLE "public"."groups" ADD CONSTRAINT "fk_groups_reference_users" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table transactions
-- ----------------------------
ALTER TABLE "public"."transactions" ADD CONSTRAINT "fk_transact_reference_debts" FOREIGN KEY ("debt_id") REFERENCES "public"."debts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "fk_transact_reference_users" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table transfers
-- ----------------------------
ALTER TABLE "public"."transfers" ADD CONSTRAINT "fk_transfer_reference_from_accounts" FOREIGN KEY ("from_account") REFERENCES "public"."accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."transfers" ADD CONSTRAINT "fk_transfer_reference_to_accounts" FOREIGN KEY ("to_account") REFERENCES "public"."accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."transfers" ADD CONSTRAINT "fk_transfer_reference_users" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
