import { expect, test, describe } from 'bun:test';
import { PrismaClient } from '@prisma/client';

describe('entries', () => {
    test('should be able to add a currency', async () => {
        const prisma = new PrismaClient();
        await prisma.currency.upsert({
            create: {
                name: 'US Dollar',
                code: 'USD',
                numeric_code: '840',
                exponent: 2,
            },
            update: {},
            where: {
                code: 'USD',
            },
        });
    });
});
