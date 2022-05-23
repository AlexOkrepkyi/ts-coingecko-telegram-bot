import { Context, Telegraf } from "telegraf";
import dotenv from 'dotenv';
import { createNewWatcher, createUserExp } from "../mongo/client";
import mongoose from "mongoose";
import axios from "axios";
import { WatcherModel } from "../mongo/schemas/watcher";


mongoose.connect(
    "mongodb://127.0.0.1:27017/testdb",
    () => { console.log("Connected to MongoDB") }
);

let coinsList: any[] = [];

async function getCoinsList() {
    return await axios
        .get(`https://api.coingecko.com/api/v3/coins/list`)
        .then(response => {
            coinsList.push(response.data)
        })
}

async function getDistinctCoinIds() {
    const distictCoinSymbols = await WatcherModel.distinct("coinId");
    console.log(distictCoinSymbols);
    return distictCoinSymbols;
}

let arrayCoinIdsAndPrices: Array<{ coinId: string, price: number }> = new Array;

async function getCoinsMarketsByIds(ids: Array<string>) {
    console.log(`ids: ${ids}`);

    arrayCoinIdsAndPrices = [];
    await axios
        .get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`)
        .then(resp => {
            resp.data.forEach((coin: any) => {
                arrayCoinIdsAndPrices.push({ coinId: coin.id, price: coin.current_price });
            });
            // console.log(`final response: ${ response }`);
            // response.forEach(coinObject => {
            //     console.log(coinObject.symbol);

            // })
            console.log(arrayCoinIdsAndPrices);
            console.log(arrayCoinIdsAndPrices.length);
        })
}

async function sendAlertsToUsers() {
    const all = await WatcherModel.find()
    all.forEach(async obj => {
        const currentCoinId = obj.coinId;
        const targetPrice = obj.price;
        console.log(currentCoinId);
        try {
            const currentPrice = arrayCoinIdsAndPrices.filter(coin => { return coin.coinId == currentCoinId })[0].price;
            if (obj.compare == ">") {
                console.log(">");
                if (currentPrice > targetPrice) {
                    console.log(`${targetPrice} : ${currentPrice}`)
                    console.log(obj.userId);
                    console.log(obj.id);
                    botExp.telegram.sendMessage(obj.userId, `${obj.coinSymbol.toUpperCase()} current price: ${currentPrice} USD\nYour target was ${targetPrice} USD`)
                    await WatcherModel.deleteOne({ _id: obj.id });
                }
            } else if (obj.compare == "<") {
                if (currentPrice < targetPrice) {
                    console.log(`${targetPrice} : ${currentPrice}`)
                    console.log(obj.userId);
                    console.log(obj.id);
                    botExp.telegram.sendMessage(obj.userId, `${obj.coinSymbol.toUpperCase()} current price: ${currentPrice} USD\nYour target was ${targetPrice} USD`)
                    await WatcherModel.deleteOne({ _id: obj.id });
                }
            }
        } catch (error) { }
    })
}

async function getCoinPrice(coinId: string) {
    return await axios
        .get(`https://api.coingecko.com/api/v3/coins/${coinId}/tickers`)
        .then(response => {
            return (response.data.tickers).filter(
                (obj: { base: string, target: string; }) =>
                    obj.target == "USDT")[0].last
        });
};

async function getCoinId(coinSymbol: string) {
    const coin = coinsList[0].filter((coin: { symbol: string; }) => { return coin.symbol == coinSymbol });
    try {
        const coinId = coin[0].id;
        return coinId
    } catch (error) { }


    // return await axios
    //     .get(`https://api.coingecko.com/api/v3/coins/list`)
    //     .then(response => {
    //         return (response.data).filter(
    //             (obj: { symbol: string }) => {
    //                 return obj.symbol == coinSymbol.toLowerCase()
    //             }
    //         )[0].id
    //     });
};

export const getCoinIdExp = async (coinSymbol: string) => getCoinId(coinSymbol);

export const coinPrice = async (coinSymbol: string) => {
    const coinId: string = await getCoinId(coinSymbol)
    return getCoinPrice(coinId);
}

export const getCoinsListExp = async () => {
    await getCoinsList();
}

export const getUniqueCoins = async () => {
    // await getCoinsList();
    // console.log(coinsList);

    const ids = await getDistinctCoinIds();
    console.log(`ids: ${ids} `);

    return await getCoinsMarketsByIds(ids);
}

export const sendAlertsExp = () => {
    return sendAlertsToUsers();
}


dotenv.config();

declare const process: {
    env: {
        BOT_TOKEN: string
    }
}

const bot = new Telegraf(process.env.BOT_TOKEN);
export const botExp = bot;

bot.start((ctx: { reply: (arg0: string) => any; }) =>
    ctx.reply("Hey, I'm a Watcher. I can keep you aware about an actual price of your favorite tokens.")
);

bot.help((ctx: { reply: (arg0: string) => any; }) =>
    ctx.reply("Examples: \
        \n\nBTC => will print out current BTC price. \
        \n\nBTC > 100000 => will create a watcher with a specified target price.")
);

