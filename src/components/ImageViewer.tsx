'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Chip,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';

interface ImageData {
  id: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  uploaded_at: string;
}

interface ImageViewerProps {
  image: ImageData | null;
  onBack: () => void;
}

export default function ImageViewer({ image, onBack }: ImageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);

  // Dynamically import Fabric.js only on client side
  useEffect(() => {
    const loadFabric = async () => {
      const fabricModule = await import('fabric');
      setFabricLoaded(true);
    };
    
    loadFabric();
  }, []);

  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current || !image) return;

    // Initialize Fabric.js canvas
    const initFabric = async () => {
      const fabric = await import('fabric');

      const canvas = new fabric.fabric.Canvas(canvasRef.current, {
        selection: true,
      });
      fabricCanvasRef.current = canvas;

      // Load image
      fabric.fabric.Image.fromURL(
        `http://localhost:3001${image.filepath}`,
        (img) => {
          if (!canvas) return;

          const canvasWidth = canvas.width || 1600;
          const canvasHeight = canvas.height || 1200;
          const imgAspect = img.width! / img.height!;
          const canvasAspect = canvasWidth / canvasHeight;

          let scale;
          if (imgAspect > canvasAspect) {
            scale = canvasWidth / img.width!;
          } else {
            scale = canvasHeight / img.height!;
          }

          img.set({
            crossOrigin: 'anonymous',
          });

          img.scale(scale);
          canvas.add(img);
          canvas.centerObject(img);

          const rect = new fabric.fabric.Rect({
            left: img.left || 0,
            top: img.top || 0,
            width: img.getScaledWidth(),
            height: img.getScaledHeight(),
            fill: 'rgba(255,0,0,0.3)',
            stroke: 'red',
            strokeWidth: 2,
            selectable: true,
            lockMovementX: false,
            lockMovementY: false,
            lockScalingX: false,
            lockScalingY: false,
          });

          canvas.add(rect);
          rect.bringToFront();
          canvas.renderAll();
        },
        {
          crossOrigin: "anonymous",
        }
      );

      // Enable pan and zoom
      canvas.on('mouse:wheel', (opt: any) => {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      let isDragging = false;
      let lastPosX = 0;
      let lastPosY = 0;

      canvas.on('mouse:down', (opt: any) => {
        const evt = opt.e;
        if (evt.altKey) {
          isDragging = true;
          lastPosX = evt.clientX;
          lastPosY = evt.clientY;
          canvas.selection = false;
        }
      });

      canvas.on('mouse:move', (opt: any) => {
        if (isDragging) {
          const e = opt.e;
          const vpt = canvas.viewportTransform;
          if (vpt) {
            vpt[4] += e.clientX - lastPosX;
            vpt[5] += e.clientY - lastPosY;
            canvas.requestRenderAll();
            lastPosX = e.clientX;
            lastPosY = e.clientY;
          }
        }
      });

      canvas.on('mouse:up', () => {
        isDragging = false;
        canvas.selection = true;

        // Ensure rectangle stays on top
        const objects = canvas.getObjects();
        const rectObj = objects.find((obj: any) => obj.type === 'rect');
        if (rectObj) {
          rectObj.bringToFront();
        }
      });

      return () => {
        canvas.dispose();
      };
    };

    const cleanup = initFabric();

    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [image, fabricLoaded]);

  const handleCrop = async () => {
    if (!fabricCanvasRef.current) return;

    const fabric = await import('fabric');
    const canvas = fabricCanvasRef.current;

    // Get the image and rectangle objects
    const objects = canvas.getObjects();
    const imgObj = objects.find((obj: any) => obj.type === 'image') as any;
    const cropRect = objects.find((obj: any) => obj.type === 'rect') as any;

    if (imgObj && cropRect) {
      // Calculate the intersection area between image and rectangle
      const imgBounds = {
        left: imgObj.left || 0,
        top: imgObj.top || 0,
        right: (imgObj.left || 0) + (imgObj.width || 0) * (imgObj.scaleX || 1),
        bottom: (imgObj.top || 0) + (imgObj.height || 0) * (imgObj.scaleY || 1)
      };

      const rectBounds = {
        left: cropRect.left || 0,
        top: cropRect.top || 0,
        right: (cropRect.left || 0) + (cropRect.width || 0) * (cropRect.scaleX || 1),
        bottom: (cropRect.top || 0) + (cropRect.height || 0) * (cropRect.scaleY || 1)
      };

      // Calculate intersection
      const intersectLeft = Math.max(imgBounds.left, rectBounds.left);
      const intersectTop = Math.max(imgBounds.top, rectBounds.top);
      const intersectRight = Math.min(imgBounds.right, rectBounds.right);
      const intersectBottom = Math.min(imgBounds.bottom, rectBounds.bottom);

      if (intersectLeft >= intersectRight || intersectTop >= intersectBottom) {
        alert('No overlapping area between image and selection rectangle');
        return;
      }

      const intersectWidth = intersectRight - intersectLeft;
      const intersectHeight = intersectBottom - intersectTop;

      // Calculate crop coordinates relative to the original image
      const scaleX = imgObj.scaleX || 1;
      const scaleY = imgObj.scaleY || 1;

      const cropX = (intersectLeft - (imgObj.left || 0)) / scaleX;
      const cropY = (intersectTop - (imgObj.top || 0)) / scaleY;
      const cropWidth = intersectWidth / scaleX;
      const cropHeight = intersectHeight / scaleY;

      // Create cropped canvas
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      tempCanvas.width = intersectWidth;
      tempCanvas.height = intersectHeight;

      // Get the image element
      const imgElement = imgObj.getElement() as HTMLImageElement;

      // Wait for image to load
      if (!imgElement.complete) {
        await new Promise((resolve) => {
          imgElement.onload = resolve;
        });
      }

      ctx.drawImage(
        imgElement,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, intersectWidth, intersectHeight
      );

      // Download the cropped image
      const dataURL = tempCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `cropped_${image?.filename.split('.')[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert('Image or selection rectangle not found');
    }
  };

  if (!image) return null;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={onBack}
              startIcon={<span>⬅️</span>}
            >
              Back to Gallery
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 'bold', textAlign: 'center', flex: 1 }}>
              {image.filename}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCrop}
                startIcon={<span>✂️</span>}
              >
                Crop Selection
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ flex: 1 }}>
        <CardContent sx={{ p: 0, height: '100%' }}>
          {!fabricLoaded ? (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h6">Loading image editor...</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ position: 'relative', width: '100%' }}>
              <canvas
                ref={canvasRef}
                width={1000}
                height={500}
                style={{ width: "100%", height: "100%" }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <Chip
              color="primary"
              variant="filled"
              label={`📏 ${(image.size / 1024 / 1024).toFixed(2)} MB`}
              sx={{ justifyContent: 'center' }}
            />
            <Chip
              color="secondary"
              variant="filled"
              label={`🏷️ ${image.mimetype.split('/')[1].toUpperCase()}`}
              sx={{ justifyContent: 'center' }}
            />
            <Chip
              color="default"
              variant="filled"
              label={`📅 ${new Date(image.uploaded_at).toLocaleDateString()}`}
              sx={{ justifyContent: 'center' }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}