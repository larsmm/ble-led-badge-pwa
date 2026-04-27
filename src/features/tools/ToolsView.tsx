import { ChangeEvent } from "react";

type AnimationOption = {
  description: string;
  id: number;
  label: string;
};

type ToolsViewProps = {
  animationOptions: AnimationOption[];
  imageSlot: number;
  isBusy: boolean;
  isConnected: boolean;
  onAnimationChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onCheckImages: () => void;
  onImageSlotChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPlayAnimation: () => void;
  onShowImage: () => void;
  selectedAnimation: number;
  selectedAnimationDescription: string;
  toolResponseAscii: string | null;
  toolResponseHex: string | null;
};

export function ToolsView({
  animationOptions,
  imageSlot,
  isBusy,
  isConnected,
  onAnimationChange,
  onCheckImages,
  onImageSlotChange,
  onPlayAnimation,
  onShowImage,
  selectedAnimation,
  selectedAnimationDescription,
  toolResponseAscii,
  toolResponseHex
}: ToolsViewProps) {
  return (
    <article className="panel">
      <h2>Badge Tools</h2>
      <div className="controls-grid">
        <div>
          <label className="field-label" htmlFor="animation-select">
            Built-in animation
          </label>
          <select
            id="animation-select"
            className="text-input"
            value={selectedAnimation}
            onChange={onAnimationChange}
            disabled={!isConnected || isBusy}
          >
            {animationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="panel-note">{selectedAnimationDescription}</p>
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              onClick={onPlayAnimation}
              disabled={!isConnected || isBusy}
            >
              Play Animation
            </button>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="image-slot">
            Stored image slot (experimental)
          </label>
          <input
            id="image-slot"
            className="text-input"
            type="number"
            min="1"
            max="8"
            value={imageSlot}
            onChange={onImageSlotChange}
            disabled={!isConnected || isBusy}
          />
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              onClick={onShowImage}
              disabled={!isConnected || isBusy}
            >
              Show Image Slot
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onCheckImages}
              disabled={!isConnected || isBusy}
            >
              Check Stored Images
            </button>
          </div>
        </div>
      </div>

      {toolResponseHex ? (
        <div className="tool-response">
          <p className="notification-line">Tool response: {toolResponseHex}</p>
          {toolResponseAscii ? (
            <p className="panel-note">Tool ASCII: {toolResponseAscii}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
