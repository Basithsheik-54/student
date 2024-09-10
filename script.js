const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
const serviceAccount = require("./key.json");

try {
    initializeApp({
        credential: cert(serviceAccount)
    });
} catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    process.exit(1); // Exit the process with an error code
}

const db = getFirestore();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use('/static', express.static(path.join(__dirname, 'publics')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// User registration
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

// User login
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

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.render('dashboard', { user: req.session.user });
    } else {
        res.redirect('/login');
    }
});

// Render signup page
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Render login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Home route
app.get('/', (req, res) => {
    res.redirect('/login'); // Redirect to login by default
});

// User logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/login');
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
});
