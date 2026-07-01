"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Download, ExternalLink, ImageUp, RefreshCcw, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const frameSrc = "/images/trial-twibbon-frame.png";
const outputWidth = 1080;
const outputHeight = 1080;
const defaultGalleryTransform = { zoom: 1.1, x: 0, y: 0 };
const minGalleryZoom = 1;
const maxGalleryZoom = 2.2;

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  mirrored: boolean
) {
  const videoRatio = imageWidth / imageHeight;
  const canvasRatio = width / height;
  const sourceWidth = videoRatio > canvasRatio ? imageHeight * canvasRatio : imageWidth;
  const sourceHeight = videoRatio > canvasRatio ? imageHeight : imageWidth / canvasRatio;
  const sourceX = (imageWidth - sourceWidth) / 2;
  const sourceY = (imageHeight - sourceHeight) / 2;

  context.save();
  if (mirrored) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  context.restore();
}

function loadImage(src: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));
  });
}

function drawAdjustedImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  transform: { zoom: number; x: number; y: number }
) {
  const imageRatio = imageWidth / imageHeight;
  const canvasRatio = outputWidth / outputHeight;
  const baseWidth = imageRatio > canvasRatio ? outputHeight * imageRatio : outputWidth;
  const baseHeight = imageRatio > canvasRatio ? outputHeight : outputWidth / imageRatio;
  const drawWidth = baseWidth * transform.zoom;
  const drawHeight = baseHeight * transform.zoom;
  const drawX = (outputWidth - drawWidth) / 2 + (transform.x / 100) * outputWidth;
  const drawY = (outputHeight - drawHeight) / 2 + (transform.y / 100) * outputHeight;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampGalleryTransform(transform: { zoom: number; x: number; y: number }) {
  return {
    zoom: clamp(transform.zoom, minGalleryZoom, maxGalleryZoom),
    x: clamp(transform.x, -35, 35),
    y: clamp(transform.y, -35, 35)
  };
}

function getPointerDistance(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getPointerCenter(first: { x: number; y: number }, second: { x: number; y: number }) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2
  };
}

export function TwibbonCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedImageRef = useRef("");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [galleryImage, setGalleryImage] = useState("");
  const galleryImageRef = useRef("");
  const [galleryTransform, setGalleryTransform] = useState(defaultGalleryTransform);
  const galleryTransformRef = useRef(defaultGalleryTransform);
  const gestureRef = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    lastCenter: null as { x: number; y: number } | null,
    startDistance: 0,
    startZoom: defaultGalleryTransform.zoom
  });
  const isMirrored = facingMode === "user";

  useEffect(() => {
    galleryTransformRef.current = galleryTransform;
  }, [galleryTransform]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedImageRef.current.startsWith("blob:")) URL.revokeObjectURL(capturedImageRef.current);
      if (galleryImageRef.current.startsWith("blob:")) URL.revokeObjectURL(galleryImageRef.current);
    };
  }, []);

  async function startCamera(nextFacingMode = facingMode) {
    setError("");
    clearCapturedImage();
    clearGalleryImage();
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser. Please open this page in Chrome, Safari, or Edge.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacingMode,
          width: { ideal: 1080 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFacingMode(nextFacingMode);
      setCameraReady(true);
    } catch {
      setCameraReady(false);
      setError("Camera permission was blocked or unavailable. Please allow camera access and try again.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera is still loading. Please try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    drawCoverImage(context, video, video.videoWidth, video.videoHeight, outputWidth, outputHeight, isMirrored);

    const frame = await loadImage(frameSrc);
    context.drawImage(frame, 0, 0, outputWidth, outputHeight);
    await saveCanvasResult(canvas);
    stopCamera();
  }

  async function useGalleryPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image from your gallery.");
      return;
    }

    setError("");
    clearCapturedImage();
    stopCamera();

    const photoUrl = URL.createObjectURL(file);
    clearGalleryImage();
    galleryImageRef.current = photoUrl;
    setGalleryImage(photoUrl);
    setGalleryTransform(defaultGalleryTransform);
  }

  async function applyGalleryPhoto() {
    if (!galleryImage) return;

    try {
      const [photo, frame] = await Promise.all([loadImage(galleryImage), loadImage(frameSrc)]);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context) return;

      drawAdjustedImage(context, photo, photo.naturalWidth, photo.naturalHeight, galleryTransform);
      context.drawImage(frame, 0, 0, outputWidth, outputHeight);
      await saveCanvasResult(canvas);
      clearGalleryImage();
    } catch {
      setError("Unable to use this gallery image. Please try another photo.");
    }
  }

  async function saveCanvasResult(canvas: HTMLCanvasElement) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      setError("Unable to prepare the photo for download. Please try again.");
      return;
    }

    clearCapturedImage();
    const imageUrl = URL.createObjectURL(blob);
    capturedImageRef.current = imageUrl;
    setCapturedBlob(blob);
    setCapturedImage(imageUrl);
  }

  function clearCapturedImage() {
    setCapturedImage((currentImage) => {
      if (currentImage.startsWith("blob:")) URL.revokeObjectURL(currentImage);
      capturedImageRef.current = "";
      return "";
    });
    setCapturedBlob(null);
  }

  function clearGalleryImage() {
    setGalleryImage((currentImage) => {
      if (currentImage.startsWith("blob:")) URL.revokeObjectURL(currentImage);
      galleryImageRef.current = "";
      return "";
    });
    gestureRef.current.pointers.clear();
    gestureRef.current.lastCenter = null;
  }

  function retakePhoto() {
    clearCapturedImage();
    clearGalleryImage();
    void startCamera(facingMode);
  }

