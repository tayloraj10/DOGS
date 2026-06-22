import { useState } from "react";

// Only crop to fill (object-cover) when the image's aspect ratio is already
// close to the container's 16:9, otherwise contain it so logos/portraits
// (square, tall, or very wide) don't get their edges cut off.
const MIN_COVER_RATIO = 1.3;
const MAX_COVER_RATIO = 2.3;

interface EntryImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function EntryImage({ src, alt, className }: EntryImageProps) {
  const [shouldContain, setShouldContain] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      onLoad={(e) => {
        const img = e.currentTarget;
        const ratio = img.naturalWidth / img.naturalHeight;
        setShouldContain(ratio < MIN_COVER_RATIO || ratio > MAX_COVER_RATIO);
      }}
      className={`h-full w-full ${shouldContain ? "bg-slate-100 object-contain" : "object-cover"} ${className ?? ""}`}
    />
  );
}
