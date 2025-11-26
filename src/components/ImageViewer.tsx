'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card, CardBody, Chip, Spacer } from '@nextui-org/react';

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
      fabric.fabric.Image.fromURL(`http://localhost:3001${image.filepath}`, (img) => {
        if (!canvas) return;

        // Fit image to canvas without zooming
        const canvasWidth = canvas.width || 800;
        const canvasHeight = canvas.height || 600;
        const imgAspect = img.width! / img.height!;
        const canvasAspect = canvasWidth / canvasHeight;

        let scale;
        if (imgAspect > canvasAspect) {
          // Image is wider, fit to width
          scale = canvasWidth / img.width!;
        } else {
          // Image is taller, fit to height
          scale = canvasHeight / img.height!;
        }

        img.scale(scale);
        canvas.add(img);
        canvas.centerObject(img);

        // Create initial cropping rectangle covering the entire scaled image
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

        // Ensure rectangle is always on top
        canvas.add(rect);
        rect.bringToFront();
        canvas.renderAll();
      });

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
    <div className="w-full h-full flex flex-col p-4">
      <Card className="mb-4">
        <CardBody>
          <div className="flex justify-between items-center">
            <Button
              color="secondary"
              variant="flat"
              onPress={onBack}
              startContent={<span>⬅️</span>}
            >
              Back to Gallery
            </Button>
            <h3 className="text-xl font-bold text-center flex-1">{image.filename}</h3>
            <div className="flex gap-2">
              <Button
                color="primary"
                onPress={handleCrop}
                startContent={<span>✂️</span>}
              >
                Crop Selection
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="flex-1">
        <CardBody className="p-0 h-full">
          {!fabricLoaded ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg">Loading image editor...</p>
              </div>
            </div>
          ) : (
            <canvas ref={canvasRef} width={800} height={600} className="w-full h-full rounded-lg" />
          )}
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardBody>
          <div className="grid grid-cols-3 gap-4">
            <Chip color="primary" variant="flat" className="justify-center">
              📏 {(image.size / 1024 / 1024).toFixed(2)} MB
            </Chip>
            <Chip color="secondary" variant="flat" className="justify-center">
              🏷️ {image.mimetype.split('/')[1].toUpperCase()}
            </Chip>
            <Chip color="default" variant="flat" className="justify-center">
              📅 {new Date(image.uploaded_at).toLocaleDateString()}
            </Chip>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}