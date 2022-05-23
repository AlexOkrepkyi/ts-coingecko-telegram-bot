import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    createdAt: Date
});


export const UserModel = mongoose.model("User", userSchema);
