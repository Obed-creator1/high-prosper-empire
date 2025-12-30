import React, { ReactNode } from "react";

interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}

export const Label = ({ children, htmlFor, className = "" }: LabelProps) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
    >
      {children}
    </label>
  );
};
