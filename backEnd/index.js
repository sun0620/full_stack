'use strict';

require('dotenv').config();
const express           = require('express');
const bodyParser        = require('body-parser');
const passport          = require("passport");
const JwtStrategy       = require('passport-jwt').Strategy;
const LocalStrategy     = require('passport-local').Strategy;
const ExtractJwt        = require('passport-jwt').ExtractJwt;
const bcrypt            = require('bcryptjs');
const user_routes       = require('./routes/user');
const User              = require('./models/user');
const customMdw         = require('./middleware/custom');
const cookieParser      = require('cookie-parser');
const cors = require('cors');

let app = express();

passport.use(new LocalStrategy({
    usernameField: "user_email",
    passwordField: "user_password",
    session: false
}, (username, password, done)=>{
    console.log("ejecutando *callback verify* de estategia local");
    // User.findOne({username:username})
    // User.users.findUnique({ where: { id: 1 } })
    User.users.findFirst({ where: { email_addr: username } })
    .then(data=>{
        if(data === null) return done(null, false); //el usuario no existe
        else if(!bcrypt.compareSync(password, data.pwd)) { return done(null, false); } //no coincide la password
        return done(null, data); //login ok
    })
    .catch(err=>done(err, null)) // error en DB
}));

let opts = {}
// opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
var cookieExtractor = function(req) {
    var token = null;
    if (req && req.cookies['jwt']) token = req.cookies['jwt'];
    return token;
  };
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = process.env.JWT_SECRET;
opts.algorithms = [process.env.JWT_ALGORITHM];

passport.use(new JwtStrategy(opts, (jwt_payload, done)=>{
    console.log("ejecutando *callback verify* de estategia jwt");
    User.users.findUnique({ where: { id: jwt_payload.sub } })
        .then(data=>{
        if (data === null) {
            return done(null, false);
        }
        else  
            return done(null, data);
        })
        .catch(err=>done(err, null))
}));

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ credentials: true, origin: 'http://localhost:19006' }));

app.use('/api', user_routes);

app.use(customMdw.errorHandler);
app.use(customMdw.notFoundHandler);

let port = process.env.PORT || 5000;
app.listen(port, function () {
  console.log('express server listening ...');
});
