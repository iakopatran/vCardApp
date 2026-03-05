import { routes } from 'wasp/client/router'
import { useAuth } from 'wasp/client/auth'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useQuery, getAllContactsByUser, deleteContact, getDownloadFileSignedURL } from 'wasp/client/operations'
import type { Contact } from 'wasp/entities'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Download, Pencil, Trash2, Search, X } from 'lucide-react'
import EditContactModal from '../../contacts/EditContactModal'
import toast from 'react-hot-toast'
import useKeyboardShortcut from '../hooks/useKeyboardShortcut'

const getTileImageUrl = (contact: Contact): string | null => {
  if (!contact.tileImageKey) return null
  const TILE_SERVICE_URL = import.meta.env.VITE_TILE_SERVICE_URL || 'http://localhost:8000'
  // Add cache-busting parameter using updatedAt timestamp to ensure images reload after edits
  const timestamp = new Date(contact.updatedAt).getTime()
  return `${TILE_SERVICE_URL}/${contact.tileImageKey}?t=${timestamp}`
}

type ContactTileCardProps = {
  contact: Contact
  onEdit: (contact: Contact) => void
  onDelete: (contact: Contact) => void
}

function ContactTileCard({ contact, onEdit, onDelete }: ContactTileCardProps) {
  const [imageError, setImageError] = useState(false)
  const tileUrl = getTileImageUrl(contact)
  const fallbackInitials = contact.firstName && contact.lastName
    ? `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase()
    : contact.firstName?.[0]?.toUpperCase() || contact.lastName?.[0]?.toUpperCase() || '??'

  // Reset image error when contact changes (e.g., after edit)
  useEffect(() => {
    setImageError(false)
  }, [contact.id, contact.tileImageKey, contact.updatedAt])

  const handleDownload = async () => {
    // Fetch and convert image to base64 if available
    // Priority: 1. Business card image (if uploaded), 2. Tile image
    let photoData = ''
    let imageUrl: string | null = null
    let imageType = 'PNG'

    // Try business card image first
    if (contact.cardImageKey) {
      try {
        imageUrl = await getDownloadFileSignedURL({ key: contact.cardImageKey })
        imageType = contact.cardImageKey.toLowerCase().endsWith('.jpg') ||
                    contact.cardImageKey.toLowerCase().endsWith('.jpeg') ? 'JPEG' : 'PNG'
      } catch (error) {
        console.warn('Failed to get business card image, falling back to tile:', error)
        imageUrl = null
      }
    }

    // Fallback to tile image if no business card
    if (!imageUrl) {
      imageUrl = getTileImageUrl(contact)
      imageType = 'PNG'
    }

    // Fetch and encode the image
    if (imageUrl && !imageError) {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1]
            resolve(base64String)
          }
          reader.readAsDataURL(blob)
        })

        // Add PHOTO field with base64 encoded image
        // Using vCard 3.0 format for maximum compatibility
        photoData = `PHOTO;ENCODING=b;TYPE=${imageType}:${base64}`
      } catch (error) {
        console.warn('Failed to include photo in vCard:', error)
        // Continue without photo if fetch fails
      }
    }

    // Generate vCard content
    const vCardContent = `BEGIN:VCARD
VERSION:3.0
FN:${contact.firstName} ${contact.lastName}
N:${contact.lastName};${contact.firstName};;;
${contact.email ? `EMAIL:${contact.email}` : ''}
${contact.phone ? `TEL:${contact.phone}` : ''}
${contact.company ? `ORG:${contact.company}` : ''}
${contact.title ? `TITLE:${contact.title}` : ''}
${contact.website ? `URL:${contact.website}` : ''}
${contact.notes ? `NOTE:${contact.notes}` : ''}
${photoData}
END:VCARD`

    // Create blob and download
    const blob = new Blob([vCardContent], { type: 'text/vcard' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${contact.firstName}_${contact.lastName}.vcf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleEdit = () => {
    onEdit(contact)
  }

  const handleDelete = () => {
    onDelete(contact)
  }

  return (
    <Card
      variant="bento"
      className="overflow-hidden cursor-default hover:shadow-xl transition-shadow duration-300 group"
    >
      <div className="aspect-square relative">
        {tileUrl && !imageError ? (
          <img
            src={tileUrl}
            alt={`${contact.firstName} ${contact.lastName}`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-white text-6xl font-bold">
              {fallbackInitials}
            </div>
          </div>
        )}

        {/* Hover Overlay with Buttons */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          <button
            onClick={handleDownload}
            className="p-3 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors duration-200"
            title="Download vCard"
          >
            <Download className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={handleEdit}
            className="p-3 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors duration-200"
            title="Edit Contact"
          >
            <Pencil className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={handleDelete}
            className="p-3 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-colors duration-200"
            title="Delete Contact"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </Card>
  )
}

export default function Profile() {
  const { data: user, isLoading } = useAuth()
  const navigate = useNavigate()
  const { data: contacts, isLoading: contactsLoading, error: contactsError, refetch: refetchContacts } = useQuery(getAllContactsByUser)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest'>('name-asc')

  // Pagination state
  const [displayCount, setDisplayCount] = useState(20) // Number of contacts to display
  const CONTACTS_PER_PAGE = 20

  // Ref for search input (for keyboard shortcut)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(routes.LoginRoute.to)
    }
  }, [isLoading, user, navigate])

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Keyboard shortcuts
  // Cmd/Ctrl+K to focus search
  useKeyboardShortcut(
    { key: 'k', ctrlKey: true },
    () => {
      searchInputRef.current?.focus()
    }
  )

  // Also support Cmd+K on Mac
  useKeyboardShortcut(
    { key: 'k', metaKey: true },
    () => {
      searchInputRef.current?.focus()
    }
  )

  // N key to create new contact
  useKeyboardShortcut(
    { key: 'n' },
    () => {
      handleCreateCard()
    }
  )

  // Get unique companies for filter dropdown
  const uniqueCompanies = useMemo(() => {
    if (!contacts) return []
    const companies = contacts
      .map(c => c.company)
      .filter((company): company is string => Boolean(company && company.trim()))
    return Array.from(new Set(companies)).sort()
  }, [contacts])

  // Filter and sort contacts
  const filteredAndSortedContacts = useMemo(() => {
    if (!contacts) return []

    let filtered = contacts

    // Apply search filter (using debounced value)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filtered = filtered.filter(contact => {
        const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase()
        const email = contact.email?.toLowerCase() || ''
        const company = contact.company?.toLowerCase() || ''
        const phone = contact.phone?.toLowerCase() || ''

        return fullName.includes(query) ||
               email.includes(query) ||
               company.includes(query) ||
               phone.includes(query)
      })
    }

    // Apply company filter
    if (filterCompany !== 'all') {
      filtered = filtered.filter(contact => contact.company === filterCompany)
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        case 'name-desc':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`)
        case 'date-newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'date-oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        default:
          return 0
      }
    })

    return sorted
  }, [contacts, debouncedSearchQuery, filterCompany, sortBy])

  // Paginated contacts (slice based on displayCount)
  const paginatedContacts = useMemo(() => {
    return filteredAndSortedContacts.slice(0, displayCount)
  }, [filteredAndSortedContacts, displayCount])

  // Check if there are more contacts to load
  const hasMore = displayCount < filteredAndSortedContacts.length

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(CONTACTS_PER_PAGE)
  }, [debouncedSearchQuery, filterCompany, sortBy])

  // Check if filters are active
  const hasActiveFilters = debouncedSearchQuery.trim() !== '' || filterCompany !== 'all'

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterCompany('all')
  }

  // Load more contacts
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + CONTACTS_PER_PAGE)
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>
  }

  if (!user) {
    // We're redirecting anyway; render nothing.
    return null
  }
  const handleCreateCard = () => {
    navigate(routes.CreateContactRoute.to)
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingContact(null)
  }

  const handleModalSuccess = () => {
    toast.success('Contact updated successfully!')
    refetchContacts()
  }

  const handleDeleteContact = (contact: Contact) => {
    setDeletingContact(contact)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingContact) return

    try {
      await deleteContact({ id: deletingContact.id })
      toast.success('Contact deleted successfully!')
      setIsDeleteConfirmOpen(false)
      setDeletingContact(null)
      refetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete contact')
    }
  }

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false)
    setDeletingContact(null)
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">
          {user ? `Hi, ${user.username || 'there'}` : 'My Cards'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {contactsLoading
            ? 'Loading your contacts...'
            : contacts && contacts.length > 0
              ? hasActiveFilters
                ? `Showing ${paginatedContacts.length} of ${filteredAndSortedContacts.length} filtered contact${filteredAndSortedContacts.length !== 1 ? 's' : ''} (${contacts.length} total)`
                : displayCount < contacts.length
                  ? `Showing ${paginatedContacts.length} of ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`
                  : `You have ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`
              : "You don't have any cards yet."}
        </p>
        <button
          onClick={handleCreateCard}
          className="px-6 py-2 rounded-md border text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Create Card
        </button>
      </div>

      {/* Search and Filter Section */}
      {!contactsLoading && contacts && contacts.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, email, company, or phone... (Ctrl/⌘+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter by Company */}
            {uniqueCompanies.length > 0 && (
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="date-newest">Newest First</SelectItem>
                <SelectItem value="date-oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 whitespace-nowrap"
                title="Clear all filters"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {contactsError && (
        <div className="border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-md p-4 text-sm text-red-800 dark:text-red-200">
          Failed to load contacts. Please try refreshing the page.
        </div>
      )}

      {/* Loading State */}
      {contactsLoading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading your contacts...</p>
        </div>
      )}

      {/* Empty State - No Contacts */}
      {!contactsLoading && (!contacts || contacts.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No contacts yet. Create your first card to get started!</p>
        </div>
      )}

      {/* Empty State - No Search Results */}
      {!contactsLoading && contacts && contacts.length > 0 && filteredAndSortedContacts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No contacts found matching your filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Contact Grid */}
      {!contactsLoading && paginatedContacts.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedContacts.map((contact) => (
              <ContactTileCard
                key={contact.id}
                contact={contact}
                onEdit={handleEditContact}
                onDelete={handleDeleteContact}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                Load More ({filteredAndSortedContacts.length - displayCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit Contact Modal */}
      <EditContactModal
        contact={editingContact}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              {deletingContact && (
                <>
                  Are you sure you want to delete <strong>{deletingContact.firstName} {deletingContact.lastName}</strong>? This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelDelete}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
