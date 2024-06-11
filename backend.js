const express = require('express');
const router = express.Router();
const User = require('./models/User');

const ObjectId = require('mongoose').Types.ObjectId;


const checkExistingEmail = async (email) =>{
    const user = await User.find({email})
  
    if(user.length > 0){
        return false;
    }
    else{
        return true;
    }
  }

  const getUserByEmail = async (email) =>{

    try{
        const user = await User.find({email:email});
        return user;
    }
    catch(err)
    {
        console.log(err);
        return false
    }
    
  }

module.exports = {checkExistingEmail, getUserByEmail};