import mongoose from "mongoose";
import { UserModel } from "./schemas/user"
import { WatcherModel } from "./schemas/watcher";


mongoose.connect(
    "mongodb://127.0.0.1:27017/testdb",
    () => { console.log("Connected to MongoDB") }
);

async function createUser(userId: string, username: string | undefined, created: Date) {
    const isUser = await UserModel.exists({ userId: userId });
    if (!isUser) {
        const user = await UserModel.create({ userId, username, created });
        console.log(user);
    };
    console.log(`User ${userId} already exists`);
}

async function createWatcher(userId: string, coinSymbol: string, coinId: string, compare: string, price: number | string) {
    const currentTime = new Date(new Date(Date.now()).toISOString());
    try {
        await WatcherModel.create({ userId, coinSymbol, coinId, compare, price })
    } catch (error) {
        console.log(`${currentTime}: Error - user ID: ${userId} | requested coin: ${coinSymbol} with ID: ${coinId} | requested price: ${price} => \n ${error}`);
    }
}


export const createUserExp = async (
    userId: string,
    username: string | undefined,
    created: Date
) => createUser(userId, username, created);

export const createNewWatcher = async (
    userId: string,
    coinSymbol: string,
    coinId: string,
    compare: string,
    price: number | string
) => createWatcher(userId, coinSymbol, coinId, compare, price);
