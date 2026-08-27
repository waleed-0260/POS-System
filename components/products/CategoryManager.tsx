"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SubCategoryRow = { id: string; name: string; isActive: boolean; productCount: number };
type CategoryRow = { id: string; name: string; isActive: boolean; productCount: number; subCategories: SubCategoryRow[] };

type DeactivateTarget = { kind: "category" | "subCategory"; id: string; name: string; productCount: number };

function InlineNameRow({
  autoFocus = true,
  initialValue = "",
  placeholder,
  onSave,
  onCancel,
}: {
  autoFocus?: boolean;
  initialValue?: string;
  placeholder: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed p-2">
      <Input
        ref={ref}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSave(value.trim());
          if (e.key === "Escape") onCancel();
        }}
        className="h-8"
      />
      <Button type="button" size="sm" disabled={!value.trim()} onClick={() => onSave(value.trim())}>
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export function CategoryManager() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [addingSub, setAddingSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateTarget | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories?includeInactive=true");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
        if (!selectedId && json.data.length > 0) setSelectedId(json.data[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = categories.find((c) => c.id === selectedId) ?? null;

  const handleCreateCategory = async (name: string) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error ?? "Failed to create category");
      return;
    }
    toast.success(`${name} added`);
    setAddingCategory(false);
    load();
  };

  const handleRenameCategory = async (id: string, name: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error ?? "Failed to rename category");
      return;
    }
    setEditingCategoryId(null);
    load();
  };

  const handleToggleCategory = (category: CategoryRow) => {
    if (category.isActive && category.productCount > 0) {
      setDeactivateTarget({ kind: "category", id: category.id, name: category.name, productCount: category.productCount });
      return;
    }
    applyCategoryToggle(category.id, !category.isActive);
  };

  const applyCategoryToggle = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error ?? "Failed to update category");
      return;
    }
    load();
  };

  const handleCreateSub = async (name: string) => {
    if (!selected) return;
    const res = await fetch(`/api/categories/${selected.id}/sub-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error ?? "Failed to create sub-category");
      return;
    }
    toast.success(`${name} added`);
    setAddingSub(false);
    load();
  };

  const handleRenameSub = async (id: string, name: string) => {
    const res = await fetch(`/api/sub-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error ?? "Failed to rename sub-category");
      return;
    }
    setEditingSubId(null);
    load();
  };

  const handleToggleSub = (sub: SubCategoryRow) => {
    if (sub.isActive && sub.productCount > 0) {
      setDeactivateTarget({ kind: "subCategory", id: sub.id, name: sub.name, productCount: sub.productCount });
      return;
    }
    applySubToggle(sub.id, !sub.isActive);
  };

  const applySubToggle = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/sub-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error ?? "Failed to update sub-category");
      return;
    }
    load();
  };

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    if (deactivateTarget.kind === "category") applyCategoryToggle(deactivateTarget.id, false);
    else applySubToggle(deactivateTarget.id, false);
    setDeactivateTarget(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading &&
            categories.map((category) =>
              editingCategoryId === category.id ? (
                <InlineNameRow
                  key={category.id}
                  initialValue={category.name}
                  placeholder="Category name"
                  onSave={(name) => handleRenameCategory(category.id, name)}
                  onCancel={() => setEditingCategoryId(null)}
                />
              ) : (
                <div
                  key={category.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(category.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(category.id);
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 text-left transition-colors",
                    selectedId === category.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", !category.isActive && "text-muted-foreground line-through")}>
                      {category.name}
                    </span>
                    <Badge variant="outline">{category.productCount} products</Badge>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch checked={category.isActive} onCheckedChange={() => handleToggleCategory(category)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingCategoryId(category.id)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            )}

          {addingCategory ? (
            <InlineNameRow
              placeholder="New category name"
              onSave={handleCreateCategory}
              onCancel={() => setAddingCategory(false)}
            />
          ) : (
            <Button type="button" variant="outline" className="w-fit" onClick={() => setAddingCategory(true)}>
              <Plus />
              Add Category
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selected ? `Sub-categories for ${selected.name}` : "Select a category"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {selected?.subCategories.map((sub) =>
            editingSubId === sub.id ? (
              <InlineNameRow
                key={sub.id}
                initialValue={sub.name}
                placeholder="Sub-category name"
                onSave={(name) => handleRenameSub(sub.id, name)}
                onCancel={() => setEditingSubId(null)}
              />
            ) : (
              <div key={sub.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", !sub.isActive && "text-muted-foreground line-through")}>
                    {sub.name}
                  </span>
                  <Badge variant="outline">{sub.productCount} products</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={sub.isActive} onCheckedChange={() => handleToggleSub(sub)} />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingSubId(sub.id)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          )}

          {selected &&
            (addingSub ? (
              <InlineNameRow
                placeholder="New sub-category name"
                onSave={handleCreateSub}
                onCancel={() => setAddingSub(false)}
              />
            ) : (
              <Button type="button" variant="outline" className="w-fit" onClick={() => setAddingSub(true)}>
                <Plus />
                Add Sub-Category
              </Button>
            ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivating this {deactivateTarget?.kind === "category" ? "category" : "sub-category"} will hide
              all {deactivateTarget?.productCount} of its products from POS search. Products remain in
              inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDeactivate}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
