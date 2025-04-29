const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'secretkey_kackerNews'; 

app.use(cors());
app.use(express.json());


mongoose.connect('mongodb://localhost:27017/hackernews', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);


const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    points: { type: Number, default: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    type: { type: String, enum: ['link', 'ask', 'show', 'job'], default: 'link' },
});

const Post = mongoose.model('Post', postSchema);


const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    createdAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model('Comment', commentSchema);

// JWT Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('JWT verification error:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
    }
};


const apiRouter = express.Router();

apiRouter.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        console.log(`User registered: ${username}`);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Server error: Failed to register user' });
    }
});

apiRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        console.log(`User logged in: ${user.username}`);
        res.json({ token });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Server error: Failed to login' });
    }
});

apiRouter.get('/posts', async (req, res) => {
    try {
        let sort = req.query.sort === 'date' ? { createdAt: -1 } : { points: -1, createdAt: -1 };
        let filter = {};
        const section = req.query.section || 'new';

        if (req.query.filter === 'my' && req.query.userId) {
            if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
                console.warn(`Invalid userId: ${req.query.userId}`);
                return res.status(400).json({ error: 'Invalid user ID' });
            }
            const userExists = await User.findById(req.query.userId);
            if (!userExists) {
                console.warn(`User not found for userId: ${req.query.userId}`);
                return res.status(404).json({ error: 'User not found' });
            }
            filter.author = req.query.userId;
        }

        switch (section) {
            case 'new':
                sort = { createdAt: -1 };
                break;
            case 'past':
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                filter.createdAt = { $lt: oneWeekAgo };
                sort = { createdAt: -1 };
                break;
            case 'ask':
                filter.type = 'ask';
                break;
            case 'show':
                filter.type = 'show';
                break;
            case 'job':
                filter.type = 'job';
                break;
            default:
                return res.status(400).json({ error: 'Invalid section' });
        }

        const posts = await Post.find(filter)
            .populate({
                path: 'author',
                select: 'username',
                match: { _id: { $exists: true } }
            })
            .sort(sort)
            .limit(50);
        const validPosts = posts.filter(post => post.author);
        console.log(`Fetched ${validPosts.length} posts for section: ${section}`);
        res.setHeader('Content-Type', 'application/json');
        res.json(validPosts);
    } catch (err) {
        console.error('Get posts error:', err.message);
        res.status(500).json({ error: `Server error: Failed to fetch posts - ${err.message}` });
    }
});

apiRouter.get('/comments', async (req, res) => {
    console.log('Received request for /api/comments');
    try {
        const comments = await Comment.find({})
            .populate('author', 'username')
            .populate('post', 'title')
            .sort({ createdAt: -1 })
            .limit(50);
        const validComments = comments.filter(comment => comment.author && comment.post);
        console.log(`Fetched ${validComments.length} comments`);
        res.setHeader('Content-Type', 'application/json');
        res.json(validComments);
    } catch (err) {
        console.error('Get comments error:', err.message);
        res.status(500).setHeader('Content-Type', 'application/json').json({ error: `Server error: Failed to fetch comments - ${err.message}` });
    }
});

apiRouter.get('/posts/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.warn(`Invalid postId: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        const post = await Post.findById(req.params.id).populate('author', 'username');
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const comments = await Comment.find({ post: req.params.id })
            .populate('author', 'username')
            .sort({ createdAt: -1 });
        res.setHeader('Content-Type', 'application/json');
        res.json({ post, comments });
    } catch (err) {
        console.error('Get post details error:', err.message);
        res.status(500).json({ error: 'Server error: Failed to fetch post details' });
    }
});

apiRouter.post('/posts', authMiddleware, async (req, res) => {
    const { title, url, type } = req.body;
    if (!title || !url) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (type && !['link', 'ask', 'show', 'job'].includes(type)) {
        return res.status(400).json({ error: 'Invalid post type' });
    }
    try {
        const post = new Post({
            title,
            url,
            author: req.user.userId,
            type: type || 'link'
        });
        await post.save();
        const populatedPost = await Post.findById(post._id).populate('author', 'username');
        console.log(`Post submitted by ${req.user.username}: ${title} [${type || 'link'}]`);
        res.setHeader('Content-Type', 'application/json');
        res.status(201).json(populatedPost);
    } catch (err) {
        console.error('Submit post error:', err.message);
        res.status(500).json({ error: 'Server error: Failed to submit post' });
    }
});

