import { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

const SectionCard = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [height, setHeight] = useState("auto");

  useEffect(() => {
    if (open) {
      setHeight(contentRef.current.scrollHeight + "px");
    } else {
      setHeight("0px");
    }
  }, [open]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition font-semibold text-gray-700"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="text-green-600 text-lg" />}
          <span>{title}</span>
        </div>
        {open ? <FiChevronDown /> : <FiChevronRight />}
      </button>

      <div
        ref={contentRef}
        style={{ maxHeight: height }}
        className="transition-all duration-300 ease-in-out overflow-hidden"
      >
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SectionCard;
