import { ChangeEvent, useRef, useState } from "react";

import {
  SYMBOL_PICKER_ITEMS,
  SymbolSize,
  ScrollMode,
  TextRenderer
} from "../../lib/badge-protocol";

type ScrollOption = {
  label: string;
  value: ScrollMode;
};

type TextPreset = {
  id: string;
  label: string;
};

type TextViewProps = {
  brightness: number;
  isBusy: boolean;
  letterSpacing: number;
  message: string;
  onBrightnessChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDeletePreset: () => void;
  onLetterSpacingChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadPreset: (presetId: string) => void;
  onMessageChange: (message: string) => void;
  onSavePreset: () => void;
  onScrollModeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onSpaceWidthAdjustmentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSpeedChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTextFontChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  presets: TextPreset[];
  scrollMode: ScrollMode;
  scrollOptions: ScrollOption[];
  selectedPresetId: string;
  selectedTextFontId: string;
  spaceWidthAdjustment: number;
  speed: number;
};

export function TextView({
  brightness,
  isBusy,
  letterSpacing,
  message,
  onBrightnessChange,
  onDeletePreset,
  onLetterSpacingChange,
  onLoadPreset,
  onMessageChange,
  onSavePreset,
  onScrollModeChange,
  onSpaceWidthAdjustmentChange,
  onSpeedChange,
  onTextFontChange,
  presets,
  scrollMode,
  scrollOptions,
  selectedPresetId,
  selectedTextFontId,
  spaceWidthAdjustment,
  speed
}: TextViewProps) {
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [symbolSize, setSymbolSize] = useState<SymbolSize>("large");

  function insertSymbol(sequence: string): void {
    const input = messageInputRef.current;
    const selectionStart = input?.selectionStart ?? message.length;
    const selectionEnd = input?.selectionEnd ?? selectionStart;
    const nextMessage =
      message.slice(0, selectionStart) + sequence + message.slice(selectionEnd);
    const nextCursorPosition = selectionStart + sequence.length;

    onMessageChange(nextMessage);
    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  return (
    <article className="panel">
      <label className="field-label" htmlFor="text-preset-select">
        Preset
      </label>
      <div className="preset-manager">
        <button
          className="secondary-button"
          type="button"
          onClick={onSavePreset}
          disabled={isBusy || message.trim().length === 0}
        >
          Save
        </button>
        <select
          id="text-preset-select"
          className="text-input"
          value={selectedPresetId}
          onChange={(event) => onLoadPreset(event.target.value)}
          disabled={isBusy || presets.length === 0}
          aria-label="Saved presets"
        >
          {presets.length === 0 ? (
            <option value="">No presets</option>
          ) : (
            presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))
          )}
        </select>
        <button
          className="secondary-button"
          type="button"
          onClick={onDeletePreset}
          disabled={isBusy || presets.length === 0}
        >
          Delete
        </button>
      </div>
      <label className="field-label" htmlFor="message">
        Message
      </label>
      <textarea
        id="message"
        ref={messageInputRef}
        className="text-input message-input"
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
        rows={3}
        disabled={isBusy}
      />
      <div
        className={`symbol-picker symbol-picker-${symbolSize}`}
        aria-label="Symbols"
      >
        <button
          className={`symbol-size-button ${symbolSize === "large" ? "symbol-size-active" : ""}`}
          type="button"
          onClick={() => setSymbolSize(symbolSize === "large" ? "small" : "large")}
          disabled={isBusy}
          aria-pressed={symbolSize === "large"}
          title="Toggle large symbols"
        >
          Large
        </button>
        {SYMBOL_PICKER_ITEMS.map((item) => (
          <button
            key={item.label}
            className="symbol-button"
            type="button"
            onClick={() => insertSymbol(item.variants[symbolSize] ?? item.variants.small ?? "")}
            disabled={isBusy}
            title={item.label}
            aria-label={`Insert ${item.label}`}
          >
            {item.display}
          </button>
        ))}
      </div>

      <div className="controls-grid">
        <div>
          <label className="field-label" htmlFor="text-font">
            Badge text font
          </label>
          <select
            id="text-font"
            className="text-input"
            value={selectedTextFontId}
            onChange={onTextFontChange}
            disabled={isBusy}
          >
            {TextRenderer.TEXT_FONT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="scroll-mode">
            Scroll mode
          </label>
          <select
            id="scroll-mode"
            className="text-input"
            value={scrollMode}
            onChange={onScrollModeChange}
            disabled={isBusy}
          >
            {scrollOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="letter-spacing">
            Letter spacing: {letterSpacing}
          </label>
          <input
            id="letter-spacing"
            className="range-input"
            type="range"
            min="0"
            max="3"
            value={letterSpacing}
            onChange={onLetterSpacingChange}
            disabled={isBusy}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="space-width-adjustment">
            Space width: {spaceWidthAdjustment > 0 ? "+" : ""}
            {spaceWidthAdjustment}
          </label>
          <input
            id="space-width-adjustment"
            className="range-input"
            type="range"
            min="-3"
            max="3"
            value={spaceWidthAdjustment}
            onChange={onSpaceWidthAdjustmentChange}
            disabled={isBusy}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="brightness">
            Brightness: {brightness}
          </label>
          <input
            id="brightness"
            className="range-input"
            type="range"
            min="0"
            max="255"
            value={brightness}
            onChange={onBrightnessChange}
            disabled={isBusy}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="speed">
            Speed: {speed}
          </label>
          <input
            id="speed"
            className="range-input"
            type="range"
            min="0"
            max="255"
            value={speed}
            onChange={onSpeedChange}
            disabled={isBusy}
          />
        </div>
      </div>
    </article>
  );
}
