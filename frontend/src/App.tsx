
import './App.css'
import { useEffect, useRef, useState } from 'react';

const samplePrompts = [
  "turn the hand drawing into realistic object",
  "color it",
  "sharpen it",
  "convert it to 3d object",
  "turn it to Ghibli style",
];

function App() {
  const [apiBase, setApiBase] = useState<string>("http://127.0.0.1:8000");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [, setImage] = useState<File | null>(null);
  const [, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [guidance, setGuidance] = useState(1.0);
  const [numSteps, setNumSteps] = useState(6);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // === Drawing Pad ===
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    setLastPos(pos);
    setDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas || !lastPos) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newPos = getPos(e, canvas);

    requestAnimationFrame(() => {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(newPos.x, newPos.y);
      ctx.strokeStyle = isEraser ? "white" : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      setLastPos(newPos);
    });
  };

  const stopDrawing = () => {
    if (!drawing) return;
    setDrawing(false);
    setLastPos(null);
    
    // Save current state for undo
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setHistory((prev) => [...prev, dataUrl]);
      setRedoStack([]);
    }
  };

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Adjust based on canvas scaling ratio
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // === Undo / Redo / Clear ===
  const undo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = [...history];
    const last = newHistory.pop()!;
    setRedoStack((prev) => [...prev, last]);
    setHistory(newHistory);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (newHistory.length > 0) {
      const img = new Image();
      img.src = newHistory[newHistory.length - 1];
      img.onload = () => ctx.drawImage(img, 0, 0);
    }
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newRedo = [...redoStack];
    const restore = newRedo.pop()!;
    setRedoStack(newRedo);
    setHistory((prev) => [...prev, restore]);

    const img = new Image();
    img.src = restore;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPreview(null);
    setImage(null);
    setHistory([]);
    setRedoStack([]);
  };

  // === Backend integration ===
  const handleGenerate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert("Canvas not found");
      return;
    }
    if (!prompt.trim()) {
      alert("Please draw something and enter a prompt.");
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) {
      alert("Failed to read canvas data");
      return;
    }

    const file = new File([blob], "drawing.png", { type: "image/png" });
    setImage(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setLoading(true);
    setOutputImage(null);

    const form = new FormData();
    form.append("image", file);
    form.append("prompt", prompt);
    form.append("neg_prompt", "");
    form.append("guidance_scale", guidance.toString());
    form.append("num_steps", numSteps.toString());

    try {
      const res = await fetch(`${apiBase.replace(/\/+$/, "")}/generate`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      setOutputImage(`data:image/png;base64,${json.image}`);
    } catch (err) {
      alert("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Custom drawing cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="6" cy="6" r="3" fill="${encodeURIComponent(
        brushColor
      )}"/></svg>') 3 3, crosshair`;
    }
  }, [brushColor, brushSize, isEraser]);

  return (
    <div className="max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="p-4 bg-white border-b shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-semibold">Draw something AWESOME!</h1>

        <button
          onClick={() => setShowSettings((s) => !s)}
          className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          {showSettings ? "Hide Settings" : "Settings"}
        </button>
      </div>

      {/* SETTINGS PANEL */}
      {showSettings && (
        <div className="p-4 bg-white border-b shadow-sm space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col w-1/3">
              {/* <label className="text-sm font-medium mb-1">API Base</label> */}
              <input
                type="text"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className="p-2 border rounded w-full"
              />
            </div>

            <div className="flex flex-col w-1/3">
              <label className="text-sm font-medium mb-1">
                Steps: {numSteps}
              </label>
              <input
                type="range"
                min={4}
                max={100}
                value={numSteps}
                onChange={(e) => setNumSteps(Number(e.target.value))}
                className="accent-gray-600"
              />
            </div>

            <div className="flex flex-col w-1/3">
              <label className="text-sm font-medium mb-1">
                Guidance: {guidance.toFixed(1)}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                step={0.1}
                value={guidance}
                onChange={(e) => setGuidance(Number(e.target.value))}
                className="accent-gray-600"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8 justify-center">
        {/* === LEFT SIDE === */}
        <div className="w-full md:w-1/2">
          <div className="relative border border-gray-700 rounded-lg bg-white flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              className="rounded-lg w-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div className="flex justify-between mt-3 gap-3 text-white">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded w-1/3 disabled:opacity-40"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded w-1/3 disabled:opacity-40"
            >
              ↷ Redo
            </button>
            <button
              onClick={clearCanvas}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded w-1/3"
            >
              ⛶ Clear
            </button>
          </div>

          <div className="flex justify-between mt-3 gap-3">
            <div className="flex flex-col items-start w-1/3">
              <label className="text-gray-400 text-sm mb-1">🎨</label>
              <input
                type="color"
                value={brushColor}
                disabled={isEraser}
                onChange={(e) => setBrushColor(e.target.value)}
                className={`w-full h-10 cursor-pointer ${
                  isEraser ? "opacity-50" : ""
                }`}
              />
            </div>

            <div className="flex flex-col items-start w-1/3">
              <label className="text-gray-400 text-sm mb-1">✒️ Size: {brushSize}</label>
              <input
                type="range"
                min={1}
                max={20}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-gray-600"
              />
            </div>

            <div className="flex flex-col items-start w-1/3">
              <label className="text-gray-400 text-sm mb-1">✏️</label>
              <button
                onClick={() => setIsEraser(!isEraser)}
                className={`w-full px-3 py-2 rounded font-semibold text-white ${
                  isEraser
                    ? "bg-gray-600 hover:bg-gray-500"
                    : "bg-gray-800 hover:bg-gray-600"
                }`}
              >
                {isEraser ? "🩹 Eraser" : "🖌 Brush"}
              </button>
            </div>
          </div>

          <label className="block text-gray-400 text-sm mb-1 text-left">Prompt</label>
          <input
            type="text"
            className="w-full border border-gray-700 rounded-lg p-2 bg-gray-800 text-white"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {samplePrompts.map((sp, i) => (
              <button
                key={i}
                className="bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 rounded"
                onClick={() => setPrompt(sp)}
              >
                {sp}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`mt-6 ${loading ? "bg-gray-400" : "bg-gray-800 hover:bg-gray-600"} px-6 py-2 rounded-lg font-semibold w-full  text-white`}
          >
            {loading ? "Generating..." : "Generate"}
          </button>

        </div>

        {/* === RIGHT SIDE === */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
          <div className="w-full min-h-[320px] rounded flex items-center justify-center">
          {outputImage ? (
            <img
              src={outputImage}
              alt="Output"
              className="rounded-lg border border-gray-700 max-h-[500px]"
            />
          ) : (
            <p className="text-gray-500 text-center">
              {!loading && "Your generated image will appear here."}
              {loading && (
                <div className="grid grid-cols-1 grid-rows-1 place-items-center animate-pulse">
                  Thinking...
                </div>
              )}
            </p>
          )}
          </div>
          
          <div className="mt-3 flex gap-2">
            {outputImage && (
              <a
                className="bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 rounded"
                href={outputImage}
                download="output.png"
              >
                Download Picture
              </a>
            )}

            {outputImage && (
              <button
                className="bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 rounded"
                onClick={() => {
                  setOutputImage(null);
                }}
              >
                Clear Output
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

export default App
