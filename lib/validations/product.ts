import { z } from "zod";

export const productUnits = ["Piece", "Pack", "Box", "Dozen", "Set", "Kg", "Litre", "Metre"] as const;

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  sku: z
    .string()
    .max(50)
    .regex(/^[a-zA-Z0-9-]*$/, "SKU may only contain letters, numbers, and hyphens")
    .optional(),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().min(1).optional().nullable(),
  brand: z.string().max(60).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  buyingPrice: z.number().min(0).max(9999999),
  sellingPrice: z.number().min(0).max(9999999),
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  unit: z.enum(productUnits),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const partialProductSchema = productSchema.partial();
