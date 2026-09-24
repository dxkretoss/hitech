import React, { useState, useEffect, useRef } from 'react';
import { PenLine, List, Plus, Sparkles, X } from 'lucide-react';

/**
 * CustomSelect / CreatableSelect component
 * Allows selecting from predefined options OR typing any custom value directly.
 * 
 * Supports:
 * - `options`: Array of strings or `{ value, label, group? }`
 * - `children`: Standard `<option>` and `<optgroup>` tags
 * - 1-click toggling between Preset Dropdown & Custom Text Entry
 * - Auto-detection of custom values
 * - Full compatibility with standard form onChange events: `e.target.value` & `e.target.name`
 */
export const CustomSelect = ({
  label,
  name,
  value = '',
  onChange,
  options,
  children,
  placeholder = '',
  customPlaceholder,
  allowCustom = true,
  customOptionLabel = '+ Enter Custom / Other...',
  required = false,
  className = '',
  selectClassName = '',
  inputClassName = '',
  disabled = false,
  helperText,
  ...rest
}) => {
  // Extract all preset values from options or children
  const presetOptions = React.useMemo(() => {
    const list = [];
    if (Array.isArray(options)) {
      options.forEach(opt => {
        if (typeof opt === 'string' || typeof opt === 'number') {
          list.push({ value: String(opt), label: String(opt) });
        } else if (opt && typeof opt === 'object') {
          list.push({
            value: String(opt.value ?? opt.id ?? ''),
            label: String(opt.label ?? opt.name ?? opt.value ?? ''),
            group: opt.group
          });
        }
      });
    } else if (children) {
      React.Children.forEach(children, child => {
        if (!child) return;
        if (child.type === 'option') {
          list.push({
            value: String(child.props.value ?? child.props.children ?? ''),
            label: String(child.props.children ?? child.props.value ?? '')
          });
        } else if (child.type === 'optgroup' && child.props.children) {
          React.Children.forEach(child.props.children, subChild => {
            if (subChild && subChild.type === 'option') {
              list.push({
                value: String(subChild.props.value ?? subChild.props.children ?? ''),
                label: String(subChild.props.children ?? subChild.props.value ?? ''),
                group: child.props.label
              });
            }
          });
        }
      });
    }
    return list;
  }, [options, children]);

  const presetValueSet = React.useMemo(() => {
    return new Set(presetOptions.map(o => String(o.value)));
  }, [presetOptions]);

  // Determine if current value is custom (not in preset options and not empty)
  const isValueCustom = Boolean(value && !presetValueSet.has(String(value)));

  const [isCustomMode, setIsCustomMode] = useState(isValueCustom);
  const inputRef = useRef(null);

  // Sync mode if value changes externally
  useEffect(() => {
    if (value && !presetValueSet.has(String(value))) {
      setIsCustomMode(true);
    }
  }, [value, presetValueSet]);

  const triggerChange = (newVal) => {
    if (onChange) {
      // Standard synthetic event signature for maximum React form compatibility
      const syntheticEvent = {
        target: {
          name: name || '',
          value: newVal
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handleSelectChange = (e) => {
    const selectedVal = e.target.value;
    if (selectedVal === '__CUSTOM_OPTION_TRIGGER__') {
      setIsCustomMode(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      triggerChange(selectedVal);
    }
  };

  const handleCustomInputChange = (e) => {
    triggerChange(e.target.value);
  };

  const switchToPresets = () => {
    setIsCustomMode(false);
    // If the current custom value is not in presets, pick first preset or blank
    if (value && !presetValueSet.has(String(value))) {
      const fallback = presetOptions.length > 0 ? presetOptions[0].value : '';
      triggerChange(fallback);
    }
  };

  const switchToCustom = () => {
    setIsCustomMode(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Grouped options if any
  const groups = React.useMemo(() => {
    const grouped = {};
    const ungrouped = [];
    presetOptions.forEach(opt => {
      if (opt.group) {
        if (!grouped[opt.group]) grouped[opt.group] = [];
        grouped[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    });
    return { grouped, ungrouped };
  }, [presetOptions]);

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {/* Label and Mode Switcher Header */}
      <div className="flex items-center justify-between gap-2">
        {label && (
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
            <span>{label}</span>
            {required && <span className="text-red-500 ml-1 select-none">*</span>}
          </label>
        )}

        {allowCustom && (
          <button
            type="button"
            onClick={isCustomMode ? switchToPresets : switchToCustom}
            className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
              isCustomMode
                ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                : 'text-gray-500 hover:text-[#3B318A] hover:bg-gray-100'
            }`}
            title={isCustomMode ? 'Choose from predefined list' : 'Type a custom value directly'}
          >
            {isCustomMode ? (
              <>
                <List className="w-3 h-3 text-indigo-600" />
                <span>Presets List</span>
              </>
            ) : (
              <>
                <PenLine className="w-3 h-3" />
                <span>+ Custom</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Control: Either Custom Text Input or Select Dropdown */}
      {isCustomMode ? (
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            name={name}
            value={value}
            onChange={handleCustomInputChange}
            placeholder={customPlaceholder || `Enter custom ${label || 'value'}...`}
            required={required}
            disabled={disabled}
            className={`w-full h-[38px] px-3.5 pr-9 py-2 text-sm border-2 border-indigo-400 bg-indigo-50/20 rounded-xl focus:ring-2 focus:ring-[#3B318A] focus:border-[#3B318A] outline-none transition-all font-medium text-gray-900 ${inputClassName}`}
            {...rest}
          />
          <button
            type="button"
            onClick={switchToPresets}
            className="absolute right-2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
            title="Return to standard dropdown list"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <select
            name={name}
            value={value}
            onChange={handleSelectChange}
            required={required}
            disabled={disabled}
            className={`w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] focus:border-[#3B318A] bg-white text-gray-900 transition-all font-medium appearance-none cursor-pointer pr-9 ${selectClassName}`}
            {...rest}
          >
            {placeholder && !presetOptions.some(o => o.value === '') && (
              <option value="" disabled className="text-gray-400">
                {placeholder}
              </option>
            )}

            {/* Ungrouped Options */}
            {groups.ungrouped.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}

            {/* Grouped Options */}
            {Object.entries(groups.grouped).map(([groupName, items]) => (
              <optgroup key={groupName} label={groupName}>
                {items.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}

            {/* If there's an existing custom value selected */}
            {isValueCustom && (
              <option value={value} className="font-semibold text-indigo-700 bg-indigo-50">
                {value}
              </option>
            )}

            {/* Custom Input Trigger Option */}
            {allowCustom && (
              <option
                value="__CUSTOM_OPTION_TRIGGER__"
                className="font-bold text-[#3B318A] bg-indigo-50/80 py-1"
              >
                {customOptionLabel}
              </option>
            )}
          </select>

          {/* Clean dropdown chevron arrow indicator */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default CustomSelect;
