"use server";

import { connectToDatabase } from "@/database/mongoose";
import Watchlist from "@/database/models/watchlist.model";
import mongoose from "mongoose";

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
