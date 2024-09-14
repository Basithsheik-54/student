const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK with your service account
const serviceAccount = require("./key.json");

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use('/static', express.static(path.join(__dirname, 'publics')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/static', express.static('public/static'));


app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

// Handle user registration
app.post('/signup', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.send('Passwords do not match');
    }

    try {
        const userRef = db.collection('users').doc(email);
        const doc = await userRef.get();

        if (doc.exists) {
            return res.send('User already exists');
        }

        await userRef.set({ username, email, password });

        req.session.user = email;
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Handle user login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userRef = db.collection('users').doc(email);
        const doc = await userRef.get();

        if (doc.exists && doc.data().password === password) {
            req.session.user = email;
            res.redirect('/dashboard');
        } else {
            res.render('login', { error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Render the dashboard
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.render('dashboard', { user: req.session.user });
    } else {
        res.redirect('/login');
    }
});

// Route for sign-up page
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Route for login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Home route
app.get('/', (req, res) => {
    res.render('home');
});

// Route for the games page
app.get('/Movies', (req, res) => {
    res.render('Movies');
});
app.get('/about', (req, res) => {
    res.render('about'); // Make sure the view file 'about' exists
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.sendStatus(200);
        }
    });
});

app.use('/static', express.static('public'));

app.get('/Movies', (req, res) => {
    const movies = [
        { title: 'Inception', posterUrl: '/static/images/inception.jpg' },
        { title: 'Interstellar', posterUrl: '/static/images/interstellar.jpg' },
        { title: 'The Dark Knight', posterUrl: '/static/images/dark_knight.jpg' },
        // Add more movies here
    ];
    res.render('Movie', { movies });
});


// Start the server
app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
});