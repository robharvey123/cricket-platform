"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
}

export const Button = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  onClick,
  ...props
}: ButtonProps) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      try {
        onClick(e);
      } catch (error) {
        console.error("Button click handler error:", error);
      }
    }
  };

  return (
    <button
      className={className}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};
