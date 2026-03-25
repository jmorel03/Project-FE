import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <input ref={ref} className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`} {...props} />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;

export const Select = forwardRef(({ label, error, children, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <select
      ref={ref}
      className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
));

Select.displayName = 'Select';

export const Textarea = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <textarea
      ref={ref}
      rows={3}
      className={`input resize-none ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
));

Textarea.displayName = 'Textarea';
