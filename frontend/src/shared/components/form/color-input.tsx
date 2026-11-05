const PALETTE = ['#e5484d', '#f76b15', '#d89a00', '#12a150', '#0b8565', '#0b8ec2', '#3b6fe0', '#8e5bd9', '#d6409f', '#6b7a75'];

interface ColorInputProps {
  id?: string;
  value: string;
  onChange: (color: string) => void;
}

/** Preset swatches plus a custom colour picker. */
export function ColorInput({ id, value, onChange }: ColorInputProps) {
  const isCustom = !PALETTE.includes(value.toLowerCase());
  return (
    <div className="swatches">
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          className="swatch"
          style={{ ['--sw' as string]: color }}
          aria-label={`Colour ${color}`}
          aria-pressed={value.toLowerCase() === color}
          onClick={() => onChange(color)}
        />
      ))}
      <input
        id={id}
        type="color"
        className="swatch-custom"
        value={value}
        title="Custom colour"
        aria-label="Custom colour"
        style={isCustom ? { outline: `2px solid ${value}`, outlineOffset: 2 } : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
