import { useEffect } from 'react';

type KeyboardShortcutOptions = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
};

/**
 * Custom hook for keyboard shortcuts
 * @param options - Keyboard shortcut configuration
 * @param callback - Function to call when shortcut is triggered
 */
function useKeyboardShortcut(
  options: KeyboardShortcutOptions,
  callback: (event: KeyboardEvent) => void
): void {
  const {
    key,
    ctrlKey = false,
    metaKey = false,
    shiftKey = false,
    altKey = false,
    preventDefault = true,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();

      // Check if modifiers match
      const modifiersMatch =
        event.ctrlKey === ctrlKey &&
        event.metaKey === metaKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey;

      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Special case: Allow Escape key even when typing
      const isEscape = event.key === 'Escape';

      if (keyMatches && modifiersMatch && (!isTyping || isEscape)) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, ctrlKey, metaKey, shiftKey, altKey, preventDefault, enabled, callback]);
}

export default useKeyboardShortcut;
