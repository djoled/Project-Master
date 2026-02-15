
import React, { useState, useEffect, useRef } from 'react';
import { Delete, ArrowUp, Check, X } from 'lucide-react';

export const VirtualKeyboard: React.FC = () => {
  const [activeElement, setActiveElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const keyboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const input = target as HTMLInputElement | HTMLTextAreaElement;
        const supportedTypes = ['text', 'email', 'password', 'search', 'tel', 'url', 'number'];
        if (supportedTypes.includes(input.type) || target.tagName === 'TEXTAREA') {
          setActiveElement(input);
          setIsVisible(true);
        }
      }
    };

    const handleBlur = (e: FocusEvent) => {
      setTimeout(() => {
        const currentFocus = document.activeElement;
        if (!currentFocus?.closest('.virtual-keyboard') && 
            currentFocus?.tagName !== 'INPUT' && 
            currentFocus?.tagName !== 'TEXTAREA') {
          setIsVisible(false);
        }
      }, 200);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const updateInputValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string, pos: number) => {
    const prototype = Object.getPrototypeOf(el);
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    
    if (nativeSetter) {
      nativeSetter.call(el, value);
    } else {
      el.value = value;
    }

    // Trigger events for React state updates
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Maintain focus and cursor position
    el.focus();
    
    // For types that support selection, explicitly set the cursor to the new position
    // to prevent it from jumping to the start (0) which causes "reverse" typing.
    const supportsSelection = ['text', 'search', 'url', 'tel', 'password'].includes(el.type) || el.tagName === 'TEXTAREA';
    if (supportsSelection) {
      try {
        el.setSelectionRange(pos, pos);
      } catch (e) {
        // Fallback for unexpected failures
      }
    }
  };

  const handleKeyClick = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!activeElement) return;

    // Determine if we can use selection coordinates
    const supportsSelection = ['text', 'search', 'url', 'tel', 'password'].includes(activeElement.type) || activeElement.tagName === 'TEXTAREA';
    
    let start = 0;
    let end = 0;
    
    if (supportsSelection) {
      try {
        // If selectionStart is null/0 but there is content, 
        // it might be because focus was just gained. 
        // In that case, we default to the end to ensure left-to-right filling.
        const currentStart = activeElement.selectionStart;
        const currentEnd = activeElement.selectionEnd;
        
        if (currentStart === null || (currentStart === 0 && activeElement.value.length > 0 && document.activeElement !== activeElement)) {
          start = activeElement.value.length;
          end = activeElement.value.length;
        } else {
          start = currentStart;
          end = currentEnd || currentStart;
        }
      } catch (e) {
        start = activeElement.value.length;
        end = activeElement.value.length;
      }
    } else {
      // For types like 'email' that don't support Selection API, 
      // always append to the end to ensure characters fill left-to-right correctly.
      start = activeElement.value.length;
      end = activeElement.value.length;
    }

    const currentValue = activeElement.value;
    let newValue = currentValue;
    let newPos = start;

    if (key === 'BACKSPACE') {
      if (start === end && start > 0) {
        newValue = currentValue.substring(0, start - 1) + currentValue.substring(end);
        newPos = start - 1;
      } else {
        newValue = currentValue.substring(0, start) + currentValue.substring(end);
        newPos = start;
      }
    } else if (key === 'ENTER') {
      if (activeElement.tagName === 'TEXTAREA') {
        newValue = currentValue.substring(0, start) + '\n' + currentValue.substring(end);
        newPos = start + 1;
      } else {
        setIsVisible(false);
        activeElement.blur();
        return;
      }
    } else if (key === 'SPACE') {
      newValue = currentValue.substring(0, start) + ' ' + currentValue.substring(end);
      newPos = start + 1;
    } else {
      const char = isShift ? key.toUpperCase() : key.toLowerCase();
      newValue = currentValue.substring(0, start) + char + currentValue.substring(end);
      newPos = start + 1;
      if (isShift) setIsShift(false);
    }

    updateInputValue(activeElement, newValue, newPos);
  };

  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACKSPACE'],
    ['@', '.', 'SPACE', 'ENTER', 'DONE']
  ];

  if (!isVisible) return null;

  return (
    <div 
      ref={keyboardRef}
      className="virtual-keyboard fixed bottom-0 left-0 right-0 z-[10000] bg-slate-900/98 backdrop-blur-xl border-t border-slate-700/50 p-2 sm:p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transform transition-all duration-300 animate-in slide-in-from-bottom"
      onMouseDown={e => e.preventDefault()}
    >
      <div className="max-w-4xl mx-auto space-y-1.5 sm:space-y-2">
        <div className="flex justify-between items-center mb-1 px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Keyboard: <span className="text-blue-400">{activeElement?.placeholder || 'Input'}</span>
            </span>
          </div>
          <button onClick={() => setIsVisible(false)} className="p-1 text-slate-400 hover:text-white rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>

        {rows.map((row, i) => (
          <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((key) => {
              let displayKey: React.ReactNode = isShift ? key.toUpperCase() : key;
              let className = "flex-1 h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-90 flex items-center justify-center text-sm sm:text-base select-none shadow-sm ";
              
              if (key === 'SHIFT') {
                displayKey = <ArrowUp size={20} className={isShift ? 'text-white' : 'text-slate-400'} />;
                className += isShift ? "bg-blue-600 text-white min-w-[50px] sm:min-w-[75px]" : "bg-slate-800 text-slate-300 min-w-[50px] sm:min-w-[75px]";
              } else if (key === 'BACKSPACE') {
                displayKey = <Delete size={20} />;
                className += "bg-slate-700 text-white min-w-[50px] sm:min-w-[75px] hover:bg-slate-600";
              } else if (key === 'SPACE') {
                displayKey = "Space";
                className += "bg-slate-800 text-white flex-[3] hover:bg-slate-700";
              } else if (key === 'ENTER') {
                displayKey = "Enter";
                className += "bg-slate-700 text-white min-w-[60px] sm:min-w-[85px] hover:bg-slate-600";
              } else if (key === 'DONE') {
                displayKey = <Check size={20} />;
                className += "bg-blue-600 text-white min-w-[60px] sm:min-w-[85px] hover:bg-blue-500";
              } else {
                className += "bg-slate-800 text-white hover:bg-slate-700";
              }

              return (
                <button
                  key={key}
                  className={className}
                  onClick={(e) => {
                    if (key === 'SHIFT') setIsShift(!isShift);
                    else if (key === 'DONE') setIsVisible(false);
                    else handleKeyClick(key, e);
                  }}
                  tabIndex={-1}
                >
                  {displayKey}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
