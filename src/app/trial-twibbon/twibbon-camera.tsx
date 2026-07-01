"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Download, ExternalLink, RefreshCcw, RotateCcw, Send, ShieldCheck } from "lucide-react";
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
  const capturedImageRef = useRef("");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const isMirrored = facingMode === "user";

  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedImageRef.current.startsWith("blob:")) URL.revokeObjectURL(capturedImageRef.current);
    };
  }, []);

  async function startCamera(nextFacingMode = facingMode) {
    setError("");
    clearCapturedImage();
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
    stopCamera();
  }

  function clearCapturedImage() {
    setCapturedImage((currentImage) => {
      if (currentImage.startsWith("blob:")) URL.revokeObjectURL(currentImage);
      capturedImageRef.current = "";
      return "";
    });
    setCapturedBlob(null);
  }

  function retakePhoto() {
    clearCapturedImage();
    void startCamera(facingMode);
  }

  function switchCamera() {
    const nextFacingMode = facingMode === "user" ? "environment" : "user";
    void startCamera(nextFacingMode);
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

        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {!capturedImage ? (
            <>
              <Button type="button" size="lg" className="h-12 text-base" onClick={() => void startCamera(facingMode)}>
                <Camera className="h-5 w-5" />
                {cameraReady ? "Restart" : "Start Camera"}
              </Button>
              <Button type="button" size="lg" variant="secondary" className="h-12 text-base" onClick={switchCamera}>
                <RefreshCcw className="h-5 w-5" />
                Switch
              </Button>
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
            Open the camera, keep your face centered inside the LEAD frame, then capture and download the final square image for Instagram.
            The photo is created inside your browser and is not uploaded.
          </p>
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
