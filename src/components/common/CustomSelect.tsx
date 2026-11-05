import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, RotateCcw, Check } from 'lucide-react';

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | CustomSelectOption)[];
  placeholder?: string;
  customPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  customPlaceholder = 'Type custom value...',
  className = '',
  disabled = false,
  required = false,
}) => {
  const normalizedOptions: CustomSelectOption[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const isValueInOptions = normalizedOptions.some(opt => opt.value === value);
  const [isCustom, setIsCustom] = useState<boolean>(!isValueInOptions && Boolean(value));
  const [customInput, setCustomInput] = useState<string>(!isValueInOptions && Boolean(value) ? value : '');

  useEffect(() => {
    const found = normalizedOptions.some(opt => opt.value === value);
    if (!found && value) {
      setIsCustom(true);
      setCustomInput(value);
    } else if (found && !isCustom) {
      setCustomInput('');
    }
  }, [value, normalizedOptions]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__CUSTOM__') {
      setIsCustom(true);
      setCustomInput('');
    } else {
      setIsCustom(false);
      onChange(selected);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    onChange(val);
  };

  const handleRevertToDropdown = () => {
    setIsCustom(false);
    if (normalizedOptions.length > 0) {
      onChange(normalizedOptions[0].value);
    } else {
      onChange('');
    }
  };

  if (isCustom) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="relative flex-1">
          <input
            type="text"
            value={customInput}
            onChange={handleCustomInputChange}
            placeholder={customPlaceholder}
            disabled={disabled}
            required={required}
            autoFocus
            className="w-full rounded-xl border border-emerald-500 bg-slate-800/90 px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            Custom
          </span>
        </div>
        <button
          type="button"
          onClick={handleRevertToDropdown}
          disabled={disabled}
          title="Revert back to predefined list"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={handleSelectChange}
        disabled={disabled}
        required={required}
        className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 pr-8 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
      >
        {placeholder && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {normalizedOptions.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        <option value="__CUSTOM__" className="text-emerald-400 font-bold bg-slate-900">
          + Custom / Enter manually...
        </option>
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
};
