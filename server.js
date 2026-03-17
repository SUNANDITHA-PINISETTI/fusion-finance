const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Your actual Google Client ID
const CLIENT_ID = "971626613460-m32a68jfrcv4d0hdiacs4ufqpoj3qaju.apps.googleusercontent.com"; 
const client = new OAuth2Client(CLIENT_ID);

app.use(cors());
app.use(express.json());

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ success: false, message: "No token provided" });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        console.log("User Verified:", payload.name);

        // Send back user data to the frontend
        res.json({ 
            success: true, 
            user: { 
                name: payload.name, 
                email: payload.email, 
                picture: payload.picture 
            } 
        });
    } catch (err) {
        console.error("Verification Error:", err);
        res.status(401).json({ success: false, message: "Invalid Token" });
    }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));