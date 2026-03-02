import { Package } from 'lucide-react';
import { getProductImageUrl } from '../productImages';

interface ProductImageProps {
  productName: string;
  className?: string;
  alt?: string;
  imageUrl?: string;
}

export default function ProductImage({ productName, className = '', alt, imageUrl }: ProductImageProps) {
  // Priority: custom imageUrl > hardcoded map > fallback icon
  const url = imageUrl || getProductImageUrl(productName);
  const resolvedAlt = alt ?? productName;

  if (url) {
    return (
      <img
        src={url}
        alt={resolvedAlt}
        className={`object-cover bg-slate-100 ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`bg-slate-100 flex items-center justify-center text-slate-400 ${className}`}>
      <Package size={Math.min(24, 40)} />
    </div>
  );
}
