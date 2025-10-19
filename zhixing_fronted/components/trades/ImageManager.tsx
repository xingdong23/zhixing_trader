"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export interface ImageFile {
  id: string;
  url: string;
  name: string;
  timestamp: number;
}

interface ImageManagerProps {
  open: boolean;
  onClose: () => void;
  tradeId?: number | string;
  onSave?: (images: ImageFile[]) => void;
}

export default function ImageManager({ open, onClose, tradeId, onSave }: ImageManagerProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // 从 localStorage 加载已有图片
  useEffect(() => {
    if (!open || !tradeId) return;
    try {
      const key = `trade_images_${tradeId}`;
      const raw = localStorage.getItem(key);
      if (raw) setImages(JSON.parse(raw));
    } catch (err) {
      console.error("加载图片失败", err);
    }
  }, [open, tradeId]);

  // 监听粘贴事件
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            toast.success("已从剪贴板粘贴图片");
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open]);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage: ImageFile = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: e.target?.result as string,
        name: file.name,
        timestamp: Date.now(),
      };
      setImages((prev) => [...prev, newImage]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} 不是图片文件`);
        return;
      }
      processFile(file);
    });

    // 清空 input，允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSave = () => {
    if (tradeId) {
      try {
        const key = `trade_images_${tradeId}`;
        localStorage.setItem(key, JSON.stringify(images));
        toast.success(`已保存 ${images.length} 张图片`);
      } catch (err) {
        toast.error("保存失败");
        console.error(err);
      }
    }
    if (onSave) onSave(images);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>管理图片/截图</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            支持上传或直接粘贴（Ctrl/Cmd+V）图片
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* 上传区域 */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">点击上传或拖拽图片到这里</p>
            <p className="text-xs text-gray-500">也可以直接 Ctrl/Cmd+V 粘贴截图</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 图片列表 */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((img) => (
                <div key={img.id} className="relative group border rounded-lg overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemove(img.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                  <div className="p-2 bg-gray-50 text-xs text-gray-600 truncate">
                    {img.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-30" />
              <p className="text-sm">还没有图片，上传或粘贴一张吧</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存 {images.length > 0 && `(${images.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