apiRouter.put('/posts/:id', authMiddleware, async (req, res) => {
    const { title, url, type } = req.body;
    if (!title || !url) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (type && !['link', 'ask', 'show', 'job'].includes(type)) {
        return res.status(400).json({ error: 'Invalid post type' });
    }
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.warn(`Invalid postId: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        if (post.author.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized to edit this post' });
        }
        post.title = title;
        post.url = url;
        post.type = type || post.type;
        await post.save();
        const populatedPost = await Post.findById(post._id).populate('author', 'username');
        console.log(`Post edited by ${req.user.username}: ${title} [${type || post.type}]`);
        res.setHeader('Content-Type', 'application/json');
        res.json(populatedPost);
    } catch (err) {
        console.error('Edit post error:', err.message);
        res.status(500).json({ error: 'Server error: Failed to edit post' });
    }
});

apiRouter.put('/posts/:id/upvote', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.warn(`Invalid postId: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        post.points += 1;
        await post.save();
        const populatedPost = await Post.findById(post._id).populate('author', 'username');
        console.log(`Post upvoted by ${req.user.username}: ${post.title}`);
        res.setHeader('Content-Type', 'application/json');
        res.json(populatedPost);
    } catch (err) {
        console.error('Upvote post error:', err.message);
        res.status(500).json({ error: 'Server error: Failed to upvote post' });
    }
});

apiRouter.post('/posts/:id/comments', authMiddleware, async (req, res) => {
    const { content, parentComment } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.warn(`Invalid postId: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid post ID' });
        }
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        if (parentComment && !mongoose.Types.ObjectId.isValid(parentComment)) {
            console.warn(`Invalid parentComment: ${parentComment}`);
            return res.status(400).json({ error: 'Invalid parent comment ID' });
        }
        const comment = new Comment({
            content,
            author: req.user.userId,
            post: req.params.id,
            parentComment: parentComment || null,
        });
        await comment.save();
        if (!parentComment) {
            post.comments.push(comment._id);
            await post.save();
        } else {
            const parent = await Comment.findById(parentComment);
            if (!parent) {
                return res.status(404).json({ error: 'Parent comment not found' });
            }
        }
        const populatedComment = await Comment.findById(comment._id).populate('author', 'username');
        console.log(`Comment added by ${req.user.username} on post ${post.title}`);
        res.setHeader('Content-Type', 'application/json');
        res.status(201).json(populatedComment);
    } catch (err) {
        console.error('Add comment error:', err.message);
        res.status(500).json({ error: 'Server error: Failed to add comment' });
    }
});

apiRouter.get('/users/:username', async (req, res) => {
    console.log(`Received request for /api/users/${req.params.username}`);
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            console.log(`User not found: ${req.params.username}`);
            return res.status(404).json({ error: 'User not found' });
        }
        const posts = await Post.find({ author: user._id })
            .populate('author', 'username')
            .sort({ createdAt: -1 })
            .limit(50);
        const comments = await Comment.find({ author: user._id })
            .populate('post', 'title')
            .populate('author', 'username')
            .sort({ createdAt: -1 })
            .limit(50);
        const validPosts = posts.filter(post => post.author);
        const validComments = comments.filter(comment => comment.author && comment.post);
        console.log(`Fetched profile for ${req.params.username}: ${validPosts.length} posts, ${validComments.length} comments`);
        res.setHeader('Content-Type', 'application/json');
        res.json({
            user: { username: user.username, email: user.email, createdAt: user.createdAt }, // Added email
            posts: validPosts,
            comments: validComments
        });
    } catch (err) {
        console.error('Get user profile error:', err.message);
        res.status(500).setHeader('Content-Type', 'application/json').json({ error: `Server error: Failed to fetch user profile - ${err.message}` });
    }
});

// Mount API routes
app.use('/api', apiRouter);

// Static files (after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// Frontend Routes
app.get('/submit', (req, res) => {
    console.log('Serving /submit');
    res.sendFile(path.join(__dirname, 'public', 'submit.html'));
});

app.get('/login', (req, res) => {
    console.log('Serving /login');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    console.log('Serving /register');
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/profile/:username', (req, res) => {
    console.log(`Serving /profile/${req.params.username}`);
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/', (req, res) => {
    console.log('Serving /');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all route (must be last)
app.use((req, res) => {
    console.log(`Unmatched route: ${req.originalUrl}`);
    if (req.originalUrl.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});