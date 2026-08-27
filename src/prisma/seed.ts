import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./db";

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 12);
  const owner = await db.orm.public.User.upsert({
    create: { name: "Shop Owner", email: "owner@pos.com", passwordHash, role: "OWNER" },
    update: {},
    conflictOn: { email: "owner@pos.com" },
  });
  console.log("Owner created:", owner.email);

  const cashierHash = await bcrypt.hash("cashier123", 12);
  await db.orm.public.User.upsert({
    create: { name: "Counter Staff", email: "cashier@pos.com", passwordHash: cashierHash, role: "CASHIER" },
    update: {},
    conflictOn: { email: "cashier@pos.com" },
  });
  console.log("Cashier created");

  const categoryData = [
    { name: "Stationery", subs: ["Pens & Pencils", "Notebooks", "Files & Folders", "Art Supplies", "Office Supplies"] },
    { name: "Toys", subs: ["Board Games", "Outdoor Toys", "Educational Toys", "Action Figures", "Puzzles"] },
    { name: "Sports", subs: ["Cricket", "Football", "Badminton", "Fitness Equipment", "Accessories"] },
    { name: "Other", subs: ["Miscellaneous"] },
  ];

  const categories: Record<string, string> = {};
  const subCategories: Record<string, string> = {};

  for (const cat of categoryData) {
    const created = await db.orm.public.Category.upsert({
      create: { name: cat.name },
      update: {},
      conflictOn: { name: cat.name },
    });
    categories[cat.name] = created.id;

    for (const sub of cat.subs) {
      const createdSub = await db.orm.public.SubCategory.upsert({
        create: { name: sub, categoryId: created.id },
        update: {},
        conflictOn: { name: sub, categoryId: created.id },
      });
      subCategories[sub] = createdSub.id;
    }
  }
  console.log("Categories seeded");

  const products = [
    {
      name: "Pilot G2 Pen (Black)",
      sku: "PEN-001",
      categoryId: categories["Stationery"],
      subCategoryId: subCategories["Pens & Pencils"],
      brand: "Pilot",
      buyingPrice: 40,
      sellingPrice: 60,
      quantity: 150,
      unit: "Piece",
    },
    {
      name: "A4 Notebook 200 Pages",
      sku: "NB-001",
      categoryId: categories["Stationery"],
      subCategoryId: subCategories["Notebooks"],
      brand: "Student Choice",
      buyingPrice: 80,
      sellingPrice: 120,
      quantity: 200,
      unit: "Piece",
    },
    {
      name: "Cricket Tape Ball",
      sku: "CRK-001",
      categoryId: categories["Sports"],
      subCategoryId: subCategories["Cricket"],
      brand: "Cosco",
      buyingPrice: 120,
      sellingPrice: 180,
      quantity: 80,
      unit: "Piece",
    },
    {
      name: "Ludo Board Game",
      sku: "TOY-001",
      categoryId: categories["Toys"],
      subCategoryId: subCategories["Board Games"],
      brand: "Classic Games",
      buyingPrice: 200,
      sellingPrice: 350,
      quantity: 30,
      unit: "Set",
    },
    {
      name: "Badminton Racket Set",
      sku: "SPT-001",
      categoryId: categories["Sports"],
      subCategoryId: subCategories["Badminton"],
      brand: "Victor",
      buyingPrice: 800,
      sellingPrice: 1200,
      quantity: 15,
      unit: "Set",
    },
  ];

  for (const product of products) {
    await db.orm.public.Product.upsert({
      create: {
        ...product,
        buyingPrice: String(product.buyingPrice),
        sellingPrice: String(product.sellingPrice),
      },
      update: {},
      conflictOn: { sku: product.sku },
    });
  }
  console.log("Sample products seeded");

  const existingSettings = await db.orm.public.ShopSettings.first();
  if (!existingSettings) {
    await db.orm.public.ShopSettings.create({
      shopName: "Al-Noor Stationery & Sports",
      currency: "PKR",
    });
    console.log("Shop settings created");
  }

  console.log("\nSeed complete!");
  console.log("   Owner login:   owner@pos.com   / admin123");
  console.log("   Cashier login: cashier@pos.com / cashier123");

  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
