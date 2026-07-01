"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Download, RefreshCcw, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const frameSrc = "/images/trial-twibbon-frame.png";
const outputWidth = 1080;
const outputHeight = 1080;

function drawCoverImage(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  mirrored: boolean
) {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const videoRatio = videoWidth / videoHeight;
  const canvasRatio = width / height;
  const sourceWidth = videoRatio > canvasRatio ? videoHeight * canvasRatio : videoWidth;
  const sourceHeight = videoRatio > canvasRatio ? videoHeight : videoWidth / canvasRatio;
  const sourceX = (videoWidth - sourceWidth) / 2;
  const sourceY = (videoHeight - sourceHeight) / 2;

  context.save();
  if (mirrored) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  context.restore();
}

export function TwibbonCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const isMirrored = facingMode === "user";

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera(nextFacingMode = facingMode) {
    setError("");
    setCapturedImage("");
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

    drawCoverImage(context, video, outputWidth, outputHeight, isMirrored);

    const frame = new Image();
    frame.crossOrigin = "anonymous";
    frame.src = frameSrc;
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error("Unable to load twibbon frame."));
    });

    context.drawImage(frame, 0, 0, outputWidth, outputHeight);
    setCapturedImage(canvas.toDataURL("image/png"));
    stopCamera();
  }

  function retakePhoto() {
    setCapturedImage("");
    void startCamera(facingMode);
  }

  function switchCamera() {
    const nextFacingMode = facingMode === "user" ? "environment" : "user";
    void startCamera(nextFacingMode);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr] lg:items-start">
      <Card className="overflow-hidden p-4 shadow-soft sm:p-5">
        <div className="relative mx-auto aspect-square max-h-[76vh] w-full max-w-[560px] overflow-hidden rounded-[28px] bg-lead-navy shadow-soft">
          {capturedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedImage} alt="Captured LEAD trial twibbon" className="h-full w-full object-cover" />
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
      </Card>

      <div className="grid gap-4">
        <Card className="p-5 sm:p-6">
          <p className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-lead-blue">
            <ShieldCheck className="h-4 w-4" />
            Private on your device
          </p>
          <h2 className="mt-4 font-heading text-2xl font-extrabold text-lead-navy">Capture your trial class photo</h2>
          <p className="mt-3 leading-7 text-lead-gray">
            Open the camera, use the large center space, then capture and download the final square twibbon image for Instagram.
            The photo is created inside your browser and is not uploaded.
          </p>

          {error ? <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</p> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {!capturedImage ? (
              <>
                <Button type="button" size="lg" onClick={() => void startCamera(facingMode)}>
                  <Camera className="h-4 w-4" />
                  {cameraReady ? "Restart Camera" : "Start Camera"}
                </Button>
                <Button type="button" size="lg" variant="secondary" onClick={switchCamera}>
                  <RefreshCcw className="h-4 w-4" />
                  Switch Camera
                </Button>
                <Button type="button" size="lg" className="sm:col-span-2" disabled={!cameraReady} onClick={capturePhoto}>
                  Capture Photo
                  <Camera className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg">
                  <a href={capturedImage} download="lead-trial-twibbon.png">
                    <Download className="h-4 w-4" />
                    Download Photo
                  </a>
                </Button>
                <Button type="button" size="lg" variant="secondary" onClick={retakePhoto}>
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
              </>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-heading text-lg font-bold text-lead-navy">Tips</h3>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-lead-gray">
            <p>Use good lighting so your face is clear.</p>
            <p>Keep your face centered inside the large frame area.</p>
            <p>After downloading, share the picture as an Instagram post, class group photo, or social story.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
