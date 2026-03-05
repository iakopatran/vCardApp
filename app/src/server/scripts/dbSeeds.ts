import { type User } from 'wasp/entities';
import { faker } from '@faker-js/faker';
import type { PrismaClient } from '@prisma/client';

type MockUserData = Omit<User, 'id'>;

/**
 * This function, which we've imported in `app.db.seeds` in the `main.wasp` file,
 * seeds the database with mock users via the `wasp db seed` command.
 * For more info see: https://wasp.sh/docs/data-model/backends#seeding-the-database
 */
export async function seedMockUsers(prismaClient: PrismaClient) {
  await Promise.all(generateMockUsersData(50).map((data) => prismaClient.user.create({ data })));
}

function generateMockUsersData(numOfUsers: number): MockUserData[] {
  return faker.helpers.multiple(generateMockUserData, { count: numOfUsers });
}

function generateMockUserData(): MockUserData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const now = new Date();
  const createdAt = faker.date.past({ refDate: now });
  const timePaid = faker.date.between({ from: createdAt, to: now });
  const credits = faker.number.int({ min: 0, max: 20 });
  const totalSpent = faker.number.float({ min: 0, max: 100, precision: 0.01 });
  const hasUserPaid = totalSpent > 0;
  return {
    email: faker.internet.email({ firstName, lastName }),
    username: faker.internet.userName({ firstName, lastName }),
    createdAt,
    isAdmin: false,
    credits,
    totalSpent,
    paymentProcessorUserId: hasUserPaid ? `cus_test_${faker.string.uuid()}` : null,
    datePaid: hasUserPaid ? faker.date.between({ from: createdAt, to: timePaid }) : null,
  };
}
