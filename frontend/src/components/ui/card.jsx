import React from "react";
import PropTypes from "prop-types";
import clsx from "clsx";

/**
 * Reusable Card component with consistent rounded, shadowed style.
 * Works great for dashboard sections and lists.
 */

export const Card = ({ children, className = "", ...props }) => {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = "", ...props }) => {
  return (
    <div
      className={clsx(
        "px-5 py-4 border-b border-gray-100 flex justify-between items-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = "", ...props }) => {
  return (
    <h3
      className={clsx(
        "text-lg font-semibold text-gray-800 leading-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardContent = ({ children, className = "", ...props }) => {
  return (
    <div className={clsx("p-5 text-gray-700", className)} {...props}>
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

CardHeader.propTypes = CardTitle.propTypes = CardContent.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card;
