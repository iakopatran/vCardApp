import { useState } from 'react'
import { Keyboard, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import useKeyboardShortcut from '../hooks/useKeyboardShortcut'

type Shortcut = {
  keys: string
  description: string
  context?: string
}

const shortcuts: Shortcut[] = [
  { keys: 'Ctrl/⌘ + K', description: 'Focus search', context: 'Contacts page' },
  { keys: 'N', description: 'Create new contact', context: 'Contacts page' },
  { keys: 'Escape', description: 'Close modal/dialog', context: 'Any modal' },
  { keys: 'Ctrl/⌘ + Enter', description: 'Save/Submit form', context: 'Forms' },
  { keys: '?', description: 'Show keyboard shortcuts', context: 'Anywhere' },
]

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  // ? key to toggle help
  useKeyboardShortcut(
    { key: '?', shiftKey: true },
    () => {
      setIsOpen((prev) => !prev)
    }
  )

  // Escape to close
  useKeyboardShortcut(
    { key: 'Escape', enabled: isOpen },
    () => {
      setIsOpen(false)
    }
  )

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors z-40"
        title="Keyboard shortcuts (press ?)"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-background rounded-lg shadow-2xl w-full max-w-md border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-start justify-between gap-4">
                  <div className="flex-grow">
                    <p className="font-medium">{shortcut.description}</p>
                    {shortcut.context && (
                      <p className="text-sm text-muted-foreground">{shortcut.context}</p>
                    )}
                  </div>
                  <kbd className="px-2 py-1 text-sm font-mono bg-muted border border-border rounded whitespace-nowrap">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">?</kbd> to toggle this help
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
