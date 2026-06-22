import { useState } from "react";

const WIDE_RATIO_THRESHOLD = 1.6;

interface EntryImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function EntryImage({ src, alt, className }: EntryImageProps) {
  const [isWide, setIsWide] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      onLoad={(e) => {
        const img = e.currentTarget;
        setIsWide(img.naturalWidth / img.naturalHeight > WIDE_RATIO_THRESHOLD);
      }}
      className={`h-full w-full ${isWide ? "bg-slate-100 object-contain" : "object-cover"} ${className ?? ""}`}
    />
  );
}
