require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profiles');
const interactionRoutes = require('./routes/interactions');
const messageRoutes = require('./routes/messages');
const tagRoutes = require('./routes/tags');
const adminRoutes = require('./routes/admin');
const blockRoutes = require('./routes/blocks');
const reportRoutes = require('./routes/reports');
const locationRoutes = require('./routes/location');

// Error middleware
const errorHandler = require('./middleware/errorHandler');
const wsServer = require('./websockets/wsServer');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // Limit IP to 1000 request per window
});
app.use(limiter);

// Parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Bad json format middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON format' });
    }
    next(err);
});

// Serv static file
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
	setHeaders: function(res, path){
		res.set("Cross-Origin-Resource-Policy", "cross-origin");
	}
}));
app.use('/default_profile_pictures', express.static(path.join(__dirname, 'default_profile_pictures'), {
	setHeaders: function(res, path){
		res.set("Cross-Origin-Resource-Policy", "cross-origin");
	}
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes.router);
app.use('/api/profiles', profileRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/block', blockRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/location', locationRoutes);

// Health route
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Matcha API is running' });
});

// Error middleware
app.use(errorHandler);

// 404 route
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on('upgrade', (req, socket, head) => {
  wsServer.server.handleUpgrade(req, socket, head, (ws) => {
    wsServer.server.emit('connection', ws, req)
  })
});
