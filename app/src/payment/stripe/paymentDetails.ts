import { PrismaClient } from '@prisma/client';

export const updateUserStripePaymentDetails = async (
  { userStripeId, datePaid, numOfCreditsPurchased, amountPaid }: {
    userStripeId: string;
    numOfCreditsPurchased?: number;
    datePaid?: Date;
    amountPaid?: number; // Amount in dollars
  },
  userDelegate: PrismaClient['user']
) => {
  return userDelegate.update({
    where: {
      paymentProcessorUserId: userStripeId
    },
    data: {
      paymentProcessorUserId: userStripeId,
      datePaid,
      credits: numOfCreditsPurchased !== undefined ? { increment: numOfCreditsPurchased } : undefined,
      totalSpent: amountPaid !== undefined ? { increment: amountPaid } : undefined,
    },
  });
};
