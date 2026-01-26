"use client";

import { useEffect, useState } from 'react';

interface ImageTile {
  url: string;
  country: string;
  x: number;
  y: number;
  key: string;
}

const travelImages = [
  { url: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e?w=200&h=200&fit=crop&q=80', country: 'Egipto' },
  { url: 'https://images.unsplash.com/photo-1528181304800-75b3b46cebda?w=200&h=200&fit=crop&q=80', country: 'Escocia' },
  { url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=200&h=200&fit=crop&q=80', country: 'Bélgica' },
  { url: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=200&h=200&fit=crop&q=80', country: 'Países Bajos' },
  { url: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&h=200&fit=crop&q=80', country: 'Tailandia' },
  { url: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=200&h=200&fit=crop&q=80', country: 'Singapur' },
  { url: 'https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=200&h=200&fit=crop&q=80', country: 'México' },
  { url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=200&h=200&fit=crop&q=80', country: 'Brasil' },
  { url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=200&h=200&fit=crop&q=80', country: 'España' },
  { url: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=200&h=200&fit=crop&q=80', country: 'Italia' },
];

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
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const tilesPerRow = 6;
  const tilesPerColumn = 3;
  const tileWidth = 200;
  const tileHeight = 200;
  const tilePatternWidth = tilesPerRow * tileWidth; // 1200px
  const tilePatternHeight = tilesPerColumn * tileHeight; // 600px
  
  const colsNeeded = Math.ceil(dimensions.width / tilePatternWidth) + 3;
  const rowsNeeded = Math.ceil(dimensions.height / tilePatternHeight) + 3;
  
  const allImages: ImageTile[] = [];
  for (let row = 0; row < rowsNeeded; row++) {
    for (let col = 0; col < colsNeeded; col++) {
      travelImages.forEach((img, index) => {
        const imgRow = Math.floor(index / tilesPerRow);
        const imgCol = index % tilesPerRow;
        const x = col * tilePatternWidth + imgCol * tileWidth;
        const y = row * tilePatternHeight + imgRow * tileHeight;
        allImages.push({ ...img, x, y, key: `${row}-${col}-${index}` });
      });
    }
  }

  return (
    <div className="background-mosaic">
      {allImages.map((img) => (
        <div
          key={img.key}
          className="mosaic-tile"
          style={{
            position: 'absolute',
            left: `${img.x}px`,
            top: `${img.y}px`,
            width: `${tileWidth}px`,
            height: `${tileHeight}px`,
            backgroundImage: `url(${img.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.6,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
}
