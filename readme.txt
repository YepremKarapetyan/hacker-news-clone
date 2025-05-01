Hacker News Clone
A modern, full-stack web application inspired by Hacker News, built with Node.js, Express, MongoDB, and a luxurious front-end interface. This project allows users to register, log in, submit posts, upvote content, comment, and view user profiles, all within an elegant and responsive UI.
Features

User Authentication: Secure registration and login with JWT-based authentication and password hashing using bcrypt.
Post Management: Create, edit, and upvote posts categorized as Link, Ask, Show, or Job.
Comment System: Add threaded comments to posts with support for replies.
User Profiles: View user details, their posts, and comments.
Sorting and Filtering: Sort posts by points or date, and filter by all posts or user-specific posts.
Luxury UI: A premium, responsive design with glassmorphism effects, elegant typography, and smooth animations.
Homepage Navigation: Click the "Hacker News Clone" title to return to the homepage.
Responsive Design: Optimized for desktop, tablet, and mobile devices.

Technologies Used

Backend:

Node.js
Express.js
MongoDB with Mongoose
JWT for authentication
Bcrypt for password hashing
CORS for cross-origin requests


Frontend:

HTML5, CSS3, JavaScript (vanilla)
Custom CSS with a luxury aesthetic (using Cinzel and Lora fonts)
Responsive design with media queries


Dependencies:

express
mongoose
bcryptjs
jsonwebtoken
cors
path



Prerequisites

Node.js (v14 or higher)
MongoDB (local or cloud instance)
npm (Node Package Manager)

Installation

Clone the Repository:
git clone https://github.com/YepremKarapetyan/hacker-news-clone.git
cd hacker-news-clone


Install Dependencies:
npm install


Set Up Environment Variables: Create a .env file in the root directory and add the following:
PORT=3000
JWT_SECRET='secretkey_kackerNews'

Configure MongoDB: Ensure MongoDB is running locally on mongodb://localhost:27017/hackernews or update the connection string in server.js if using a cloud instance.

Start the Application:
npm start

The server will run on http://localhost:3000.


Usage

Access the Application: Open http://localhost:3000 in your browser.
Register/Login: Create an account or log in to access features like posting, commenting, and upvoting.
Submit Posts: Navigate to the "submit" page to create a new post.
Explore Sections: Use the navigation links (new, past, comments, ask, show, jobs) to browse content.
View Profiles: Click on a username to view a user's posts and comments.
Interact: Upvote posts, comment, or reply to existing comments (requires login).

Project Structure
hacker-news-clone/
├── public/
│   ├── index.html        # Homepage
│   ├── login.html        # Login page
│   ├── register.html     # Registration page
│   ├── submit.html       # Post submission page
│   ├── profile.html      # User profile page
│   ├── script.js         # Frontend JavaScript logic
│   ├── styles.css        # Luxury UI styles
├── server.js             # Backend server with Express and MongoDB
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation

API Endpoints

POST /api/register: Register a new user ({ username, email, password }).
POST /api/login: Log in and receive a JWT token ({ email, password }).
GET /api/posts: Fetch posts with optional query params (section, sort, filter, userId).
GET /api/comments: Fetch recent comments.
GET /api/posts/:id: Fetch a specific post and its comments.
POST /api/posts: Create a new post (requires authentication).
PUT /api/posts/:id: Edit a post (requires authentication and ownership).
PUT /api/posts/:id/upvote: Upvote a post (requires authentication).
POST /api/posts/:id/comments: Add a comment to a post (requires authentication).
GET /api/users/:username: Fetch a user's profile, posts, and comments.

Contributing
Contributions are welcome! To contribute:

Fork the repository.
Create a new branch (git checkout -b feature/your-feature).
Make your changes and commit (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a pull request.

Please ensure your code follows the project's coding style and includes appropriate tests.
License
This project is licensed under the MIT License. See the LICENSE file for details.
Acknowledgments

Created by Yeprem Karapetyan.
Inspired by Hacker News.
Built with love for the developer community.

Contact
For questions or feedback, reach out to eprem96@gmail.com or open an issue on GitHub.