import * as React from "react";

type InputVariant = "default" | "filled";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: InputVariant;
}

const baseInput =
  "peer h-11 w-full rounded-lg border px-3 text-sm outline-none transition duration-200 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<InputVariant, string> = {
  default:
    "border-slate-300 bg-white text-slate-950 shadow-sm hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100",
  filled:
    "border-slate-200 bg-slate-50 text-slate-950 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      success = false,
      leftIcon,
      rightIcon,
      variant = "default",
      className = "",
      required,
      ...props
    },
    ref
  ) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    const message = error ?? helperText;

    const statusClass = error
      ? "border-rose-400 text-rose-950 focus:border-rose-500 focus:ring-rose-100"
      : success
        ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
        : variantClasses[variant];

    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            {label}
            {required ? <span className="ml-1 text-rose-500">*</span> : null}
          </label>
        ) : null}

        <div className="relative">
          {leftIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              {leftIcon}
            </span>
          ) : null}

          <input
            id={inputId}
            ref={ref}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={message ? `${inputId}-message` : undefined}
            className={[
              baseInput,
              statusClass,
              leftIcon ? "pl-10" : "",
              rightIcon ? "pr-10" : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />

          {rightIcon ? (
            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
              {rightIcon}
            </span>
          ) : null}
        </div>

        {message ? (
          <p
            id={`${inputId}-message`}
            className={[
              "mt-1.5 text-xs",
              error ? "text-rose-600" : "text-slate-500",
            ].join(" ")}
          >
            {message}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
