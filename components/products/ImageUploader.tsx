"use client";

import { useRef, useState } from "react";
import { ImageOff, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MAX_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ImageUploaderProps = {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
};

export function ImageUploader({ imageUrl, onImageUrlChange, onFileSelect, selectedFile }: ImageUploaderProps) {
  const [tab, setTab] = useState<"upload" | "url">(imageUrl ? "url" : "upload");
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [urlBroken, setUrlBroken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filePreview = selectedFile ? URL.createObjectURL(selectedFile) : null;

  const validateAndSetFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Only JPEG, PNG, and WEBP images are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError("File must be 2MB or smaller");
      return;
    }
    setFileError(null);
    onFileSelect(file);
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (!value) return;
        setTab(value as "upload" | "url");
        if (value === "upload") {
          onImageUrlChange("");
          setUrlBroken(false);
        } else {
          onFileSelect(null);
          setFileError(null);
        }
      }}
    >
      <TabsList>
        <TabsTrigger value="upload">Upload File</TabsTrigger>
        <TabsTrigger value="url">Image URL</TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="mt-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            validateAndSetFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50"
          )}
        >
          {filePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={filePreview} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
          ) : (
            <Upload className="size-6 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {selectedFile ? selectedFile.name : "Drag & drop an image, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, or WEBP — max 2MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => validateAndSetFile(e.target.files?.[0])}
          />
        </div>
        {fileError && <p className="mt-1 text-xs text-destructive">{fileError}</p>}
      </TabsContent>

      <TabsContent value="url" className="mt-3 flex flex-col gap-2">
        <Input
          value={imageUrl}
          onChange={(e) => {
            onImageUrlChange(e.target.value);
            setUrlBroken(false);
          }}
          placeholder="https://example.com/image.jpg"
        />
        {imageUrl && !urlBroken && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Preview"
            className="h-24 w-24 rounded-lg border object-cover"
            onError={() => setUrlBroken(true)}
          />
        )}
        {imageUrl && urlBroken && (
          <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border text-muted-foreground">
            <ImageOff className="size-5" />
            <span className="text-[0.65rem]">Can&apos;t load image</span>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
