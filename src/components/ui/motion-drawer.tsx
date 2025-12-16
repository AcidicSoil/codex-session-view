'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';

export type SideMenuDirection = 'left' | 'right';
export type ButtonOpeningVariants = 'push' | 'merge' | 'stay';

interface SideMenuProps {
  // Appearance
  overlayColor?: string;
  width?: number;
  direction?: SideMenuDirection;
  backgroundColor?: string;

  // Content
  children: React.ReactNode;

  // Behavior
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  showToggleButton?: boolean;
  showCloseButton?: boolean;
  toggleButtonText?: {
    open: string;
    close: string;
  };

  // Styling
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
  contentPadding?: string | number;

  // Animation
  animationConfig?: {
    type?: 'spring' | 'tween';
    damping?: number;
    stiffness?: number;
    duration?: number;
  };

  // Drag behavior
  enableDrag?: boolean;
  dragThreshold?: number;

  // New prop
  buttonOpeningVariants?: ButtonOpeningVariants;

  // Accessibility
  ariaLabel?: string;
  closeOnEscape?: boolean;
}

const getOpenButtonVariants = (
  direction: SideMenuDirection,
  width: number,
  type: ButtonOpeningVariants
) => {
  switch (type) {
    case 'merge':
      return direction === 'left'
        ? {
            closed: { x: 0, opacity: 1, scale: 1, borderRadius: '0.5rem' },
            open: {
              x: width - 68,
              opacity: 0,
              scale: 1,
              borderRadius: '0rem',
            },
          }
        : {
            closed: { x: 0, opacity: 1, scale: 1, borderRadius: '0.5rem' },
            open: {
              x: 68 - width,
              opacity: 0,
              scale: 1,
              borderRadius: '0rem',
            },
          };

    case 'push':
      return direction === 'left'
        ? { closed: { x: 0, opacity: 1 }, open: { x: width + 20, opacity: 0 } }
        : {
            closed: { x: 0, opacity: 1 },
            open: { x: -(width + 20), opacity: 0 },
          };

    case 'stay':
    default:
      return {
        closed: { x: 0, opacity: 1 },
        open: { x: 0, opacity: 0 },
      };
  }
};

const MotionDrawer: React.FC<SideMenuProps> = ({
  // Appearance
  overlayColor = 'rgba(0, 0, 0, 0.3)',
  width = 300,
  direction = 'left',
  backgroundColor = '#ffffff',

  // Content
  children,

  // Behavior
  isOpen: controlledIsOpen,
  onToggle,
  showToggleButton = true,
  showCloseButton = true,
  toggleButtonText,

  // Styling
  className = '',
  contentClassName = '',
  overlayClassName = '',
  contentPadding = '60px 30px 30px 30px',

  // Animation
  animationConfig = {
    type: 'spring',
    damping: 25,
    stiffness: 120,
  },

  // Drag behavior
  enableDrag = true,
  dragThreshold = 0.3,

  buttonOpeningVariants = 'merge',
  ariaLabel,
  closeOnEscape = true,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = useCallback(
    (value: boolean) => {
      if (controlledIsOpen === undefined) {
        setInternalIsOpen(value);
      }
      onToggle?.(value);
    },
    [controlledIsOpen, onToggle]
  );

  const getDrawerVariants = () => {
    if (direction === 'left') {
      return {
        closed: { x: -width },
        open: { x: 0 },
      };
    } else {
      return {
        closed: { x: width },
        open: { x: 0 },
      };
    }
  };

  const buttonVariants = getOpenButtonVariants(
    direction,
    width,
    buttonOpeningVariants
  );

  const getDragConstraints = () => {
    if (direction === 'left') {
      return { left: -width, right: 0 };
    } else {
      return { left: 0, right: width };
    }
  };

  const handleDragEnd = (_event: any, info: any) => {
    if (!enableDrag) return;

    const threshold = width * dragThreshold;
    const dragDistance = Math.abs(info.offset.x);

    if (direction === 'left') {
      const isDraggingLeft = info.offset.x < 0;
      if (isDraggingLeft && dragDistance > threshold && isOpen) {
        setIsOpen(false);
      } else if (!isDraggingLeft && dragDistance > threshold && !isOpen) {
        setIsOpen(true);
      }
    } else {
      const isDraggingRight = info.offset.x > 0;
      if (isDraggingRight && dragDistance > threshold && isOpen) {
        setIsOpen(false);
      } else if (!isDraggingRight && dragDistance > threshold && !isOpen) {
        setIsOpen(true);
      }
    }
  };

  const drawerPositionClasses = direction === 'left' ? 'left-0' : 'right-0';
  const openButtonPositionClasses =
    direction === 'left' ? 'top-4 left-4' : 'top-4 right-4';

  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, isOpen, setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const drawerEl = drawerRef.current;
    if (drawerEl) {
      const focusable = drawerEl.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? drawerEl).focus();
    }
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return (
    <>
      {showToggleButton && (
        <motion.button
          type='button'
          aria-label={toggleButtonText?.open ?? 'Open drawer'}
          className={`fixed z-50 text-primary cursor-pointer ${openButtonPositionClasses}`}
          onClick={() => setIsOpen(true)}
          variants={buttonVariants}
          animate={isOpen ? 'open' : 'closed'}
          transition={animationConfig}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu />
          {/* Open */}
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div
            className={`fixed w-full h-full top-0 left-0 z-9999 ${className}`}
          >
            {/* Overlay */}
            <motion.div
              className={`absolute w-full h-full top-0 left-0 ${overlayClassName}`}
              style={{ backgroundColor: overlayColor }}
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Drawer */}
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal='true'
              aria-label={ariaLabel}
              tabIndex={-1}
              className={`absolute h-full shadow-[8px_1px_21px_0px_rgba(17,17,26,0.1)] ${drawerPositionClasses} ${contentClassName}`}
              style={{
                backgroundColor,
                width: `${width}px`,
                padding: contentPadding,
                boxSizing: 'border-box',
              }}
              drag={enableDrag ? 'x' : false}
              dragElastic={0.1}
              dragConstraints={getDragConstraints()}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              variants={getDrawerVariants()}
              initial='closed'
              animate='open'
              exit='closed'
              transition={animationConfig}
            >
              {/* Close Button */}
              {showCloseButton && (
                <motion.button
                  type='button'
                  aria-label={toggleButtonText?.close ?? 'Close drawer'}
                  className='absolute top-2 right-4 p-2 text-black cursor-pointer'
                  onClick={() => setIsOpen(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={20} /> {/* Close */}
                </motion.button>
              )}

              {/* Content */}
              <div className='h-full overflow-y-auto'>{children}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MotionDrawer;
