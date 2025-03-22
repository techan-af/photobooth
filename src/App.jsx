import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const videoRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState("");

  // 1) Initialize camera once
  useEffect(() => {
    let streamRef = null;
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { aspectRatio: 16 / 9 },
          audio: false,
        });
        streamRef = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Camera initialization error:", error);
      }
    }
    initCamera();

    return () => {
      if (streamRef) {
        streamRef.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2) Capture a single photo (16:9)
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = 640;
    const height = 360;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    setPhotos((prev) => [...prev, dataUrl]);
  };

  // 3) Capture three photos with countdown
  const captureThreePhotos = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setPhotos([]); // Clear old photos

    for (let i = 1; i <= 3; i++) {
      for (let sec = 3; sec >= 1; sec--) {
        setCountdown(`Photo ${i} in ${sec}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setCountdown("");
      capturePhoto();
      if (i < 3) await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setIsCapturing(false);
  };

  // 4) Draw the same overlay in the export canvas
  const drawOverlay = (ctx, x, y, w, h) => {
    // Corner lines
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // top-left corner
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 20);
    ctx.stroke();

    // top-right corner
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w - 20, y);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + 20);
    ctx.stroke();

    // bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + 20, y + h);
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h - 20);
    ctx.stroke();

    // bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + w, y + h);
    ctx.lineTo(x + w - 20, y + h);
    ctx.moveTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - 20);
    ctx.stroke();

    // "REC" text & timer (top-left)
    // Red dot
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(x + 10, y + 20, 5, 0, 2 * Math.PI);
    ctx.fill();

    // "REC"
    ctx.fillStyle = "#ff0000";
    ctx.font = "bold 14px monospace";
    ctx.fillText("REC", x + 22, y + 25);

    // Timer in white
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText("00:00:56", x + 55, y + 25);

    // Battery (top-right)
    const batteryX = x + w - 70; // adjust as needed
    const batteryY = y + 15;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    // battery outline
    ctx.strokeRect(batteryX, batteryY, 40, 12);
    // battery fill (70% full)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(batteryX, batteryY, 28, 12);
    // battery tip
    ctx.strokeRect(batteryX + 40, batteryY + 3, 2, 6);

    // Date (bottom-left)
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText("Date // 00/00/00", x + 5, y + h - 10);

    // Time (bottom-right)
    const timeText = "Time // 00:00";
    const measure = ctx.measureText(timeText).width;
    ctx.fillText(timeText, x + w - measure - 5, y + h - 10);
  };

  // 5) Custom export function with manual overlay
  const exportAsImage = async () => {
    if (photos.length === 0) return;

    const photoWidth = 320;
    const photoHeight = 180;
    const gap = 4;
    const topMargin = 30;
    const bottomMargin = 30;
    const sideMargin = 10;
    const numPhotos = photos.length;

    const canvasWidth = photoWidth + 2 * sideMargin;
    const canvasHeight =
      topMargin + numPhotos * photoHeight + (numPhotos - 1) * gap + bottomMargin;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");

    // Fill background white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Title at top
    ctx.fillStyle = "#000000";
    ctx.font = "16px monospace";
    const topLabel = "~ Genesis 4 ~";
    const topLabelWidth = ctx.measureText(topLabel).width;
    ctx.fillText(topLabel, (canvasWidth - topLabelWidth) / 2, 20);

    // Apply the same filter to the images
    ctx.filter = "grayscale(100%) brightness(1.1) contrast(1.2)";

    let y = topMargin;
    for (let i = 0; i < numPhotos; i++) {
      // Draw each photo
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, sideMargin, y, photoWidth, photoHeight);
          resolve();
        };
        img.onerror = reject;
        img.src = photos[i];
      });

      // Remove filter to draw the overlay in pure color (white corners, red rec)
      ctx.filter = "none";
      drawOverlay(ctx, sideMargin, y, photoWidth, photoHeight);
      // Reapply filter for next image
      ctx.filter = "grayscale(100%) brightness(1.1) contrast(1.2)";

      y += photoHeight + gap;
    }

    // Turn off filter for bottom label
    ctx.filter = "none";

    // Bottom label
    const bottomLabel = `Captured ${numPhotos} photo${numPhotos > 1 ? "s" : ""}`;
    const bottomLabelWidth = ctx.measureText(bottomLabel).width;
    ctx.fillText(bottomLabel, (canvasWidth - bottomLabelWidth) / 2, canvasHeight - 10);

    // Export canvas as JPEG
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const link = document.createElement("a");
    link.download = "photobooth.jpg";
    link.href = dataUrl;
    link.click();
  };

  // --- Overlays for the browser UI ---

  // A) Camera overlay (live camera)
  const CameraOverlay = () => {
    return (
      <div className="absolute inset-0 pointer-events-none text-xs text-red-500 font-mono">
        {/* Four corner brackets */}
        <div
          className="absolute border border-white w-6 h-6 top-0 left-0"
          style={{ borderRight: "none", borderBottom: "none" }}
        />
        <div
          className="absolute border border-white w-6 h-6 top-0 right-0"
          style={{ borderLeft: "none", borderBottom: "none" }}
        />
        <div
          className="absolute border border-white w-6 h-6 bottom-0 left-0"
          style={{ borderRight: "none", borderTop: "none" }}
        />
        <div
          className="absolute border border-white w-6 h-6 bottom-0 right-0"
          style={{ borderLeft: "none", borderTop: "none" }}
        />

        {/* REC text + timer (top-left) */}
        <div className="absolute top-2 left-2 flex items-center space-x-1 text-sm text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <span className="font-bold">REC</span>
          <span className="text-white">00:00:56</span>
        </div>

        {/* Battery (top-right) */}
        <div className="absolute top-2 right-2 text-white flex items-center space-x-1">
          <span className="text-sm">Battery</span>
          <div className="border border-white w-6 h-3 relative flex items-center">
            <div className="bg-white h-full" style={{ width: "70%" }}></div>
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-1 border border-white"></div>
          </div>
        </div>

        {/* Date (bottom-left) */}
        <div className="absolute bottom-2 left-2 text-white text-xs">
          Date // 00/00/00
        </div>

        {/* Time (bottom-right) */}
        <div className="absolute bottom-2 right-2 text-white text-xs">
          Time // 00:00
        </div>
      </div>
    );
  };

  // B) Photo overlay (preview)
  const PhotoOverlay = () => {
    return (
      <div
        className="absolute inset-0 pointer-events-none text-xs font-mono"
        style={{ color: "#f00" }}
      >
        {/* Four corner brackets */}
        <div
          className="absolute border border-white w-6 h-6 top-0 left-0"
          style={{ borderRight: "none", borderBottom: "none" }}
        />
        <div
          className="absolute border border-white w-6 h-6 top-0 right-0"
          style={{ borderLeft: "none", borderBottom: "none" }}
        />
        <div
          className="absolute border border-white w-6 h-6 bottom-0 left-0"
          style={{ borderRight: "none", borderTop: "none" }}
        />
        <div
          className="absolute border border-white w-6 h-6 bottom-0 right-0"
          style={{ borderLeft: "none", borderTop: "none" }}
        />

        {/* REC text + timer (top-left) */}
        <div className="absolute top-2 left-2 flex items-center space-x-1 text-sm text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <span className="font-bold">REC</span>
          <span className="text-white">00:00:56</span>
        </div>

        {/* Battery (top-right) */}
        <div className="absolute top-2 right-2 text-white flex items-center space-x-1">
          <span className="text-sm">Battery</span>
          <div className="border border-white w-6 h-3 relative flex items-center">
            <div className="bg-white h-full" style={{ width: "70%" }}></div>
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-1 border border-white"></div>
          </div>
        </div>

        {/* Date (bottom-left) */}
        <div className="absolute bottom-2 left-2 text-white text-xs">
          Date // 00/00/00
        </div>

        {/* Time (bottom-right) */}
        <div className="absolute bottom-2 right-2 text-white text-xs">
          Time // 00:00
        </div>
      </div>
    );
  };

  // Inline styles for the polaroid preview
  const polaroidContainerStyle = {
    backgroundColor: "#ffffff",
    color: "#000000",
    padding: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
    borderRadius: "4px",
    position: "relative",
  };

  const polaroidLabelStyle = {
    position: "absolute",
    top: "4px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#ffffff",
    padding: "2px 4px",
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#333333",
  };

  const photoStyle = {
    width: "320px",
    height: "180px",
    border: "1px solid #ccc",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "grayscale(100%) brightness(1.1) contrast(1.2)",
    marginBottom: "4px",
    position: "relative",
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="flex flex-col md:flex-row w-full max-w-6xl">
        {/* --- Left: Camera view --- */}
        <div className="relative flex-1 flex flex-col items-center p-4">
          <div className="relative w-full aspect-video bg-black overflow-hidden rounded shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                filter: "grayscale(100%) brightness(1.1) contrast(1.2)",
              }}
            />
            {/* Countdown overlay */}
            {countdown && (
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <span className="text-4xl font-bold">{countdown}</span>
              </div>
            )}
            {/* Live camera overlay */}
            <CameraOverlay />
          </div>

          <div className="mt-4">
            <button
              onClick={captureThreePhotos}
              disabled={isCapturing}
              className="w-16 h-16 bg-white rounded-full border-4 border-gray-400 hover:border-gray-200 disabled:opacity-50"
            />
          </div>

          <div className="mt-4">
            <button
              onClick={exportAsImage}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
            >
              Export Photos
            </button>
          </div>
        </div>

        {/* --- Right: Polaroid photo strip --- */}
        <div className="flex-1 flex flex-col items-center p-4">
          <h2
            style={{
              color: "#ffffff",
              fontFamily: "sans-serif",
              marginBottom: "16px",
            }}
          >
            Polaroid Strip
          </h2>
          <div style={polaroidContainerStyle}>
            <div style={polaroidLabelStyle}>~ Genesis 4 ~</div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "28px",
              }}
            >
              {photos.map((photo, idx) => (
                <div
                  key={idx}
                  style={{
                    ...photoStyle,
                    backgroundImage: `url(${photo})`,
                  }}
                >
                  {/* Photo overlay (in browser preview) */}
                  <PhotoOverlay />
                </div>
              ))}
            </div>
            <div
              style={{
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#555",
              }}
            >
              {photos.length > 0
                ? `Captured ${photos.length} photo${photos.length > 1 ? "s" : ""}`
                : "No photos yet"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}