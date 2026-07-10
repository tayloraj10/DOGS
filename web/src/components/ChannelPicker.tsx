import type { Channel } from "../lib/sharedContact";

interface ChannelPickerProps {
  channels: Channel[];
  selected: string[];
  onToggle: (key: string) => void;
  onToggleAll?: (allKeys: string[]) => void;
}

const CHECKBOX_CLASSES =
  "h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800";

export default function ChannelPicker({ channels, selected, onToggle, onToggleAll }: ChannelPickerProps) {
  const allChecked = channels.length > 0 && channels.every((c) => selected.includes(c.key));

  return (
    <div className="flex flex-col gap-2">
      {onToggleAll && (
        <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() => onToggleAll(channels.map((c) => c.key))}
            className={CHECKBOX_CLASSES}
          />
          All
        </label>
      )}
      {channels.map((channel) => (
        <label
          key={channel.key}
          className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 py-0.5 text-sm text-slate-700 dark:text-slate-300"
        >
          <input
            type="checkbox"
            checked={selected.includes(channel.key)}
            onChange={() => onToggle(channel.key)}
            className={CHECKBOX_CLASSES}
          />
          {channel.label}
          <span className="min-w-0 break-all text-xs text-slate-400 dark:text-slate-500">
            ({channel.value})
          </span>
        </label>
      ))}
    </div>
  );
}
