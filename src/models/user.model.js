import mongoose ,{Schema} from 'mongoose';

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String, //cloudinary service hosting
        required:true,
    },
    coverImage:{
        type:String, //cloudinary service hosting
    },
    watchHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Video"
    }],
    password:{
        type:String, // apply encryption
        required:[true,'Password is required']
    },
    refreshToken:{
        type:String
    }

},{timestamps:true})

export const User = mongoose.model("User",userSchema)