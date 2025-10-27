import React from "react";
import "./IconButton.css";

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  title,
  className = "",
  disabled = false,
}) => {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={className}
      >
        {icon}
      </button>
    </div>
  );
};

export default IconButton;
