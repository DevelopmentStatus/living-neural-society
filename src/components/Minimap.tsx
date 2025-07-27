import React, { useRef, useEffect } from 'react';
import { WorldTile, TileType } from '../types/simulation';
import './Minimap.css';

interface MinimapProps {
  tiles: WorldTile[][];
  camera: { x: number; y: number; zoom: number };
  worldSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  onMinimapClick: (x: number, y: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ 
  tiles, 
  camera, 
  worldSize, 
  viewportSize,
  onMinimapClick 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tiles.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 200;
    canvas.height = 150;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling for minimap
    const scaleX = canvas.width / worldSize.width;
    const scaleY = canvas.height / worldSize.height;
    const scale = Math.min(scaleX, scaleY);

    // Draw tiles
    for (const row of tiles) {
      for (const tile of row) {
        if (!tile) continue;

        // Use tile's actual world coordinates
        const x = (tile.x / worldSize.width) * canvas.width;
        const y = (tile.y / worldSize.height) * canvas.height;

        // Get tile color based on type
        const color = getTileColor(tile.type);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Draw camera viewport
    const worldViewportWidth = viewportSize.width / camera.zoom;
    const worldViewportHeight = viewportSize.height / camera.zoom;
    
    const camX = (camera.x / worldSize.width) * canvas.width;
    const camY = (camera.y / worldSize.height) * canvas.height;
    const camWidth = (worldViewportWidth / worldSize.width) * canvas.width;
    const camHeight = (worldViewportHeight / worldSize.height) * canvas.height;

    ctx.strokeStyle = '#4facfe';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      camX - camWidth / 2,
      camY - camHeight / 2,
      camWidth,
      camHeight
    );

    // Draw camera center point
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(camX, camY, 3, 0, 2 * Math.PI);
    ctx.fill();

  }, [tiles, camera, worldSize, viewportSize]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert minimap coordinates to world coordinates
    const worldX = (x / canvas.width) * worldSize.width;
    const worldY = (y / canvas.height) * worldSize.height;

    onMinimapClick(worldX, worldY);
  };

  return (
    <div className="minimap-container">
      <h4>World Overview</h4>
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        onClick={handleMinimapClick}
        title="Click to move camera to this location"
      />
    </div>
  );
};

function getTileColor(type: TileType): string {
  switch (type) {
    case TileType.GRASS: return '#90EE90';
    case TileType.FOREST: return '#228B22';
    case TileType.MOUNTAIN: return '#8B4513';
    case TileType.WATER: return '#4169E1';
    case TileType.DESERT: return '#F4A460';
    case TileType.URBAN: return '#696969';
    case TileType.FARM: return '#32CD32';
    case TileType.ROAD: return '#A0522D';
    case TileType.HILL: return '#8B7355';
    case TileType.SWAMP: return '#556B2F';
    case TileType.TUNDRA: return '#8FBC8F';
    case TileType.ALPINE: return '#696969';
    case TileType.VOLCANO: return '#8B0000';
    case TileType.RUINS: return '#696969';
    case TileType.CAPITAL: return '#FFD700';
    case TileType.TRADE_HUB: return '#FFD700';
    case TileType.FORTRESS: return '#8B4513';
    case TileType.RELIGIOUS_SITE: return '#9370DB';
    case TileType.NATURAL_WONDER: return '#FFD700';
    case TileType.LANDMARK: return '#FFD700';
    default: return '#C0C0C0';
  }
} 