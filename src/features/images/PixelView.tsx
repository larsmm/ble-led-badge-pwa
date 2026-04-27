import {
  CSSProperties,
  ChangeEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState
} from "react";

import {
  BinaryPixelGrid
} from "./custom-image";
import { getPixelSize } from "./pixel-grid";

type PixelViewProps = {
  customImageGrid: BinaryPixelGrid;
  customImageShowThreshold: boolean;
  customImageThreshold: number;
  isBusy: boolean;
  isPresetUpdate: boolean;
  onClearImage: () => void;
  onDeletePreset: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInvertImage: () => void;
  onLoadPreset: () => void;
  onPixelPointerDown: (row: number, column: number) => void;
  onPixelPointerEnter: (row: number, column: number) => void;
  onPixelPointerEnd: () => void;
  onPresetNameChange: (name: string) => void;
  onSavePreset: () => void;
  onSaveImage: () => void;
  onSelectPreset: (presetId: string) => void;
  onThresholdChange: (event: ChangeEvent<HTMLInputElement>) => void;
  pixelPresetName: string;
  presets: Array<{ id: string; label: string; previewDataUrl: string }>;
  selectedPresetId: string;
};

export function PixelView({
  customImageGrid,
  customImageShowThreshold,
  customImageThreshold,
  isBusy,
  isPresetUpdate,
  onClearImage,
  onDeletePreset,
  onFileChange,
  onInvertImage,
  onLoadPreset,
  onPixelPointerDown,
  onPixelPointerEnter,
  onPixelPointerEnd,
  onPresetNameChange,
  onSavePreset,
  onSaveImage,
  onSelectPreset,
  onThresholdChange,
  pixelPresetName,
  presets,
  selectedPresetId
}: PixelViewProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const wasLandscapeRef = useRef(false);
  const [pixelSize, setPixelSize] = useState(8);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const updatePixelSize = () => {
      setPixelSize(getPixelSize(editor.clientWidth));
    };

    updatePixelSize();

    const resizeObserver = new ResizeObserver(updatePixelSize);
    resizeObserver.observe(editor);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isCoarsePointer = () => window.matchMedia("(pointer: coarse)").matches;
    const isLandscape = () => window.innerWidth > window.innerHeight;

    wasLandscapeRef.current = isLandscape();

    const scrollEditorIntoView = () => {
      if (!editorRef.current || !isCoarsePointer()) {
        return;
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          editorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
          });
        });
      });
    };

    const handleViewportChange = () => {
      const landscape = isLandscape();
      const switchedToLandscape = landscape && !wasLandscapeRef.current;
      wasLandscapeRef.current = landscape;

      if (switchedToLandscape) {
        scrollEditorIntoView();
      }
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, []);

  const gridStyle = {
    "--pixel-size": `${pixelSize}px`
  } as CSSProperties;

  const getPointerPixel = (event: PointerEvent<HTMLDivElement>) => {
    const gridRect = event.currentTarget.getBoundingClientRect();
    const gridGap = 1;
    const gridPadding = 1;
    const localX = event.clientX - gridRect.left - gridPadding;
    const localY = event.clientY - gridRect.top - gridPadding;
    const pixelPitch = pixelSize + gridGap;
    const column = Math.floor(localX / pixelPitch);
    const row = Math.floor(localY / pixelPitch);

    if (row < 0 || row >= 12 || column < 0 || column >= 48) {
      return null;
    }

    return { row, column };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isBusy) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    const pixel = getPointerPixel(event);
    if (pixel) {
      onPixelPointerDown(pixel.row, pixel.column);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const pixel = getPointerPixel(event);
    if (pixel) {
      onPixelPointerEnter(pixel.row, pixel.column);
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    activePointerIdRef.current = null;
    onPixelPointerEnd();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <article className="panel pixel-view">
      <label className="field-label" htmlFor="pixel-preset-name">
        Preset
      </label>
      <div className="preset-manager pixel-preset-manager">
        <input
          id="pixel-preset-name"
          className="text-input"
          type="text"
          value={pixelPresetName}
          onChange={(event) => onPresetNameChange(event.target.value)}
          placeholder="Preset name"
          disabled={isBusy}
          aria-label="Pixel preset name"
        />
        <button
          className="secondary-button"
          type="button"
          onClick={onLoadPreset}
          disabled={isBusy || presets.length === 0}
        >
          Load
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={onSavePreset}
          disabled={isBusy || pixelPresetName.trim().length === 0}
        >
          {isPresetUpdate ? "Update" : "Save"}
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={onDeletePreset}
          disabled={isBusy || presets.length === 0}
        >
          Delete
        </button>
      </div>
      <div className="pixel-preset-picker" role="listbox" aria-label="Saved pixel presets">
        {presets.length === 0 ? (
          <div className="pixel-preset-empty">No presets</div>
        ) : (
          presets.map((preset) => (
            <button
              key={preset.id}
              className={`pixel-preset-option ${
                preset.id === selectedPresetId ? "pixel-preset-selected" : ""
              }`}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              disabled={isBusy}
              role="option"
              aria-selected={preset.id === selectedPresetId}
            >
              <img
                className="pixel-preset-preview"
                src={preset.previewDataUrl}
                alt={preset.label}
                title={preset.label}
              />
            </button>
          ))
        )}
      </div>

      <div className="pixel-workspace">
        <span className="field-label">
          Editor
        </span>
        <div className="pixel-editor" ref={editorRef}>
          <div
            className="pixel-editor-grid"
            style={gridStyle}
            aria-label="Badge pixel editor"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
          >
            {customImageGrid.map((row, rowIndex) =>
              row.map((isLit, columnIndex) => (
                <button
                  key={`${rowIndex}-${columnIndex}`}
                  className={`pixel-cell ${isLit ? "pixel-on" : "pixel-off"}`}
                  type="button"
                  disabled={isBusy}
                  aria-label={`Toggle pixel row ${rowIndex + 1} column ${columnIndex + 1}`}
                />
              ))
            )}
          </div>
        </div>
        {customImageShowThreshold ? (
          <div className="source-threshold">
            <label className="field-label" htmlFor="custom-image-threshold">
              Threshold: {customImageThreshold}
            </label>
            <input
              id="custom-image-threshold"
              className="range-input"
              type="range"
              min="0"
              max="255"
              value={customImageThreshold}
              onChange={onThresholdChange}
              disabled={isBusy}
            />
          </div>
        ) : null}
        <div className="button-row">
          <label className="file-picker-label pixel-action-button" htmlFor="custom-image-file">
            <span>Load File</span>
            <input
              id="custom-image-file"
              className="file-input"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              disabled={isBusy}
            />
          </label>
          <button
            className="secondary-button pixel-action-button"
            type="button"
            onClick={onSaveImage}
            disabled={isBusy}
          >
            Save File
          </button>
          <button
            className="secondary-button pixel-action-button"
            type="button"
            onClick={onInvertImage}
            disabled={isBusy}
          >
            Invert Image
          </button>
          <button
            className="secondary-button pixel-action-button"
            type="button"
            onClick={onClearImage}
            disabled={isBusy}
          >
            Clear
          </button>
        </div>
      </div>
    </article>
  );
}
