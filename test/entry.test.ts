import { expect, test, describe } from 'bun:test';
import { PrismaClient } from '@prisma/client';

describe('entries', () => {
    const prisma = new PrismaClient();
    test('should be able to add a currency', async () => {
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
    test('should be able to pay for a pizza', async () => {
        // Create a credit card account
        const creditCardAccount = await prisma.account.create({
            data: {
                name: 'Credit Card',
                type: 'credit normal',
                currency: {
                    connect: {
                        code: 'USD',
                    },
                },
            },
        });
        // Start with a $100 credit limit
        await prisma.entry.create({
            data: {
                description: 'Opening balance',
                accountId: creditCardAccount.id,
                status: 'posted',
                direction: 'credit',
                amount: 10000,
            },
        });
        // Purchase a $10 pizza
        const pendingPizzaPurchase = await prisma.entry.create({
            data: {
                description: 'Pizza',
                accountId: creditCardAccount.id,
                status: 'pending',
                direction: 'debit',
                amount: 1000,
            },
        });
        // Settle the purchase - discard the pending entry
        await prisma.entry.update({
            data: {
                discarded_at: new Date(),
            },
            where: {
                id: pendingPizzaPurchase.id,
            },
        });
        // Settle the purchase - write a posted entry
        await prisma.entry.create({
            data: {
                description: 'Pizza',
                accountId: creditCardAccount.id,
                status: 'posted',
                direction: 'debit',
                amount: 1000,
            },
        });
        // Place a $50 hold on the card for a hotel
        const hotelHold = await prisma.entry.create({
            data: {
                description: 'Hotel hold',
                accountId: creditCardAccount.id,
                status: 'pending',
                direction: 'debit',
                amount: 5000,
            },
        });
        // Release the hold - discard the pending entry
        await prisma.entry.update({
            data: {
                discarded_at: new Date(),
            },
            where: {
                id: hotelHold.id,
            },
        });
        // Release the hold - write an archive entry
        await prisma.entry.create({
            data: {
                description: 'Hotel hold',
                accountId: creditCardAccount.id,
                status: 'archived',
                direction: 'debit',
                amount: 5000,
            },
        });
        // Compute the available balance
        const entries = await prisma.entry.findMany({
            select: {
                amount: true,
                direction: true,
            },
            where: {
                accountId: creditCardAccount.id,
                status: { in: ['pending', 'posted'] },
                discarded_at: null,
            },
        });
        const availableBalance = entries.reduce((balance, cur) => {
            return (
                balance +
                (cur.direction === 'credit' ? cur.amount : -cur.amount)
            );
        }, 0);
        expect(availableBalance).toBe(9000);
    });
});
