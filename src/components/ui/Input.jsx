import React from 'react';

export const Input = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  className = '',
  min,
  max,
  ...rest
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const computedMin = min !== undefined ? min : (type === 'date' ? todayStr : undefined);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
          <span>{label}</span>
          {required && <span className="text-red-500 ml-1 select-none">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={computedMin}
        max={max}
        onWheel={(e) => {
          if (type === 'number') {
            e.currentTarget.blur();
          }
          if (rest.onWheel) {
            rest.onWheel(e);
          }
        }}
        {...rest}
        className={`w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] focus:border-[#3B318A] outline-none transition-all ${className}`}
      />
    </div>
  );
};

export const Textarea = ({
  label,
  name,
  value,
  onChange,
  rows = 3,
  placeholder = '',
  required = false,
  className = ''
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
          <span>{label}</span>
          {required && <span className="text-red-500 ml-1 select-none">*</span>}
        </label>
      )}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] focus:border-[#3B318A] outline-none transition-all ${className}`}
      />
    </div>
  );
};

export { CustomSelect } from './CustomSelect.jsx';
