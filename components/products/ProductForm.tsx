"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { formatPKR } from "@/lib/utils";
import { productSchema, productUnits, type ProductFormValues } from "@/lib/validations/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfitMarginIndicator } from "@/components/products/ProfitMarginIndicator";
import { BrandCombobox } from "@/components/products/BrandCombobox";
import { ImageUploader } from "@/components/products/ImageUploader";
import { RestockModal, type RestockTarget } from "@/components/inventory/RestockModal";

type SubCategory = { id: string; name: string };
type Category = { id: string; name: string; subCategories: SubCategory[] };

export type ExistingProduct = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  subCategoryId: string | null;
  brand: string | null;
  description: string | null;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  lowStockThreshold: number;
  unit: string;
  imageUrl: string | null;
  isActive: boolean;
};

type ProductFormProps = {
  mode: "add" | "edit";
  product?: ExistingProduct;
};

const emptyDefaults: ProductFormValues = {
  name: "",
  sku: "",
  categoryId: "",
  subCategoryId: "",
  brand: "",
  description: "",
  buyingPrice: 0,
  sellingPrice: 0,
  quantity: 0,
  lowStockThreshold: 5,
  unit: "Piece",
  imageUrl: "",
  isActive: true,
};

function toDefaults(product: ExistingProduct): ProductFormValues {
  return {
    name: product.name,
    sku: product.sku,
    categoryId: product.categoryId,
    subCategoryId: product.subCategoryId ?? "",
    brand: product.brand ?? "",
    description: product.description ?? "",
    buyingPrice: product.buyingPrice,
    sellingPrice: product.sellingPrice,
    quantity: product.quantity,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit as ProductFormValues["unit"],
    imageUrl: product.imageUrl ?? "",
    isActive: product.isActive,
  };
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Failed to upload image");
  return json.data.url as string;
}

