"use server";

import { connectToDatabase } from "@/database/mongoose";
import Watchlist from "@/database/models/watchlist.model";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export const getWatchlistSymbolsByEmail = async (
  email: string
): Promise<string[]> => {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    // Access the 'user' collection directly to find the user by email
    // Better Auth uses the 'user' collection (lowercase) by default in MongoDB adapter
    const user = await db?.collection("user").findOne<{
      _id: unknown;
      id: string;
      email: string;
    }>({ email });

    if (!user) {
      console.warn(`User with email ${email} not found.`);
      return [];
    }

    // user._id is usually an ObjectId or string depending on Better Auth config.
    // Watchlist.userId is a string. Ensure compatibility.
    const userId = (user.id as string) || String(user._id);
    if(!userId) {
      console.warn(`User with email ${email} has no id or _id.`);
      return [];
    }

    const watchlistItems = await Watchlist.find({ userId }, {symbol:1}).lean();

    return watchlistItems.map((item) => String(item.symbol));
  } catch (error) {
    console.error("Error fetching watchlist symbols:", error);
    return [];
  }
};

export const toggleWatchlist = async (symbol: string, company: string) => {
  try {
    await connectToDatabase();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;
    const existingItem = await Watchlist.findOne({ userId, symbol });

    if (existingItem) {
      await Watchlist.findByIdAndDelete(existingItem._id);
      revalidatePath("/");
      revalidatePath(`/stocks/${symbol}`);
      return { added: false };
    } else {
      await Watchlist.create({
        userId,
        symbol,
        company,
      });
      revalidatePath("/");
      revalidatePath(`/stocks/${symbol}`);
      return { added: true };
    }
  } catch (error) {
    console.error("Error toggling watchlist:", error);
    throw error;
  }
};

export const isStockInWatchlist = async (symbol: string) => {
  try {
    await connectToDatabase();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return false;
    }

    const userId = session.user.id;
    const item = await Watchlist.findOne({ userId, symbol });
    return !!item;
  } catch (error) {
    console.error("Error checking watchlist status:", error);
    return false;
  }
};
