import { useState, FormEvent, ChangeEvent, useEffect, useRef } from 'react'
import { routes } from 'wasp/client/router'
import { useAuth } from 'wasp/client/auth'
import { useNavigate } from 'react-router-dom'
import { createContact, createFile } from 'wasp/client/operations'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { createContactSchema } from './validation'
import { ZodError } from 'zod'
import toast from 'react-hot-toast'
import useKeyboardShortcut from '../client/hooks/useKeyboardShortcut'

type ContactFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  title: string
  website: string
  notes: string
  cardImageFile: File | null
}

type TileData = {
  filePath: string
  backgroundColor: string
  textColor: string
  contrastRatio: number
}

// Use environment variable for tile service URL, with localhost fallback for development
const TILE_SERVICE_URL = import.meta.env.VITE_TILE_SERVICE_URL || 'http://localhost:8000'

export default function CreateContactPage() {
  const { data: user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(routes.LoginRoute.to)
    }
  }, [isLoading, user, navigate])

  const [form, setForm] = useState<ContactFormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    website: '',
    notes: '',
    cardImageFile: null,
  })

  const [tileData, setTileData] = useState<TileData | null>(null)
  const [tileLoading, setTileLoading] = useState(false)
  const [tileError, setTileError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [cardImagePreview, setCardImagePreview] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showCreditDialog, setShowCreditDialog] = useState(false)

  // Ref for autofocus
  const firstNameInputRef = useRef<HTMLInputElement>(null)

  // Autofocus first input on mount
  useEffect(() => {
    firstNameInputRef.current?.focus()
  }, [])

  // Keyboard shortcuts - Ctrl/Cmd+Enter to submit form
  const handleKeyboardSubmit = () => {
    // Trigger form submission by finding and clicking the submit button
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
    if (submitButton && !submitButton.disabled) {
      submitButton.click()
    }
  }

  useKeyboardShortcut(
    { key: 'Enter', ctrlKey: true },
    handleKeyboardSubmit
  )

  if (isLoading) {
    return <div className="p-6">Loading...</div>
  }

  if (!user) {
    return null
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))

    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateField = (name: string, value: string) => {
    try {
      const fieldSchema = createContactSchema.shape[name as keyof typeof createContactSchema.shape]
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

  const handleBlur = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, cardImageFile: file }))

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

  const generateTile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setTileError('First name and last name are required to generate a tile')
      return
    }

    setTileLoading(true)
    setTileError(null)

    try {
      const response = await fetch(`${TILE_SERVICE_URL}/tile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first: form.firstName,
          last: form.lastName,
        }),
      })

      if (!response.ok) {
        throw new Error(`Tile service error: ${response.status}`)
      }

      const data = await response.json()

      // Convert RGB arrays to CSS color strings
      const bgColor = Array.isArray(data.background_color)
        ? `rgb(${data.background_color.join(',')})`
        : data.background_color
      const txtColor = Array.isArray(data.text_color)
        ? `rgb(${data.text_color.join(',')})`
        : data.text_color

      setTileData({
        filePath: data.file_path,
        backgroundColor: bgColor,
        textColor: txtColor,
        contrastRatio: data.contrast_ratio,
      })
    } catch (error) {
      console.error('Failed to generate tile:', error)
      setTileError(error instanceof Error ? error.message : 'Failed to generate tile')
    } finally {
      setTileLoading(false)
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setValidationErrors({})

    // Validate all fields before showing the credit dialog
    const validationData = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      company: form.company,
      title: form.title,
      website: form.website,
      notes: form.notes,
    }

    try {
      createContactSchema.parse(validationData)
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message
          }
        })
        setValidationErrors(errors)
        setSubmitError('Please fix the validation errors before submitting')
        return
      }
    }

    // Validation passed - show credit confirmation dialog
    setShowCreditDialog(true)
  }

  const handleConfirmCreate = async () => {
    setShowCreditDialog(false)
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      let cardImageKey: string | undefined = undefined
      let tileFilePath: string | undefined = tileData?.filePath

      // Upload business card image if provided
      if (form.cardImageFile) {
        cardImageKey = await uploadCardImage(form.cardImageFile)
      }

      // Auto-generate tile if not already created via preview
      if (!tileFilePath && form.firstName.trim() && form.lastName.trim()) {
        const response = await fetch(`${TILE_SERVICE_URL}/tile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first: form.firstName,
            last: form.lastName,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          tileFilePath = data.file_path
        } else {
          console.warn('Failed to auto-generate tile, continuing without it')
        }
      }

      // Create contact with all data
      await createContact({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        company: form.company,
        title: form.title,
        website: form.website,
        notes: form.notes,
        tileImageKey: tileFilePath,
        cardImageKey,
      })

      toast.success('Contact created successfully!')
      navigate(routes.ProfileRoute.to)
    } catch (error) {
      console.error('Failed to create contact:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create contact'
      setSubmitError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Create Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    ref={firstNameInputRef}
                    id="firstName"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={validationErrors.firstName ? 'border-red-500' : ''}
                  />
                  {validationErrors.firstName && (
                    <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    className={validationErrors.lastName ? 'border-red-500' : ''}
                  />
                  {validationErrors.lastName && (
                    <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={validationErrors.email ? 'border-red-500' : ''}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.email}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={validationErrors.phone ? 'border-red-500' : ''}
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Company / Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={validationErrors.company ? 'border-red-500' : ''}
                  />
                  {validationErrors.company && (
                    <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.company}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={validationErrors.title ? 'border-red-500' : ''}
                  />
                  {validationErrors.title && (
                    <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.title}</p>
                  )}
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={validationErrors.website ? 'border-red-500' : ''}
                />
                {validationErrors.website && (
                  <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.website}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  rows={3}
                  className={validationErrors.notes ? 'border-red-500' : ''}
                />
                {validationErrors.notes && (
                  <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.notes}</p>
                )}
              </div>

              {/* Business card image */}
              <div className="space-y-2">
                <Label htmlFor="cardImageFile">Business Card Image (Optional)</Label>
                <Input
                  id="cardImageFile"
                  name="cardImageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {form.cardImageFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected file: {form.cardImageFile.name}
                  </p>
                )}
                {cardImagePreview && (
                  <div className="border rounded-md p-4">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <img
                      src={cardImagePreview}
                      alt="Business card preview"
                      className="max-w-full h-auto max-h-64 rounded"
                    />
                  </div>
                )}
              </div>

              {/* Tile Generation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Contact Tile</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateTile}
                    disabled={tileLoading || !form.firstName.trim() || !form.lastName.trim()}
                  >
                    {tileLoading ? 'Generating...' : tileData ? 'Regenerate Tile' : 'Generate Tile'}
                  </Button>
                </div>

                {tileError && (
                  <div className="border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
                    {tileError}
                  </div>
                )}

                {tileData ? (
                  <div className="border rounded-md p-4 space-y-2">
                    <div className="flex items-center gap-4">
                      <img
                        src={`${TILE_SERVICE_URL}/${tileData.filePath}`}
                        alt={`${form.firstName} ${form.lastName} tile`}
                        className="w-24 h-24 rounded object-cover"
                      />
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Background:</span> {tileData.backgroundColor}</p>
                        <p><span className="font-medium">Text:</span> {tileData.textColor}</p>
                        <p><span className="font-medium">Contrast:</span> {tileData.contrastRatio.toFixed(2)}:1</p>
                        <p className="text-xs text-muted-foreground">File: {tileData.filePath.split('/').pop()}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-md p-4 text-sm text-muted-foreground">
                    Click "Generate Tile" to create a visual tile for this contact
                  </div>
                )}
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
                  {submitError}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Contact'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use 1 Credit</DialogTitle>
            <DialogDescription>
              Creating this contact card will use 1 credit from your balance.
              You currently have <span className="font-semibold text-foreground">{user.credits} credits</span> remaining.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate}>
              Confirm & Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
