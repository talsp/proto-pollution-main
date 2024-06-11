const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { ObjectId } = require('mongodb');
const path = require('path');
const Joi = require('joi');


const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


const port = 3000;

// Example schema for input validation using Joi
const userObjSchema = Joi.object({
    nickname: Joi.string().alphanum().min(2).max(30).required(),
    firstName: Joi.string().alphanum().min(2).max(30).required(),
    lastName: Joi.string().alphanum().min(2).max(30).required(),
    email: Joi.string().email().required()
});



function Users(id, nickname, firstName, lastName, email){
    this.id = id,
    this.nickname = nickname;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
}

global.users = [];
global.currentUser = {};

//Best practice: create a middleware directory and and auth.js file. import to this file
//               There should be a routes directory and this file should point to each route file with
//               the auth middleware for every private route
//auth middleware
const auth = (req, res, next) => {
    if (global.currentUser && global.currentUser.isLoggedIn) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};

//should not fetch all users at the start of the app. should rather fetch all users if current user is authorized
const getUsers = async (req, res) => {
    //URL should be stored in an env manager like AWS Systems Manager Parameter Store or Secrets Manager
    const result = await axios.get('http://localhost:5000/users');
    return result.data;  
};

const attachUsersToObject = async () => {
    try {
        const users = await getUsers();
        for (const user of users) {

            
            const tempUser = new Users(user._id, user.nickname, user.firstName, user.lastName, user.email);
            console.log(tempUser)
            global.users.push(tempUser);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
};

attachUsersToObject();

const updateCurrentUser = (prop, value) =>{
    try{
        //authorization should be done in the portal with the token
        if(prop == "isAdmin"){
            return false;
        }

        //property whitelist
       /* if(prop !== "nick" && prop !== "firstName" && prop !== "lastName" && prop !== "email"){
            return false;
        }*/


        return true;
    }
    catch(e){
        console.log(`Error: ${e}`);
        return false;
    }
    
}

const updateUser = (email, prop, value) =>{
    try{
        //authorization should be done in the portal with the token
        if(prop == "isAdmin"){
            return false;
        }
   
        const user = global.users.find(user => user.email === email);
        
        user[prop] = value;
        console.log(user[prop])
        console.log(user)

        return true;
    }
    catch(e){
        console.log(`Error: ${e}`);
        return false;
    }
    
}

app.post('/api/authenticate', async (req,res) =>{
    const {token} = req.body;

    try{
        //URL should be stored in an env manager like AWS Systems Manager Parameter Store or Secrets Manager
        const result = await axios.get('http://localhost:5000/users/auth', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if(result.status === 200){
            
            if(result.data.isAdmin){
                global.currentUser = {
                    id: result.data.id,
                    nickname: result.data.nickname,
                    firstName: result.data.firstName,
                    lastName: result.data.lastName,
                    email: result.data.email,
                    isAdmin: result.data.isAdmin,
                    isLoggedIn: true //auth should be done in the portal for every request
                }
            }
            else{
                global.currentUser = {
                    id: result.data.id,
                    nickname: result.data.nickname,
                    firstName: result.data.firstName,
                    lastName: result.data.lastName,
                    email: result.data.email,
                    isLoggedIn: true //auth should be done in the portal for every request
                }
            }
            
            return res.status(200).send(true);
        }
        else{
            return res.status(400).send(false);
        }
    }
    catch(e){
        console.log(`ERROR: ${e}`);     //Logs should be stored in the db with index
        return res.status(400).send(false);
    }

    
})

app.get("/api/users", auth, (req, res) => {
    //authorization should be done in the portal with the token
    console.log(global.currentUser)
    if(global.currentUser.isAdmin){
        return res.status(200).send(global.users);
    }
    else{
        return res.status(401).send("Unauthorized");
    }
    
	
});

app.get("/api/current-user", auth, (req, res) => {
    //authorization should be done in the portal with the token
    return res.status(200).send(global.currentUser);
    
	
});

app.get("/api/send-users-to-portal", auth, async (req,res) =>{

    try{
        //URL should be stored in an env manager like AWS Systems Manager Parameter Store or Secrets Manager
        const result = await axios.post('http://localhost:5000/collect-users', global.users);
        return res.status(400).send(result.status);
    }
    catch(e){
        console.log(`ERROR: ${e}`);     //Logs should be stored in the db with index
        return res.status(400).send(false);
    }
})


app.get("/admin", auth, (req,res) =>{
    //authorization should be done in the portal with the token
    if(global.currentUser.isAdmin == true){
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    }
    else{
        return res.status(401).send("Unauthorized");
    }
})

app.get("/login", (req,res) =>{
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
})

app.get("/", auth, (req,res) =>{
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
})




app.post('/api/users/login', async (req,res) =>{
    const {email, password} = req.body;
    try{
        //URL should be stored in an env manager like AWS Systems Manager Parameter Store or Secrets Manager
        const result = await axios.post('http://localhost:5000/users/login', {
            email,
            password
        });
        if(result.status === 200){
            return res.status(200).send(result.data.msg);
        }
        else{
            console.log(result);
            return res.status(400).send(false);
        }    
    }
    catch(e){
        console.log(`ERROR: ${e}`); //Logs should be stored in the db with index
        return res.status(400).send(false);
    }
})

app.post("/api/users", async (req, res) => {
    const {nickname, firstName, lastName, email, password, confirmPassword} = req.body;
	try{
        //URL should be stored in an env manager like AWS Systems Manager Parameter Store or Secrets Manager
        const result = await axios.post('http://localhost:5000/users/register', {
            nickname,
            firstName,
            lastName,
            email,
            password,
            confirmPassword
        });
        if(result.status === 200){
            return res.status(200).send(true);
        }
        else{
            console.log(result); //Logs should be stored in the db with index
            return res.status(400).send(false);
        }    
    }
    catch(e){
        console.log(`ERROR: ${e}`);
        return res.status(400).send(false);
    }
});

//Authorization should be done in the portal for every request using the token
app.post("/api/users/update-user", (req, res) => {
	var data = JSON.parse(JSON.stringify(req.body));
  
    const result = updateUser(data["email"], data["prop"], data["val"]);

    return res.status(200).send(result);
})

//Authorization should be done in the portal for every request using the token
app.post("/api/users/update-current-user", (req, res) => {
	var data = JSON.parse(JSON.stringify(req.body));
  
    const result = updateCurrentUser( data["prop"], data["val"]);

    return res.status(200).send(result);
})

//Authorization should be done in the portal for every request using the token
app.get("/api/users/set-admin/:id", async (req, res) => {
	var id = req.params.id;
    try{
        
        const user = global.users.find(user => user.id === id);
        
        user["isAdmin"] = true;
        console.log(user)
        try{
            //URL should be stored in an env manager like AWS Systems Manager Parameter Store or Secrets Manager
            const result = await axios.post('http://localhost:5000/set-admin', user);
            return res.status(400).send(result.status);
        }
        catch(e){
            console.log(`ERROR: ${e}`); //Logs should be stored in the db with index
            return res.status(400).send(false);
        }

        
    }
    catch(e){
        console.log(`ERROR: ${e}`); //Logs should be stored in the db with index
        return res.status(400).send(false);
    }

    
})



app.listen(port, '0.0.0.0');
console.log(`App running on port: ${port}`);