function switchCamera() {
    const nextFacingMode = facingMode === "user" ? "environment" : "user";
    void startCamera(nextFacingMode);
  }

  function updateGalleryTransform(nextTransform: { zoom: number; x: number; y: number }) {
    const clampedTransform = clampGalleryTransform(nextTransform);
    galleryTransformRef.current = clampedTransform;
    setGalleryTransform(clampedTransform);
  }

  function handlePreviewPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!galleryImage || capturedImage) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const pointers = gestureRef.current.pointers;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      gestureRef.current.lastCenter = { x: event.clientX, y: event.clientY };
      return;
    }

    const [first, second] = Array.from(pointers.values()).slice(0, 2);
    gestureRef.current.startDistance = getPointerDistance(first, second);
    gestureRef.current.startZoom = galleryTransformRef.current.zoom;
    gestureRef.current.lastCenter = getPointerCenter(first, second);
  }

  function handlePreviewPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!galleryImage || capturedImage) return;

    const preview = previewRef.current;
    const pointers = gestureRef.current.pointers;
    if (!preview || !pointers.has(event.pointerId)) return;

    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const rect = preview.getBoundingClientRect();
    const currentTransform = galleryTransformRef.current;

    if (pointers.size === 1) {
      const currentPoint = pointers.get(event.pointerId);
      const lastCenter = gestureRef.current.lastCenter;
      if (!currentPoint || !lastCenter) return;

      updateGalleryTransform({
        ...currentTransform,
        x: currentTransform.x + ((currentPoint.x - lastCenter.x) / rect.width) * 100,
        y: currentTransform.y + ((currentPoint.y - lastCenter.y) / rect.height) * 100
      });
      gestureRef.current.lastCenter = currentPoint;
      return;
    }

    const [first, second] = Array.from(pointers.values()).slice(0, 2);
    const center = getPointerCenter(first, second);
    const lastCenter = gestureRef.current.lastCenter ?? center;
    const distance = getPointerDistance(first, second);
    const zoomRatio = gestureRef.current.startDistance ? distance / gestureRef.current.startDistance : 1;

    updateGalleryTransform({
      zoom: gestureRef.current.startZoom * zoomRatio,
      x: currentTransform.x + ((center.x - lastCenter.x) / rect.width) * 100,
      y: currentTransform.y + ((center.y - lastCenter.y) / rect.height) * 100
    });
    gestureRef.current.lastCenter = center;
  }

  function handlePreviewPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!galleryImage || capturedImage) return;

    const pointers = gestureRef.current.pointers;
    pointers.delete(event.pointerId);

    if (pointers.size === 1) {
      const [remainingPointer] = Array.from(pointers.values());
      gestureRef.current.lastCenter = remainingPointer;
      gestureRef.current.startZoom = galleryTransformRef.current.zoom;
      return;
    }

    if (pointers.size >= 2) {
      const [first, second] = Array.from(pointers.values()).slice(0, 2);
      gestureRef.current.startDistance = getPointerDistance(first, second);
      gestureRef.current.startZoom = galleryTransformRef.current.zoom;
      gestureRef.current.lastCenter = getPointerCenter(first, second);
      return;
    }

    gestureRef.current.lastCenter = null;
  }

  async function sharePhoto() {
    if (!capturedBlob) return;

    const file = new File([capturedBlob], "lead-trial-twibbon.png", { type: "image/png" });
    const shareNavigator = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };

    if (!shareNavigator.share || !shareNavigator.canShare?.({ files: [file] })) {
      setError("Sharing is not supported in this browser. Please use Download or Open Image.");
      return;
    }

    try {
      await shareNavigator.share({
        title: "LEAD Trial Twibbon",
        text: "My LEAD free trial class photo",
        files: [file]
      });
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setError("Unable to open sharing. Please use Download or Open Image.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,560px)_1fr] lg:items-start">
      <Card className="overflow-hidden p-3 shadow-soft sm:p-5">
        <div
          ref={previewRef}
          className={`relative mx-auto aspect-square max-h-[76vh] w-full max-w-[560px] overflow-hidden rounded-[28px] bg-lead-navy shadow-soft ${
            galleryImage && !capturedImage ? "cursor-grab touch-none active:cursor-grabbing" : ""
          }`}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handlePreviewPointerMove}
          onPointerUp={handlePreviewPointerEnd}
          onPointerCancel={handlePreviewPointerEnd}
          onPointerLeave={handlePreviewPointerEnd}
        >
          {capturedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedImage} alt="Captured LEAD trial twibbon" className="h-full w-full object-cover" />
          ) : galleryImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={galleryImage}
                alt="Selected gallery photo preview"
                className="h-full w-full object-cover"
                style={{
                  transform: `translate(${galleryTransform.x}%, ${galleryTransform.y}%) scale(${galleryTransform.zoom})`
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frameSrc} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            </>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${isMirrored ? "-scale-x-100" : ""}`}
              />
              {!cameraReady ? (
                <div className="absolute inset-0 grid place-items-center bg-lead-navy text-center text-white">
                  <div className="px-6">
                    <Camera className="mx-auto h-12 w-12 text-lead-yellow" />
                    <p className="mt-4 font-heading text-2xl font-extrabold">Camera Preview</p>
                    <p className="mt-2 text-sm leading-6 text-blue-100">Tap Start Camera and use the large center space for your photo.</p>
                  </div>
                </div>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frameSrc} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            </>
          )}
        </div>

        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {galleryImage && !capturedImage ? (
            <>
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-lead-blue sm:col-span-2">
                Drag the photo to move it. Pinch with two fingers to zoom.
              </p>
              <AdjustSlider label="Zoom" min={minGalleryZoom} max={maxGalleryZoom} step={0.02} value={galleryTransform.zoom} onChange={(zoom) => updateGalleryTransform({ ...galleryTransformRef.current, zoom })} />
              <AdjustSlider label="Move Left / Right" min={-35} max={35} step={1} value={galleryTransform.x} onChange={(x) => updateGalleryTransform({ ...galleryTransformRef.current, x })} />
              <AdjustSlider label="Move Up / Down" min={-35} max={35} step={1} value={galleryTransform.y} onChange={(y) => updateGalleryTransform({ ...galleryTransformRef.current, y })} />
              <Button type="button" size="lg" className="h-14 text-lg sm:col-span-2" onClick={() => void applyGalleryPhoto()}>
                Apply Twibbon
              </Button>
              <Button type="button" size="lg" variant="secondary" className="h-12 text-base" onClick={() => updateGalleryTransform(defaultGalleryTransform)}>
                Reset Position
              </Button>
              <Button type="button" size="lg" variant="secondary" className="h-12 text-base" onClick={clearGalleryImage}>
                Choose Another
              </Button>
            </>
          ) : !capturedImage ? (
            <>
              <Button type="button" size="lg" className="h-12 text-base" onClick={() => void startCamera(facingMode)}>
                <Camera className="h-5 w-5" />
                {cameraReady ? "Restart" : "Start Camera"}
              </Button>
              <Button type="button" size="lg" variant="secondary" className="h-12 text-base" onClick={switchCamera}>
                <RefreshCcw className="h-5 w-5" />
                Switch
              </Button>
              <label className="focus-ring inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-base font-bold text-lead-navy transition hover:-translate-y-0.5 hover:shadow-soft sm:col-span-2">
                <ImageUp className="h-5 w-5" />
                Choose from Gallery
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => void useGalleryPhoto(event.target.files?.[0])}
                />
              </label>
              <Button type="button" size="lg" className="h-14 text-lg sm:col-span-2" disabled={!cameraReady} onClick={capturePhoto}>
                <Camera className="h-5 w-5" />
                Capture Photo
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg" className="h-14 text-lg">
                <a href={capturedImage} download="lead-trial-twibbon.png">
                  <Download className="h-5 w-5" />
                  Download
                </a>
              </Button>
              <Button type="button" size="lg" className="h-14 text-lg" onClick={() => void sharePhoto()}>
                <Send className="h-5 w-5" />
                Share / Save
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-14 text-lg">
                <a href={capturedImage} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-5 w-5" />
                  Open Image
                </a>
              </Button>
              <Button type="button" size="lg" variant="secondary" className="h-14 text-lg" onClick={retakePhoto}>
                <RotateCcw className="h-5 w-5" />
                Retake
              </Button>
            </>
          )}
        </div>
      </Card>

      <div className="grid gap-4">
        <Card className="p-5 sm:p-6">
          <p className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-lead-blue">
            <ShieldCheck className="h-4 w-4" />
            Private on your device
          </p>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-lead-navy">Capture your trial class photo</h2>
          <p className="mt-3 leading-7 text-lead-gray">
            Open the camera or choose a photo from your gallery, then download the final square image for Instagram.
            The photo is created inside your browser and is not uploaded.
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="font-heading text-lg font-bold text-lead-navy">Tips</h3>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-lead-gray">
            <p>Use good lighting so your face is clear.</p>
            <p>You can also choose an existing photo from your gallery.</p>
            <p>Keep your face centered inside the large frame area.</p>
            <p>After downloading, share the picture as an Instagram post, class group photo, or social story.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AdjustSlider({
  label,
  min,
  max,
  step,
  value,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-lead-navy sm:col-span-2">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="text-xs text-lead-gray">{label === "Zoom" ? `${Math.round(value * 100)}%` : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-lead-blue"
      />
    </label>
  );
}
