"use client";

import { AssetCard } from "./asset-card";

interface Asset {
  _id: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
  uploadedAt: number;
}

interface AssetGridProps {
  assets: Asset[];
  onSelect?: (assetId: string) => void;
  selectedId?: string;
}

export function AssetGrid({ assets, onSelect, selectedId }: AssetGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {assets.map((asset) => (
        <AssetCard
          key={asset._id}
          asset={asset}
          isSelected={selectedId === asset._id}
          onClick={onSelect ? () => onSelect(asset._id) : undefined}
        />
      ))}
    </div>
  );
}