export function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [liveQuantity, setLiveQuantity] = useState(product?.quantity ?? 0);
  const [successData, setSuccessData] = useState<{ id: string; name: string; sku: string; quantity: number; sellingPrice: number } | null>(
    null
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? toDefaults(product) : emptyDefaults,
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });
  }, []);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSubmit(onSubmit)();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryId = watch("categoryId");
  const buyingPrice = watch("buyingPrice");
  const sellingPrice = watch("sellingPrice");
  const description = watch("description");
  const imageUrl = watch("imageUrl");

  const subCategories = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subCategories ?? [],
    [categories, categoryId]
  );

  const onSubmit = async (values: ProductFormValues) => {
    try {
      let finalImageUrl = values.imageUrl || null;
      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
      }

      if (mode === "add") {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, imageUrl: finalImageUrl }),
        });
        const json = await res.json();
        if (!json.success) {
          toast.error(json.error ?? "Failed to add product");
          return;
        }
        setSuccessData({
          id: json.data.id,
          name: json.data.name,
          sku: json.data.sku,
          quantity: json.data.quantity,
          sellingPrice: Number(json.data.sellingPrice),
        });
        return;
      }

      // Edit mode — send only the fields the user actually changed.
      const changed: Record<string, unknown> = {};
      for (const key of Object.keys(dirtyFields) as (keyof ProductFormValues)[]) {
        if (key === "quantity") continue; // stock changes only via Restock
        changed[key] = key === "imageUrl" ? finalImageUrl : values[key];
      }
      if (selectedFile) changed.imageUrl = finalImageUrl;

      if (Object.keys(changed).length === 0) {
        toast.info("No changes to save");
        return;
      }

      const res = await fetch(`/api/products/${product!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Failed to update product");
        return;
      }

      toast.success(`${values.name} updated successfully`);
      reset(values);
      setSelectedFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Leave anyway?")) {
      return;
    }
    router.back();
  };

  const handleAddAnother = () => {
    reset(emptyDefaults);
    setSelectedFile(null);
    setSuccessData(null);
  };

  if (successData) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="size-10 text-emerald-500" />
            <CardTitle>Product Added Successfully</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div>
              <p className="text-lg font-semibold">{successData.name}</p>
              <p className="font-mono text-sm text-muted-foreground">SKU: {successData.sku}</p>
              <p className="text-sm text-muted-foreground">
                Stock: {successData.quantity} units · {formatPKR(successData.sellingPrice)} selling price
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={handleAddAnother}>Add Another Product</Button>
              <Button
                variant="outline"
                render={<Link href={`/inventory?highlight=${successData.id}`} />}
              >
                View in Inventory
              </Button>
              <Button variant="outline" render={<Link href={`/products/edit/${successData.id}`} />}>
                Edit This Product
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {mode === "edit" && product && (
        <p className="mb-3 text-sm text-muted-foreground">
          <Link href="/inventory" className="hover:underline">
            Inventory
          </Link>{" "}
          › Edit Product › {product.name}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{mode === "add" ? "Add Product" : `Edit Product — ${product?.name}`}</CardTitle>
          <CardDescription>
            {mode === "add" ? "Add a new item to your inventory" : "Update this product's details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Information */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Basic Information</h3>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sku">SKU / Code</Label>
                  <Input id="sku" placeholder="Auto-generated if left blank" {...register("sku")} />
                  {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          if (!value) return;
                          field.onChange(value);
                          setValue("subCategoryId", "", { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoryId && (
                    <p className="text-xs text-destructive">{errors.categoryId.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Sub-Category</Label>
                  <Controller
                    control={control}
                    name="subCategoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        disabled={!categoryId || subCategories.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a sub-category" />
                        </SelectTrigger>
                        <SelectContent>
                          {subCategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="brand">Brand</Label>
                  <Controller
                    control={control}
                    name="brand"
                    render={({ field }) => (
                      <BrandCombobox id="brand" value={field.value ?? ""} onChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Unit</Label>
                  <Controller
                    control={control}
                    name="unit"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {productUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows={3} {...register("description")} />
                  <p className="text-right text-xs text-muted-foreground">
                    {(description ?? "").length} / 500
                  </p>
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  )}
                </div>
              </div>

              {/* Pricing, Stock, Image */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Pricing</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="buyingPrice">Buying Price (PKR)</Label>
                    <Input
                      id="buyingPrice"
                      type="number"
                      step="0.01"
                      min={0}
                      {...register("buyingPrice", { valueAsNumber: true })}
                    />
                    {errors.buyingPrice && (
                      <p className="text-xs text-destructive">{errors.buyingPrice.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sellingPrice">Selling Price (PKR)</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      min={0}
                      {...register("sellingPrice", { valueAsNumber: true })}
                    />
                    {errors.sellingPrice && (
                      <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>
                    )}
                  </div>
                </div>

                <ProfitMarginIndicator buyingPrice={buyingPrice} sellingPrice={sellingPrice} />

                <h3 className="mt-2 text-sm font-semibold text-muted-foreground">Stock</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quantity">
                      {mode === "edit" ? "Current Quantity" : "Opening Quantity"}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      disabled={mode === "edit"}
                      value={mode === "edit" ? liveQuantity : undefined}
                      {...(mode === "add" ? register("quantity", { valueAsNumber: true }) : {})}
                      readOnly={mode === "edit"}
                    />
                    {mode === "edit" && (
                      <p className="text-xs text-muted-foreground">
                        To change stock quantity use the{" "}
                        <button
                          type="button"
                          onClick={() => setRestockOpen(true)}
                          className="underline hover:text-foreground"
                        >
                          Restock
                        </button>{" "}
                        function in Inventory
                      </p>
                    )}
                    {errors.quantity && (
                      <p className="text-xs text-destructive">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lowStockThreshold">Low Stock Alert At</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      min={0}
                      {...register("lowStockThreshold", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll flag this product when stock falls to or below this number
                    </p>
                  </div>
                </div>

                <h3 className="mt-2 text-sm font-semibold text-muted-foreground">Image</h3>
                <ImageUploader
                  imageUrl={imageUrl ?? ""}
                  onImageUrlChange={(url) => setValue("imageUrl", url, { shouldDirty: true })}
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : mode === "add"
                    ? "Save Product"
                    : "Update Product"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {mode === "edit" && product && (
        <RestockModal
          product={{
            id: product.id,
            name: product.name,
            quantity: liveQuantity,
            buyingPrice: buyingPrice,
          } as RestockTarget}
          open={restockOpen}
          onOpenChange={setRestockOpen}
          onSuccess={(result) => setLiveQuantity(result.newQuantity)}
        />
      )}
    </div>
  );
}
