import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PenLine, List, X, ChevronDown, Search, Check, Plus } from 'lucide-react';

/**
 * CustomSelect / CreatableSelect component
 * Uses React Portal to float outside modal overflow containers
 * Features:
 * - Never clipped by modal headers or overflow containers (rendered in Portal)
 * - Automatic upward/downward positioning based on viewport space
 * - Instant live search filter for long option lists
 * - Optgroup / Category headers support
 * - 1-click toggling between Preset Dropdown & Custom Text Entry
 * - Full compatibility with standard form onChange events: `e.target.value` & `e.target.name`
 */
export const CustomSelect = ({
  label,
  name,
  value = '',
  onChange,
  options,
  children,
  placeholder = 'Select option...',
  customPlaceholder,
  allowCustom = true,
  customOptionLabel = 'Enter Custom / Other...',
  required = false,
  className = '',
  selectClassName = '',
  inputClassName = '',
  disabled = false,
  helperText,
  maxDropdownHeight = 350,
  ...rest
}) => {
  // Extract all preset values from options or children
  const presetOptions = useMemo(() => {
    const list = [];
    if (Array.isArray(options)) {
      options.forEach((opt) => {
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
      React.Children.forEach(children, (child) => {
        if (!child) return;
        if (child.type === 'option') {
          list.push({
            value: String(child.props.value ?? child.props.children ?? ''),
            label: String(child.props.children ?? child.props.value ?? '')
          });
        } else if (child.type === 'optgroup' && child.props.children) {
          React.Children.forEach(child.props.children, (subChild) => {
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

  const presetValueSet = useMemo(() => {
    return new Set(presetOptions.map((o) => String(o.value)));
  }, [presetOptions]);

  // Determine if current value is custom (not in preset options and not empty)
  const isValueCustom = Boolean(value && !presetValueSet.has(String(value)));

  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(isValueCustom);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownCoords, setDropdownCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
    maxHeight: 350
  });

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync mode if value changes externally
  useEffect(() => {
    if (value && !presetValueSet.has(String(value))) {
      setIsCustomMode(true);
    }
  }, [value, presetValueSet]);

  // Calculate coordinates for the Portal dropdown
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const maxHeightLimit = typeof maxDropdownHeight === 'number' ? maxDropdownHeight : 350;
    const shouldOpenUpward = spaceBelow < Math.min(260, maxHeightLimit) && spaceAbove > spaceBelow;
    const computedMaxHeight = Math.min(
      maxHeightLimit,
      shouldOpenUpward ? Math.max(180, spaceAbove - 20) : Math.max(180, spaceBelow - 20)
    );

    setDropdownCoords({
      top: shouldOpenUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUpward: shouldOpenUpward,
      maxHeight: computedMaxHeight
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInsideTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const isClickInsidePopover = popoverRef.current && popoverRef.current.contains(e.target);

      if (!isClickInsideTrigger && !isClickInsidePopover) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const triggerChange = (newVal) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || '',
          value: newVal
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handleSelectOption = (optValue) => {
    if (optValue === '__CUSTOM_OPTION_TRIGGER__') {
      setIsCustomMode(true);
      setIsOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      triggerChange(optValue);
      setIsOpen(false);
    }
  };

  const handleCustomInputChange = (e) => {
    triggerChange(e.target.value);
  };

  const switchToPresets = () => {
    setIsCustomMode(false);
    if (value && !presetValueSet.has(String(value))) {
      const fallback = presetOptions.length > 0 ? presetOptions[0].value : '';
      triggerChange(fallback);
    }
  };

  const switchToCustom = () => {
    setIsCustomMode(true);
    setIsOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return presetOptions;
    const q = searchQuery.toLowerCase();
    return presetOptions.filter((opt) =>
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q) ||
      (opt.group && opt.group.toLowerCase().includes(q))
    );
  }, [presetOptions, searchQuery]);

  // Grouped options
  const groups = useMemo(() => {
    const grouped = {};
    const ungrouped = [];
    filteredOptions.forEach((opt) => {
      if (opt.group) {
        if (!grouped[opt.group]) grouped[opt.group] = [];
        grouped[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    });
    return { grouped, ungrouped };
  }, [filteredOptions]);

  // Selected Option Display Label
  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const matched = presetOptions.find((o) => o.value === String(value));
    return matched ? matched.label : value;
  }, [value, presetOptions]);

  return (
    <div className={`space-y-1.5 w-full relative ${className}`}>
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
            className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer ${isCustomMode
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

      {/* Main Control: Custom Text Input or Interactive Trigger Button */}
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
            className="absolute right-2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
            title="Return to standard dropdown list"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Custom Trigger Button */}
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                updatePosition();
                setIsOpen(!isOpen);
              }
            }}
            className={`w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] focus:border-[#3B318A] bg-white text-gray-900 transition-all font-medium flex items-center justify-between text-left cursor-pointer pr-3 ${isOpen ? 'border-[#3B318A] ring-2 ring-[#3B318A]/20' : ''
              } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''} ${selectClassName}`}
          >
            <span className={`truncate mr-2 ${!value ? 'text-gray-400 font-normal' : 'text-gray-900 font-medium'}`}>
              {selectedLabel || placeholder}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#3B318A]' : ''
                }`}
            />
          </button>

          {/* Hidden native input for HTML form validations */}
          <input
            type="text"
            name={name}
            value={value}
            required={required}
            readOnly
            className="sr-only"
            tabIndex={-1}
          />
        </div>
      )}

      {/* Floating Dropdown Popover in Portal (Never clipped by modal) */}
      {!isCustomMode && isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: dropdownCoords.openUpward ? undefined : dropdownCoords.top,
            bottom: dropdownCoords.openUpward ? window.innerHeight - dropdownCoords.top : undefined,
            left: dropdownCoords.left,
            width: dropdownCoords.width,
            zIndex: 99999
          }}
          className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Bar with search icon for quick searching */}
          {presetOptions.length > 0 && (
            <div className="p-2 border-b border-gray-100 bg-slate-50/90 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#3B318A] focus:ring-1 focus:ring-[#3B318A] text-gray-900 font-medium placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Container with max height 350px */}
          <div
            style={{ maxHeight: `${dropdownCoords.maxHeight || 350}px` }}
            className="overflow-y-auto p-1.5 space-y-1 divide-y divide-gray-50 scrollbar-thin max-h-[350px]"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No matching options found.
              </div>
            ) : (
              <>
                {/* Ungrouped Options */}
                {groups.ungrouped.length > 0 && (
                  <div className="space-y-0.5">
                    {groups.ungrouped.map((opt) => {
                      const isSelected = String(value) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption(opt.value)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${isSelected
                              ? 'bg-[#3B318A] text-white font-bold shadow-xs'
                              : 'text-gray-800 hover:bg-indigo-50/70 font-medium'
                            }`}
                        >
                          <span className="truncate mr-2">{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Grouped Options */}
                {Object.entries(groups.grouped).map(([groupName, items]) => (
                  <div key={groupName} className="pt-2 first:pt-0 space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#3B318A] bg-indigo-50/80 rounded-lg flex items-center justify-between">
                      <span>{groupName}</span>
                      <span className="text-[9px] font-bold text-indigo-600 bg-white/80 px-1.5 py-0.2 rounded-md">
                        {items.length}
                      </span>
                    </div>
                    <div className="pl-1 space-y-0.5 mt-0.5">
                      {items.map((opt) => {
                        const isSelected = String(value) === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelectOption(opt.value)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${isSelected
                                ? 'bg-[#3B318A] text-white font-bold shadow-xs'
                                : 'text-gray-800 hover:bg-indigo-50/70 font-medium'
                              }`}
                          >
                            <span className="truncate mr-2">{opt.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Custom Input Trigger Option at Bottom of Dropdown */}
          {allowCustom && (
            <div className="p-1.5 border-t border-gray-100 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectOption('__CUSTOM_OPTION_TRIGGER__')}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#3B318A] bg-indigo-50/60 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#3B318A]" />
                <span>{customOptionLabel}</span>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {helperText && <p className="text-[11px] text-gray-500">{helperText}</p>}
    </div>
  );
};

export default CustomSelect;
