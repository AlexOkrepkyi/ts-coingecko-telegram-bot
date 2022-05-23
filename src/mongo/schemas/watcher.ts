import mongoose from "mongoose";


const watcherSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    coinSymbol: String,
    coinId: String,
    compare: String,
    price: {
        type: Number || String,
        min: 0
    },
    createdAt: Date
})


export const WatcherModel = mongoose.model("Watcher", watcherSchema);
