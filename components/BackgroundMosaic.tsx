"use client";

import { useEffect, useState, useMemo } from "react";

interface ImageTile {
  url: string;
  country: string;
  x: number;
  y: number;
  size: number;
  key: string;
}

const travelImages = [
  {
    url: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=200&h=200&fit=crop&q=80",
    country: "Egipto (pirámides)",
  },
  {
    url: "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=200&h=200&fit=crop&q=80",
    country: "Escocia",
  },
  {
    url: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&h=200&fit=crop&q=80",
    country: "Tailandia",
  },
  {
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop&q=80",
    country: "El Chaltén",
  },
  {
    url: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=200&h=200&fit=crop&q=80",
    country: "Cartagena, Colombia",
  },
];

const SIZES = [140, 200, 260];
const GAP = 12;

export default function BackgroundMosaic() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const allImages = useMemo(() => {
    const tiles: ImageTile[] = [];
    let y = -SIZES[2];
    let imgIndex = 0;

    while (y < dimensions.height + SIZES[2]) {
      const rowSizeIndex = Math.abs(Math.floor(y / 200)) % SIZES.length;
      const size = SIZES[rowSizeIndex];
      const rowStagger = (Math.floor(y / 200) % 2) * (size / 2 + GAP / 2);

      let x = -size - rowStagger;
      while (x < dimensions.width + size) {
        const img = travelImages[imgIndex % travelImages.length];
        imgIndex += 1;
        tiles.push({
          ...img,
          x,
          y,
          size,
          key: `${x}-${y}`,
        });
        x += size + GAP;
      }
      y += size + GAP;
    }

    return tiles;
  }, [dimensions.width, dimensions.height]);

  return (
    <div className="background-mosaic">
      {allImages.map((img) => (
        <div
          key={img.key}
          className="mosaic-tile"
          style={{
            position: "absolute",
            left: `${img.x}px`,
            top: `${img.y}px`,
            width: `${img.size}px`,
            height: `${img.size}px`,
            backgroundImage: `url(${img.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.38,
            filter: "blur(4px)",
          }}
        />
      ))}
    </div>
  );
}
