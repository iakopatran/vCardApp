import { HttpError } from 'wasp/server'
import type { Contact } from 'wasp/entities'
import type { CreateContact, GetAllContactsByUser, UpdateContact, DeleteContact } from 'wasp/server/operations'
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation'
import {
  createContactSchema,
  updateContactSchema,
  type CreateContactInput,
  type UpdateContactInput
} from './validation'

export const createContact: CreateContact<CreateContactInput, Contact> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  // Validate input
  const args = ensureArgsSchemaOrThrowHttpError(createContactSchema, rawArgs);

  // Check credit balance
  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { credits: true },
  });

  if (!user || user.credits < 1) {
    throw new HttpError(402, 'Insufficient credits. Please purchase more credits to create contacts.');
  }

  // Create the contact
  const contact = await context.entities.Contact.create({
    data: {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      company: args.company,
      title: args.title,
      website: args.website,
      notes: args.notes,
      sourceType: 'manual',
      tileImageKey: args.tileImageKey || null,
      cardImageKey: args.cardImageKey || null,
      user: {
        connect: { id: context.user.id }
      }
    }
  });

  // Deduct 1 credit
  await context.entities.User.update({
    where: { id: context.user.id },
    data: { credits: { decrement: 1 } },
  });

  return contact;
};

type GetAllContactsArgs = {
  skip?: number
  take?: number
}

export const getAllContactsByUser: GetAllContactsByUser<GetAllContactsArgs, Contact[]> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const skip = args?.skip || 0
  const take = args?.take || undefined // undefined means no limit

  return context.entities.Contact.findMany({
    where: {
      userId: context.user.id
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip,
    ...(take && { take })
  });
};

export const updateContact: UpdateContact<UpdateContactInput, Contact> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  // Validate input
  const args = ensureArgsSchemaOrThrowHttpError(updateContactSchema, rawArgs);

  // Verify the contact belongs to the user
  const contact = await context.entities.Contact.findUnique({
    where: { id: args.id }
  });

  if (!contact) {
    throw new HttpError(404, 'Contact not found');
  }

  if (contact.userId !== context.user.id) {
    throw new HttpError(403, 'Unauthorized to update this contact');
  }

  return context.entities.Contact.update({
    where: { id: args.id },
    data: {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      company: args.company,
      title: args.title,
      website: args.website,
      notes: args.notes,
      tileImageKey: args.tileImageKey || contact.tileImageKey,
      cardImageKey: args.cardImageKey !== undefined ? args.cardImageKey : contact.cardImageKey,
    }
  });
};

type DeleteContactArgs = {
  id: string
}

export const deleteContact: DeleteContact<DeleteContactArgs, Contact> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  // Verify the contact belongs to the user
  const contact = await context.entities.Contact.findUnique({
    where: { id: args.id }
  });

  if (!contact) {
    throw new HttpError(404, 'Contact not found');
  }

  if (contact.userId !== context.user.id) {
    throw new HttpError(403, 'Unauthorized to delete this contact');
  }

  // Delete the tile file if it exists
  if (contact.tileImageKey) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Extract filename from the tile path (e.g., "tiles/FirstName_LastName_tile.png")
      const tilePath = contact.tileImageKey.replace('tiles/', '');

      // Construct full path to tile file
      // In development: ../tiles/
      // In production: adjust based on your deployment structure
      const projectRoot = process.cwd();
      const tileDir = path.join(projectRoot, '..', 'tiles');
      const fullPath = path.join(tileDir, tilePath);

      // Delete the file if it exists
      await fs.unlink(fullPath).catch((err) => {
        console.warn(`Failed to delete tile file ${fullPath}:`, err.message);
        // Don't throw - continue with contact deletion even if file deletion fails
      });
    } catch (error) {
      console.error('Error deleting tile file:', error);
      // Continue with contact deletion
    }
  }

  return context.entities.Contact.delete({
    where: { id: args.id }
  });
};