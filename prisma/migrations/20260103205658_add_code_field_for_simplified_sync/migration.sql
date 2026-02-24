-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "code" VARCHAR(150);

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "code" VARCHAR(150);

-- Generate codes for existing accounts (format: "Name::PersonalID")
UPDATE "Account" 
SET "code" = name || '::' || personal_id 
WHERE "code" IS NULL;

-- Generate codes for existing categories (format: "Name::PersonalID")
UPDATE "Category" 
SET "code" = name || '::' || personal_id 
WHERE "code" IS NULL;
