// Vulnerable server code
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const User = require('./models/User');
const mongoose = require('mongoose');
const backendApp = require('./backend');
const { ObjectId } = require('mongodb');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const saltRounds = 10;
const port = 5000;
//Should be a stronger secret and stored in an env manager like AWS Systems Manager Parameter Store or Secrets Manager
const SECRET = "someSecretThatIsNotSecure"  

app.use(bodyParser.json());

//URL should be stored in an env manager like AWS Systems Manager Parameter Store or Secrets Manager
mongoose.connect('mongodb://127.0.0.1:27017/prototype_pollution', { useNewUrlParser: true, useUnifiedTopology: true });


app.get('/', (req, res) => {
  res.status(401)
  res.send('No access');
});

//missing auth
app.get('/users', async (req, res) => {
    try {
      const users = await User.find({}); 
      res.status(200).json(users);
    } catch (error)
     {
      res.status(500).json({ error: error.message });
    }
  });

app.get('/users/auth', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        console.log(authHeader)
        if (authHeader) {
          const token = authHeader.split(' ')[1];
          const decode = jwt.verify(token, SECRET);
          if (decode) {
            res.status(200).send(decode);
          } else {
            res.status(403).send('Forbidden: Invalid token');
          }
        } else {
          res.status(401).send('Unauthorized: No token provided');
        }
    } catch (error)
     {
      res.status(500).json({ error: error.message });
    }
  });

//missing auth
app.post('/confirm-admin', async (req, res) => {
    try {

      for (const user of req.body) {
        const { id, admin } = user;

        var checkUser;

        try{
          checkUser = await User.findById( new ObjectId(id));    
        }
        catch(e){
          console.log("ERROR:" + e);
        }

        if (!checkUser){
          res.status(400).json(false);
        }
        else{
          const updatedUser = await User.findByIdAndUpdate(id, {admin});
          console.log("updated user to admin: " + updatedUser)
        }  
      }
      
      res.status(200).json(true);
    } catch (error) {
        console.log(error)
        res.status(400).json({ error: error.message });
    }
  });


//missing auth
app.post('/set-admin', async (req, res) => {
    try {

      const { id, isAdmin } = req.body;
        var checkUser;

        try{
          checkUser = await User.findById( new ObjectId(id));    
        }
        catch(e){
          console.log("ERROR:" + e);
        }

        if (checkUser){
          const updatedUser = await User.findByIdAndUpdate(id, {isAdmin});
        }


      
      res.status(200).json(true);
    } catch (error) {
        console.log(error)
        res.status(400).json({ error: error.message });
    }
  });

//missing auth
app.post('/collect-users', async (req, res) => {
    try {

      for (const user of req.body) {
        const { id, nickname, firstName, lastName, email } = user;
        var checkUser;

        try{
          checkUser = await User.findById( new ObjectId(id));    
        }
        catch(e){
          console.log("ERROR:" + e);
        }

        if (!checkUser){
          const e = new User({ nickname, firstName, lastName, email });
          console.log(e)
          await e.save();
        }
        else{
          const updatedUser = await User.findByIdAndUpdate(id, {nickname, firstName, lastName, email});
        }
        
        
        
        
      }

      
      res.status(200).json(true);
    } catch (error) {
        console.log(error)
        res.status(400).json({ error: error.message });
    }
  });


//@route    POST /users/login
//@desc     Returns an authentication JWT
//@access   Public
app.post('/users/login', async (req,res) =>{
  const {email, password} = req.body;

  try{
      const user = await backendApp.getUserByEmail(email);

      if(!user || user.length <= 0){
          console.log("Can't find email");
          res.statusCode = 400;
          return res.json({success: false, msg: "Username or password incorrect"}); 
      }

      const decryptResult = await bcrypt.compare(password, user[0].password);

      if(!decryptResult){
          console.log("Incorrect Password");
          res.statusCode = 400;
          return res.json({success: false, msg: "Username or password incorrect"}); 
      }
     
      const clientIpAddress = req.socket.remoteAddress;

      //the payload in the JWT is public and should not consist of user data
      const payload = {
          id: user[0]._id,
          nickname: user[0].nickname,
          firstName: user[0].firstName,
          lastName: user[0].lastName,
          email: user[0].email,
          isAdmin: user[0].isAdmin,
          ipAddress: clientIpAddress
         // iexp: Math.floor(Date.now() / 1000) + (60 * 60)
      };

      let token = jwt.sign(payload, SECRET, { expiresIn: '1d' });


      res.statusCode = 200;
      return res.json({success: true, msg: token});
  }
  catch(err){
      console.log(err);
      res.statusCode = 400;
      return res.json({success: false, msg: "Failed to login"});
  }


})

//@route    POST /users/register
//@desc     Adds the new user data to the DB
//@access   Public
app.post('/users/register', async (req,res) =>{

  
  let {nickname, firstName, lastName, email, password, confirmPassword} = req.body;

  if(password != confirmPassword){
      console.log("Passwords do not match");
      res.statusCode = 400;
      return res.json({success: false, msg: "passwords do not match"});
  }

  const existingEmail =  await backendApp.checkExistingEmail(email);

  if(!existingEmail){
      console.log("User Exists")
      res.statusCode = 400;
      return res.json({success: false, msg: "Error registering user"});
  }

 
  try{
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      let userToBeRegistered = new User({
          nickname,
          firstName,
          lastName,
          email,
          password: hashedPassword
      });
      
      const newUser = await userToBeRegistered.save();

      if(newUser.length <= 0){
          console.log("Database Error")
          res.statusCode = 400;
          return res.json({success: false, msg: "Failed to register user"});
      }
  
      res.statusCode = 200;
      console.log("Registration successful");
      return res.json({success: true, msg: "Registration successful"});
  }
  catch(err){
      console.log(err);
      res.statusCode = 400;
      return res.json({success: false, msg: "Failed to register user"});
  }
 


  
});




app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
