import { useState, useEffect, ChangeEvent, useRef } from 'react'
import type { Contact } from 'wasp/entities'
import { updateContact, createFile, getDownloadFileSignedURL } from 'wasp/client/operations'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { updateContactSchema } from './validation'
import { ZodError } from 'zod'
import useKeyboardShortcut from '../client/hooks/useKeyboardShortcut'

type EditContactModalProps = {
  contact: Contact | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type TileResponse = {
  ok: boolean
  file_path: string
  background_color: string | number[]
  text_color: string | number[]
  contrast_ratio: number
}

export default function EditContactModal({ contact, isOpen, onClose, onSuccess }: EditContactModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [website, setWebsite] = useState('')
  const [notes, setNotes] = useState('')
  const [hue, setHue] = useState(180)
  const [tilePreview, setTilePreview] = useState<TileResponse | null>(null)
  const [isGeneratingTile, setIsGeneratingTile] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [originalTileImageKey, setOriginalTileImageKey] = useState<string | null>(null)
  const [isCustomizingColor, setIsCustomizingColor] = useState(false)

  const [cardImageFile, setCardImageFile] = useState<File | null>(null)
  const [cardImagePreview, setCardImagePreview] = useState<string | null>(null)
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null)

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Ref for autofocus
  const firstNameInputRef = useRef<HTMLInputElement>(null)

  // Initialize form with contact data when modal opens
  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName ?? '')
      setLastName(contact.lastName ?? '')
      setEmail(contact.email ?? '')
      setPhone(contact.phone ?? '')
      setCompany(contact.company ?? '')
      setTitle(contact.title ?? '')
      setWebsite(contact.website ?? '')
      setNotes(contact.notes ?? '')
      setOriginalTileImageKey(contact.tileImageKey || null)
      setIsCustomizingColor(false) // Reset color customization state
      setTilePreview(null) // Clear any previous preview
      setCardImageFile(null) // Clear file input
      setCardImagePreview(null) // Clear preview
      setValidationErrors({}) // Clear validation errors

      // Set random initial hue for when user starts customizing
      const initialHue = Math.floor(Math.random() * 360)
      setHue(initialHue)

      // Load existing card image if it exists
      if (contact.cardImageKey) {
        getDownloadFileSignedURL({ key: contact.cardImageKey })
          .then((url) => setCardImageUrl(url))
          .catch((err) => console.error('Failed to load card image:', err))
      } else {
        setCardImageUrl(null)
      }
    }
  }, [contact])

  // Auto-generate preview when hue changes (only if customizing color)
  useEffect(() => {
    if (!firstName || !lastName || !isCustomizingColor) return

    const timeoutId = setTimeout(() => {
      generatePreviewWithHue(firstName, lastName, hue)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [hue, firstName, lastName, isCustomizingColor])

  // Autofocus first input when modal opens
  useEffect(() => {
    if (isOpen && firstNameInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        firstNameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Keyboard shortcut - Ctrl/Cmd+Enter to save
  // Note: Escape key is handled automatically by Radix Dialog
  useKeyboardShortcut(
    { key: 'Enter', ctrlKey: true, enabled: isOpen },
    () => {
      handleSave()
    }
  )

  const generatePreviewWithHue = async (first: string, last: string, currentHue: number) => {
    setIsGeneratingTile(true)
    try {
      const TILE_SERVICE_URL = import.meta.env.VITE_TILE_SERVICE_URL || 'http://localhost:8000'

      const response = await fetch(`${TILE_SERVICE_URL}/tile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first,
          last,
          hue: currentHue,
          is_preview: true, // Generate preview tile to avoid overwriting saved tile
        }),
      })

      if (!response.ok) throw new Error('Failed to generate tile')

      const data: TileResponse = await response.json()
      setTilePreview(data)
    } catch (error) {
      console.error('Error generating tile preview:', error)
    } finally {
      setIsGeneratingTile(false)
    }
  }

  const handleStartColorCustomization = async () => {
    setIsCustomizingColor(true)
    // Generate initial preview with random hue
    if (firstName && lastName) {
      await generatePreviewWithHue(firstName, lastName, hue)
    }
  }

  const validateField = (name: string, value: string) => {
    try {
      const fieldSchema = updateContactSchema.shape[name as keyof typeof updateContactSchema.shape]
      if (fieldSchema) {
        fieldSchema.parse(value)
        // Clear error if validation passes
        setValidationErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    } catch (error) {
      if (error instanceof ZodError) {
        setValidationErrors((prev) => ({
          ...prev,
          [name]: error.errors[0]?.message || 'Invalid value'
        }))
      }
    }
  }

  const handleBlur = (name: string, value: string) => {
    validateField(name, value)
  }

  const handleCardImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setCardImageFile(file)

    // Create preview
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCardImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setCardImagePreview(null)
    }
  }

  const uploadCardImage = async (file: File): Promise<string> => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png'] as const
    type AllowedFileType = typeof allowedTypes[number]

    if (!allowedTypes.includes(file.type as AllowedFileType)) {
      throw new Error('Invalid file type. Only JPEG and PNG images are allowed.')
    }

    // Request pre-signed URL from backend
    const { s3UploadUrl, s3UploadFields } = await createFile({
      fileType: file.type as AllowedFileType,
      fileName: file.name,
    })

    // Upload file to S3 using pre-signed POST
    const formData = new FormData()
    Object.entries(s3UploadFields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('file', file)

    const uploadResponse = await fetch(s3UploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${uploadResponse.status}`)
    }

    // Return the S3 key from the upload fields
    return s3UploadFields.key
  }

  const deleteOldTile = async (tilePath: string) => {
    try {
      const TILE_SERVICE_URL = import.meta.env.VITE_TILE_SERVICE_URL || 'http://localhost:8000'
      // Extract filename from path (e.g., "tiles/John_Doe_tile.png" -> "John_Doe_tile.png")
      const filename = tilePath.replace('tiles/', '')

      await fetch(`${TILE_SERVICE_URL}/tile/${filename}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.warn('Failed to delete old tile:', error)
      // Don't throw - this is cleanup, not critical
    }
  }

  const cleanupPreview = async () => {
    // Clean up preview tile when modal closes
    if (tilePreview) {
      try {
        const TILE_SERVICE_URL = import.meta.env.VITE_TILE_SERVICE_URL || 'http://localhost:8000'
        const previewFilename = tilePreview.file_path.replace('tiles/', '')
        await fetch(`${TILE_SERVICE_URL}/tile/${previewFilename}`, {
          method: 'DELETE',
        }).catch(() => {}) // Ignore errors for preview cleanup
      } catch (error) {
        console.warn('Failed to clean up preview:', error)
      }
    }
  }

  const handleClose = async () => {
    // Clean up preview before closing
    await cleanupPreview()
    onClose()
  }

  const handleSave = async () => {
    if (!contact) return

    setIsSaving(true)
    setValidationErrors({})

    try {
      // Validate all fields before submission
      const validationData = {
        id: contact.id,
        firstName,
        lastName,
        email,
        phone,
        company,
        title,
        website,
        notes,
      }

      try {
        updateContactSchema.parse(validationData)
      } catch (error) {
        if (error instanceof ZodError) {
          const errors: Record<string, string> = {}
          error.errors.forEach((err) => {
            if (err.path[0]) {
              errors[err.path[0] as string] = err.message
            }
          })
          setValidationErrors(errors)
          alert('Please fix the validation errors before saving')
          setIsSaving(false)
          return
        }
      }

      let newTileImageKey = contact.tileImageKey || undefined
      let newCardImageKey = contact.cardImageKey || undefined

      // Upload new card image if one was selected
      if (cardImageFile) {
        newCardImageKey = await uploadCardImage(cardImageFile)
      }

      // Generate final tile only if user was customizing color
      if (isCustomizingColor && tilePreview) {
        const TILE_SERVICE_URL = import.meta.env.VITE_TILE_SERVICE_URL || 'http://localhost:8000'

        // Generate final tile (not preview)
        const response = await fetch(`${TILE_SERVICE_URL}/tile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first: firstName,
            last: lastName,
            hue: hue,
            is_preview: false, // Generate final tile
          }),
        })

        if (response.ok) {
          const finalTile: TileResponse = await response.json()
          newTileImageKey = finalTile.file_path

          // Delete old tile if it changed
          if (originalTileImageKey && originalTileImageKey !== newTileImageKey) {
            await deleteOldTile(originalTileImageKey)
          }

          // Delete preview tile since we now have the final version
          await cleanupPreview()
        }
      } else if (isCustomizingColor) {
        // User clicked "Change Color" but closed before preview finished
        await cleanupPreview()
      }

      await updateContact({
        id: contact.id,
        firstName,
        lastName,
        email,
        phone,
        company,
        title,
        website,
        notes,
        tileImageKey: newTileImageKey,
        cardImageKey: newCardImageKey,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating contact:', error)
      alert('Failed to update contact')
    } finally {
      setIsSaving(false)
    }
  }

  if (!contact) return null

  const TILE_SERVICE_URL = import.meta.env.VITE_TILE_SERVICE_URL || 'http://localhost:8000'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update contact information and customize tile
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Tile Preview Section */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-medium mb-3">Contact Tile</h3>
            <div className="flex items-center gap-4">
              {/* Tile Preview */}
              <div className="flex-shrink-0">
                {isGeneratingTile ? (
                  <div className="w-24 h-24 rounded border flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  </div>
                ) : tilePreview ? (
                  <img
                    src={`${TILE_SERVICE_URL}/${tilePreview.file_path}?t=${Date.now()}`}
                    alt="Tile preview"
                    className="w-24 h-24 rounded border"
                  />
                ) : contact.tileImageKey ? (
                  <img
                    src={`${TILE_SERVICE_URL}/${contact.tileImageKey}?t=${new Date(contact.updatedAt).getTime()}`}
                    alt="Current tile"
                    className="w-24 h-24 rounded border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded border flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold">
                    {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : '?'}
                  </div>
                )}
              </div>

              {/* Color Customization */}
              <div className="flex-grow space-y-2">
                {!isCustomizingColor ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Current tile color is preserved by default
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStartColorCustomization}
                      disabled={!firstName || !lastName}
                    >
                      Change Color
                    </Button>
                  </div>
                ) : (
                  <>
                    <Label htmlFor="hue-slider">
                      Color Hue: {hue}° {isGeneratingTile && <span className="text-xs text-muted-foreground">(updating...)</span>}
                    </Label>
                    <input
                      id="hue-slider"
                      type="range"
                      min="0"
                      max="360"
                      value={hue}
                      onChange={(e) => setHue(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right,
                          hsl(0, 70%, 50%),
                          hsl(60, 70%, 50%),
                          hsl(120, 70%, 50%),
                          hsl(180, 70%, 50%),
                          hsl(240, 70%, 50%),
                          hsl(300, 70%, 50%),
                          hsl(360, 70%, 50%)
                        )`
                      }}
                    />
                    {tilePreview && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Contrast: {tilePreview.contrast_ratio.toFixed(1)}:1 (WCAG AAA)</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Slide to change color. Preview updates automatically.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                ref={firstNameInputRef}
                id="firstName"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value)
                  if (validationErrors.firstName) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev }
                      delete newErrors.firstName
                      return newErrors
                    })
                  }
                }}
                onBlur={(e) => handleBlur('firstName', e.target.value)}
                required
                className={validationErrors.firstName ? 'border-red-500' : ''}
              />
              {validationErrors.firstName && (
                <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value)
                  if (validationErrors.lastName) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev }
                      delete newErrors.lastName
                      return newErrors
                    })
                  }
                }}
                onBlur={(e) => handleBlur('lastName', e.target.value)}
                required
                className={validationErrors.lastName ? 'border-red-500' : ''}
              />
              {validationErrors.lastName && (
                <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (validationErrors.email) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev }
                      delete newErrors.email
                      return newErrors
                    })
                  }
                }}
                onBlur={(e) => handleBlur('email', e.target.value)}
                className={validationErrors.email ? 'border-red-500' : ''}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  if (validationErrors.phone) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev }
                      delete newErrors.phone
                      return newErrors
                    })
                  }
                }}
                onBlur={(e) => handleBlur('phone', e.target.value)}
                className={validationErrors.phone ? 'border-red-500' : ''}
              />
              {validationErrors.phone && (
                <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.phone}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value)
                  if (validationErrors.company) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev }
                      delete newErrors.company
                      return newErrors
                    })
                  }
                }}
                onBlur={(e) => handleBlur('company', e.target.value)}
                className={validationErrors.company ? 'border-red-500' : ''}
              />
              {validationErrors.company && (
                <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.company}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (validationErrors.title) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev }
                      delete newErrors.title
                      return newErrors
                    })
                  }
                }}
                onBlur={(e) => handleBlur('title', e.target.value)}
                className={validationErrors.title ? 'border-red-500' : ''}
              />
              {validationErrors.title && (
                <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.title}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value)
                if (validationErrors.website) {
                  setValidationErrors((prev) => {
                    const newErrors = { ...prev }
                    delete newErrors.website
                    return newErrors
                  })
                }
              }}
              onBlur={(e) => handleBlur('website', e.target.value)}
              className={validationErrors.website ? 'border-red-500' : ''}
            />
            {validationErrors.website && (
              <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.website}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                if (validationErrors.notes) {
                  setValidationErrors((prev) => {
                    const newErrors = { ...prev }
                    delete newErrors.notes
                    return newErrors
                  })
                }
              }}
              onBlur={(e) => handleBlur('notes', e.target.value)}
              rows={3}
              className={validationErrors.notes ? 'border-red-500' : ''}
            />
            {validationErrors.notes && (
              <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.notes}</p>
            )}
          </div>

          {/* Business Card Image */}
          <div className="space-y-2">
            <Label htmlFor="cardImageFile">Business Card Image (Optional)</Label>
            <Input
              id="cardImageFile"
              name="cardImageFile"
              type="file"
              accept="image/*"
              onChange={handleCardImageChange}
            />
            {cardImageFile && (
              <p className="text-xs text-muted-foreground">
                Selected file: {cardImageFile.name}
              </p>
            )}

            {/* Show preview of new upload or existing image */}
            {cardImagePreview ? (
              <div className="border rounded-md p-4">
                <p className="text-sm font-medium mb-2">New Image Preview:</p>
                <img
                  src={cardImagePreview}
                  alt="Business card preview"
                  className="max-w-full h-auto max-h-64 rounded"
                />
              </div>
            ) : cardImageUrl ? (
              <div className="border rounded-md p-4">
                <p className="text-sm font-medium mb-2">Current Image:</p>
                <img
                  src={cardImageUrl}
                  alt="Current business card"
                  className="max-w-full h-auto max-h-64 rounded"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No business card image uploaded
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !firstName || !lastName}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
