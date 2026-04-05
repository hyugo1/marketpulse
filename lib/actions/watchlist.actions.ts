'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.model';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';

type DbUser = { _id?: unknown; id?: string; email?: string };

const getDb = async () => {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection not found');
  return db;
};

const getCurrentSessionEmail = async (): Promise<string | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.email ?? null;
};

const getUserIdByEmail = async (email: string): Promise<string | null> => {
  const db = await getDb();
  const user = await db.collection('user').findOne<DbUser>({ email });
  if (!user) return null;

  const userId = (user.id as string) || String(user._id || '');
  return userId || null;
};

// Helper function to validate stock symbol format
const isValidSymbol = (symbol: string): boolean => {
  // Allow alphanumeric base with optional dot or dash followed by one or more chars
  // Supports formats like: AAPL, TSLA, BTC-USD, .TO, BRK.A, SPY2
  const symbolRegex = /^[A-Z0-9]{1,10}(?:[.-][A-Z0-9]+)?$/i;
  return symbolRegex.test(symbol);
};

// Helper function to sanitize company name
const sanitizeCompanyName = (company: string): string => {
  // Remove any potential script tags or special characters that could be used for XSS
  return company
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 200); // Limit length
};

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];

  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    const symbols = items.map((i) => String(i.symbol));
    return symbols;
  } catch (err) {
    console.error('getWatchlistSymbolsByEmail error: [REDACTED]');
    return [];
  }
}

// Server action to get current user's watchlist symbols (uses session)
export async function getCurrentUserWatchlist(): Promise<string[]> {
  try {
    const email = await getCurrentSessionEmail();
    if (!email) {
      return [];
    }
    
    return await getWatchlistSymbolsByEmail(email);
  } catch (err) {
    console.error('getCurrentUserWatchlist error: [REDACTED]');
    return [];
  }
}

export async function saveWatchlistItem(email: string, symbol: string, company: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !symbol) {
    return { success: false, error: 'Email and symbol are required' };
  }

  // Validate symbol format
  const normalizedSymbol = symbol.toUpperCase().trim();
  if (!isValidSymbol(normalizedSymbol)) {
    return { success: false, error: 'Invalid symbol format' };
  }

  // Sanitize company name to prevent XSS
  const sanitizedCompany = sanitizeCompanyName(company);

  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return { success: false, error: 'User not found' };
    }

    await Watchlist.findOneAndUpdate(
      { userId, symbol: normalizedSymbol },
      {
        userId,
        symbol: normalizedSymbol,
        company: sanitizedCompany,
        addedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return { success: true };
  } catch (err) {
    console.error('saveWatchlistItem error: [REDACTED]');
    return { success: false, error: 'Failed to save watchlist item' };
  }
}

export async function removeWatchlistItem(email: string, symbol: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !symbol) {
    return { success: false, error: 'Email and symbol are required' };
  }

  // Validate symbol format
  const normalizedSymbol = symbol.toUpperCase().trim();
  if (!isValidSymbol(normalizedSymbol)) {
    return { success: false, error: 'Invalid symbol format' };
  }

  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return { success: false, error: 'User not found' };
    }

    await Watchlist.deleteOne({ userId, symbol: normalizedSymbol });

    return { success: true };
  } catch (err) {
    console.error('removeWatchlistItem error: [REDACTED]');
    return { success: false, error: 'Failed to remove watchlist item' };
  }
}

export async function removeCurrentUserWatchlistItem(symbol: string): Promise<{ success: boolean; error?: string }> {
  try {
    const email = await getCurrentSessionEmail();
    if (!email) {
      return { success: false, error: 'Not authenticated' };
    }
    
    return await removeWatchlistItem(email, symbol);
  } catch (err) {
    console.error('removeCurrentUserWatchlistItem error: [REDACTED]');
    return { success: false, error: 'Failed to remove watchlist item' };
  }
}