bot.on("text", async (ctx) => {
    const userMessage = (ctx.message.text).toLowerCase();
    const username = ctx.from.username;
    const userId = (ctx.from.id).toString();
    const currentTime = new Date(new Date(Date.now()).toISOString());
    const isWatcher = userMessage.split(" ").length == 3;
    if (isWatcher) {
        const splittedMessage = userMessage.split(" ");
        console.log(splittedMessage);
        const coinSymbol = splittedMessage[0];
        console.log(coinSymbol);
        const compare = splittedMessage[1];
        console.log(compare);
        const price = splittedMessage[2];
        console.log(price);
        const coinId = await getCoinIdExp(coinSymbol);
        console.log("coinslist is:");
        console.log(coinsList[0].filter((coin: { symbol: any; }) => { return coin.symbol == coinSymbol })[0]);
        const isCoin = coinsList[0].filter((coin: { symbol: any; }) => { return coin.symbol == coinSymbol })[0];
        const isComparator = [">", "<"].includes(compare);
        const hasPrice = !isNaN(Number(price)) == true && Number(price) >= 0;
        if (isCoin && isComparator && hasPrice) {
            console.log(`+ coin + compare + price`);
            ctx.reply(`${coinSymbol.toUpperCase()} current price: ${await coinPrice(coinSymbol)} USDT`);
            createUserExp(userId, username, currentTime);
            createNewWatcher(userId, coinSymbol, coinId, compare, price);
        } else if (isCoin && isComparator && !hasPrice) {
            console.log(`+ coin + compare - price`);
            ctx.reply(`The price [${price}] looks weird, cannot accept it.`);
        } else if (isCoin && !isComparator && hasPrice) {
            console.log(`+ coin - compare + price`);
            ctx.reply(`The compare symbols [${compare}] looks weird, I can accept > or < only.`);
        } else if (!isCoin && isComparator && hasPrice) {
            console.log(`- coin + compare + price`);
            ctx.reply(`Sorry, I didn't find the ${coinSymbol.toUpperCase()} coin. Did you spell it correct?`);
        } else if (isCoin && !isComparator && !hasPrice) {
            console.log(`+ coin - compare - price`);
            ctx.reply(`The compare symbols [${compare}] looks weird, I can accept > or < only.\n\nAlso, the price [${price}] looks weird, cannot accept it.`);
        } else if (!isCoin && !isComparator && hasPrice) {
            console.log(`- coin - compare + price`);
            ctx.reply(`Sorry, I didn't find the ${coinSymbol.toUpperCase()} coin. Did you spell it correct?\n\nAlso, the compare symbols [${compare}], can accept [>] or [<] only.`);
        } else if (!isCoin && isComparator && !hasPrice) {
            console.log(`- coin + compare - price`);
            ctx.reply(`Sorry, I didn't find the ${coinSymbol.toUpperCase()} coin. Did you splell it correct?\n\nAlso, the price [${price}] looks weird, cannot accept it.`);
        } else {
            ctx.reply(`Sorry, I didn't find the ${coinSymbol.toUpperCase()} coin. Did you spell it correct?\n\nAlso, cannot understand the compare symbol [${compare}].\n\nAlso, the price [${price}] looks weird, cannot accept it.`);
        }

        // try {
        //     ctx.reply(`Current price: ${ await coinPrice(coin) } USDT`);
        //     createNewUser(userId, username, currentTime);
        //     createNewWatcher(userId, coin, price);
        // } catch (error) {
        //     ctx.reply(`Sorry, I didn't find the ${coin.toUpperCase()} coin. Did you spell it correct?`)
        //     // console.log(`${currentTime}: Error from user ${username} | user ID: ${userId} | user message: ${userMessage} => \n ${error}`);
        // }
    } else {
        try {
            ctx.reply(`${await coinPrice(userMessage)} USD`);
            createUserExp(userId, username, currentTime);
        } catch (error) {
            ctx.reply(`Sorry, I didn't find the ${userMessage.toUpperCase()} coin. Did you spell it correct?`)
            console.log(`${currentTime}: Error - username ${username} | user ID: ${userId} | user message: ${userMessage} => \n ${error}`);
        }
    }
})

export const botLaunch = async () => bot.launch();

// bot.on("text", (ctx: { reply: (arg0: string) => any; }) =>
//     ctx.reply("👍")
// );


// bot.hears('hi', (ctx) => ctx.reply('Hey there'))
// bot.launch()

// // Enable graceful stop
// process.once('SIGINT', () => bot.stop('SIGINT'))
// process.once('SIGTERM', () => bot.stop('SIGTERM'))
// const { Telegraf } = require('telegraf')

// const bot = new Telegraf(process.env.BOT_TOKEN)
// bot.command('oldschool', (ctx) => ctx.reply('Hello'))
// bot.command('hipster', Telegraf.reply('λ'))
// bot.launch()

// // Enable graceful stop
// process.once('SIGINT', () => bot.stop('SIGINT'))
// process.once('SIGTERM', () => bot.stop('SIGTERM'))