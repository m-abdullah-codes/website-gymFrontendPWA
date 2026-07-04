"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type ExerciseThumbnailProps = {
  videoUrl?: string;
  fallbackSrc: string;
  alt: string;
  sizes: string;
  className?: string;
};

export function ExerciseThumbnail({
  videoUrl,
  fallbackSrc,
  alt,
  sizes,
  className,
}: ExerciseThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const showFirstFrame = () => {
      video.currentTime = 0;
      video.pause();
    };

    video.addEventListener("loadeddata", showFirstFrame);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      showFirstFrame();
    }

    return () => video.removeEventListener("loadeddata", showFirstFrame);
  }, [videoUrl]);

  if (!videoUrl) {
    return (
      <Image
        src={fallbackSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      muted
      playsInline
      preload="auto"
      aria-hidden
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
