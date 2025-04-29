let sortType = 'points';
let filterType = 'all';
let currentSection = 'new';
let currentUserId = null;

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function getUsername() {
    return localStorage.getItem('username');
}

function setUsername(username) {
    localStorage.setItem('username', username);
}

function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    currentUserId = null;
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${isError ? 'error' : ''}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function updateAuthLinks() {
    const token = getToken();
    const username = getUsername();
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const profileLink = document.getElementById('profile-link');
    const logoutLink = document.getElementById('logout-link');
    const footerLoginLink = document.getElementById('footer-login-link');
    const footerRegisterLink = document.getElementById('footer-register-link');
    const footerProfileLink = document.getElementById('footer-profile-link');
    const footerLogoutLink = document.getElementById('footer-logout-link');

    if (token && username) {
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';
        profileLink.style.display = 'inline';
        profileLink.textContent = username;
        profileLink.href = `/profile/${username}`;
        logoutLink.style.display = 'inline';
        footerLoginLink.style.display = 'none';
        footerRegisterLink.style.display = 'none';
        footerProfileLink.style.display = 'inline';
        footerProfileLink.textContent = username;
        footerProfileLink.href = `/profile/${username}`;
        footerLogoutLink.style.display = 'inline';
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.userId;
        } catch (err) {
            console.error('Error decoding token:', err);
            clearAuth();
            showToast('Session expired, please login again', true);
        }
    } else {
        loginLink.style.display = 'inline';
        registerLink.style.display = 'inline';
        profileLink.style.display = 'none';
        logoutLink.style.display = 'none';
        footerLoginLink.style.display = 'inline';
        footerRegisterLink.style.display = 'inline';
        footerProfileLink.style.display = 'none';
        footerLogoutLink.style.display = 'none';
    }
}

function updateSectionLinks() {
    const sections = ['new', 'past', 'comments', 'ask', 'show', 'job'];
    sections.forEach(section => {
        const link = document.getElementById(`section-${section}`);
        const footerLink = document.getElementById(`footer-section-${section}`);
        if (link) {
            link.classList.toggle('active', section === currentSection);
        }
        if (footerLink) {
            footerLink.classList.toggle('active', section === currentSection);
        }
    });
    const postControls = document.getElementById('post-controls');
    const postsSection = document.getElementById('posts-section');
    const commentsSection = document.getElementById('comments-section');
    if (currentSection === 'comments') {
        if (postControls) postControls.style.display = 'none';
        if (postsSection) postsSection.style.display = 'none';
        if (commentsSection) commentsSection.style.display = 'block';
    } else {
        if (postControls) postControls.style.display = 'flex';
        if (postsSection) postsSection.style.display = 'block';
        if (commentsSection) commentsSection.style.display = 'none';
    }
}

async function register() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!username || !email || !password) {
        showToast('All fields are required', true);
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Registration successful! Please login.');
            window.location.href = '/login';
        } else {
            showToast(data.error || 'Error registering', true);
        }
    } catch (err) {
        showToast('Server error', true);
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showToast('All fields are required', true);
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            setToken(data.token);
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            setUsername(payload.username);
            filterType = 'all';
            currentSection = 'new';
            showToast('Logged in successfully');
            window.location.href = '/';
        } else {
            showToast(data.error || 'Error logging in', true);
        }
    } catch (err) {
        showToast('Server error', true);
    }
}

function logout() {
    clearAuth();
    filterType = 'all';
    currentSection = 'new';
    showToast('Logged out successfully');
    window.location.href = '/';
}

async function fetchPosts() {
    try {
        let query = `section=${currentSection}&sort=${sortType}`;
        if (filterType === 'my' && currentUserId && /^[0-9a-fA-F]{24}$/.test(currentUserId)) {
            query += `&filter=my&userId=${encodeURIComponent(currentUserId)}`;
        }
        const response = await fetch(`/api/posts?${query}`);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch posts');
        }
        const posts = await response.json();
        renderPosts(posts);
    } catch (err) {
        console.error('Fetch posts error:', err.message);
        showToast(`Error fetching posts: ${err.message}`, true);
    }
}

async function fetchComments() {
    console.log('Fetching comments from /api/comments');
    try {
        const response = await fetch('/api/comments', {
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log('Response status:', response.status, 'Content-Type:', response.headers.get('content-type'));
        if (!response.ok) {
            const text = await response.text();
            console.error('Response text:', text.slice(0, 200));
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('Invalid JSON response');
            }
            throw new Error(data.error || `Failed to fetch comments (status ${response.status})`);
        }
        if (!response.headers.get('content-type')?.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.slice(0, 200));
            throw new Error('Invalid JSON response');
        }
        const comments = await response.json();
        console.log('Received comments:', comments.length, 'Sample:', comments[0]);
        renderComments(comments);
    } catch (err) {
        console.error('Fetch comments error:', err.message);
        showToast(`Error fetching comments: ${err.message}`, true);
    }
}

async function fetchPostDetails(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}`);
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            showToast(data.error || 'Error fetching post details', true);
            return null;
        }
    } catch (err) {
        showToast('Server error', true);
        return null;
    }
}

function renderPosts(posts) {
    const postList = document.getElementById('post-list');
    if (!postList) return;
    postList.innerHTML = posts.length ? '' : '<li class="no-items">No posts found.</li>';
    posts.forEach((post, index) => {
        const li = document.createElement('li');
        li.style.animationDelay = `${index * 0.1}s`;
        li.innerHTML = `
            <div class="post-points">${post.points} points</div>
            <div class="post-content">
                <a href="${post.url}" class="title" aria-label="Visit ${post.title}">${post.title}</a>
                <div class="post-meta">
                    by <a href="/profile/${post.author.username}" aria-label="View profile of ${post.author.username}">${post.author.username}</a> ${formatTime(post.createdAt)} | 
                    ${post.type !== 'link' ? `[${post.type}] ` : ''}<a href="#" onclick="showComments('${post._id}')" aria-label="View ${post.comments.length} comments">${post.comments.length} comments</a>
                    ${getToken() ? `<span class="upvote-btn" onclick="upvotePost('${post._id}')">▲ upvote</span>` : ''}
                    ${currentUserId === post.author._id ? `<span class="edit-btn" onclick="editPost('${post._id}', '${post.title.replace(/'/g, "\\'")}', '${post.url.replace(/'/g, "\\'")}', '${post.type}')">edit</span>` : ''}
                </div>
                <div class="comments" id="comments-${post._id}" style="display: none;">
                    <div id="comment-list-${post._id}"></div>
                    ${getToken() ? `
                    <div class="comment-form">
                        <textarea id="comment-input-${post._id}" rows="3" placeholder="Add a comment..." aria-label="Add a comment"></textarea>
                        <button onclick="addComment('${post._id}')">Comment</button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        postList.appendChild(li);
    });
}

function renderComments(comments) {
    const commentList = document.getElementById('comment-list');
    if (!commentList) return;
    commentList.innerHTML = comments.length ? '' : '<li class="no-items">No comments found.</li>';
    comments.forEach((comment, index) => {
        const li = document.createElement('li');
        li.className = 'comment-item';
        li.style.animationDelay = `${index * 0.1}s`;
        li.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">
                    <a href="/profile/${comment.author.username}" aria-label="View profile of ${comment.author.username}">${comment.author.username}</a>
                </span>
                <span class="comment-time">${formatTime(comment.createdAt)}</span>
            </div>
            <div class="comment-body">
                <p>${comment.content}</p>
            </div>
            <div class="comment-footer">
                <span class="comment-post">
                    on <a href="#" onclick="showComments('${comment.post._id}')" aria-label="View comments on ${comment.post.title}">${comment.post.title}</a>
                </span>
                ${getToken() ? `<a href="#" class="comment-reply" onclick="showReplyForm('${comment.post._id}', '${comment._id}')" aria-label="Reply to this comment">Reply</a>` : ''}
            </div>
            <div id="reply-form-${comment._id}" class="comment-form" style="display: none;">
                <textarea id="reply-input-${comment._id}" rows="3" placeholder="Add a reply..." aria-label="Add a reply"></textarea>
                <button onclick="addComment('${comment.post._id}', '${comment._id}')">Reply</button>
            </div>
        `;
        commentList.appendChild(li);
    });
}

async function showComments(postId) {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    const commentList = document.getElementById(`comment-list-${postId}`);
    if (commentsDiv.style.display === 'block') {
        commentsDiv.style.display = 'none';
        return;
    }
    const data = await fetchPostDetails(postId);
    if (data) {
        commentList.innerHTML = '';
        const renderComment = (comment, level = 0) => {
            const div = document.createElement('div');
            div.className = `comment ${level > 0 ? 'nested' : ''}`;
            div.innerHTML = `
                <div class="comment-meta">
                    by <a href="/profile/${comment.author.username}" aria-label="View profile of ${comment.author.username}">${comment.author.username}</a> ${formatTime(comment.createdAt)}
                    ${getToken() ? `<a href="#" onclick="showReplyForm('${postId}', '${comment._id}')" aria-label="Reply to this comment">reply</a>` : ''}
                </div>
                <div class="comment-content">${comment.content}</div>
                <div id="reply-form-${comment._id}" style="display: none;" class="comment-form">
                    <textarea id="reply-input-${comment._id}" rows="3" placeholder="Add a reply..." aria-label="Add a reply"></textarea>
                    <button onclick="addComment('${postId}', '${comment._id}')">Reply</button>
                </div>
            `;
            commentList.appendChild(div);
        };
        const commentsByParent = {};
        data.comments.forEach(comment => {
            const parentId = comment.parentComment ? comment.parentComment.toString() : 'root';
            if (!commentsByParent[parentId]) commentsByParent[parentId] = [];
            commentsByParent[parentId].push(comment);
        });
        const renderThread = (parentId, level = 0) => {
            if (commentsByParent[parentId]) {
                commentsByParent[parentId].forEach(comment => {
                    renderComment(comment, level);
                    renderThread(comment._id.toString(), level + 1);
                });
            }
        };
        renderThread('root');
        commentsDiv.style.display = 'block';
    }
}

function showReplyForm(postId, commentId) {
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    replyForm.style.display = replyForm.style.display === 'block' ? 'none' : 'block';
}

async function addComment(postId, parentComment = null) {
    const inputId = parentComment ? `reply-input-${parentComment}` : `comment-input-${postId}`;
    const content = document.getElementById(inputId).value;
    if (!content) {
        showToast('Comment cannot be empty', true);
        return;
    }
    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ content, parentComment }),
        });
        if (response.ok) {
            document.getElementById(inputId).value = '';
            showToast('Comment added');
            showComments(postId);
            if (currentSection === 'comments') {
                fetchComments();
            }
        } else {
            const data = await response.json();
            showToast(data.error || 'Error adding comment', true);
        }
    } catch (err) {
        showToast('Server error', true);
    }
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60));
    if (diff < 60) return `${diff} minute${diff !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
}

async function submitPost() {
    const token = getToken();
    if (!token) {
        showToast('Please login to submit a post', true);
        window.location.href = '/login';
        return;
    }
    const title = document.getElementById('title').value;
    const url = document.getElementById('url').value;
    const type = document.getElementById('type').value;

    if (!title || !url) {
        showToast('Title and URL are required', true);
        return;
    }

    try {
        const postId = document.getElementById('submit-btn').dataset.postId;
        const method = postId ? 'PUT' : 'POST';
        const urlPath = postId ? `/api/posts/${postId}` : '/api/posts';
        const response = await fetch(urlPath, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ title, url, type }),
        });
        if (response.ok) {
            showToast(postId ? 'Post updated' : 'Post submitted');
            window.location.href = `/?section=${type === 'link' ? 'new' : type}`;
        } else {
            const data = await response.json();
            showToast(data.error || 'Error submitting post', true);
        }
    } catch (err) {
        showToast('Server error', true);
    }
}

function editPost(postId, title, url, type) {
    window.location.href = '/submit';
    setTimeout(() => {
        document.getElementById('form-title').textContent = 'Edit Post';
        document.getElementById('title').value = title;
        document.getElementById('url').value = url;
        document.getElementById('type').value = type;
        document.getElementById('submit-btn').textContent = 'Update';
        document.getElementById('submit-btn').dataset.postId = postId;
    }, 100);
}

async function upvotePost(postId) {
    const token = getToken();
    if (!token) {
        showToast('Please login to upvote', true);
        window.location.href = '/login';
        return;
    }
    try {
        const response = await fetch(`/api/posts/${postId}/upvote`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (response.ok) {
            showToast('Upvoted');
            fetchPosts();
        } else {
            const data = await response.json();
            showToast(data.error || 'Error upvoting post', true);
        }
    } catch (err) {
        showToast('Server error', true);
    }
}

function sortPosts(type) {
    sortType = type;
    document.getElementById('sort-points').classList.toggle('active', type === 'points');
    document.getElementById('sort-date').classList.toggle('active', type === 'date');
    fetchPosts();
}

function filterPosts(type) {
    filterType = type;
    document.getElementById('filter-all').classList.toggle('active', type === 'all');
    document.getElementById('filter-my').classList.toggle('active', type === 'my');
    fetchPosts();
}

function setSection(section) {
    currentSection = section;
    updateSectionLinks();
    if (section === 'comments') {
        fetchComments();
    } else {
        fetchPosts();
    }
}

async function fetchUserProfile() {
    const username = window.location.pathname.split('/').pop();
    console.log(`Fetching profile for ${username}`);
    try {
        const response = await fetch(`/api/users/${username}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        console.log('Response status:', response.status, 'Content-Type:', response.headers.get('content-type'));
        if (!response.ok) {
            const text = await response.text();
            console.error('Response text:', text.slice(0, 200));
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('Invalid JSON response');
            }
            throw new Error(data.error || `Failed to fetch profile (status ${response.status})`);
        }
        if (!response.headers.get('content-type')?.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.slice(0, 200));
            throw new Error('Invalid JSON response');
        }
        const data = await response.json();
        console.log('Received profile data:', data);
        renderUserProfile(data);
    } catch (err) {
        console.error('Fetch profile error:', err.message);
        showToast(`Error fetching profile: ${err.message}`, true);
    }
}

function renderUserProfile(data) {
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');
    const joinedEl = document.getElementById('profile-joined');
    const postsCountEl = document.getElementById('profile-posts-count');
    const commentsCountEl = document.getElementById('profile-comments-count');
    const postsList = document.getElementById('user-posts');
    const commentsList = document.getElementById('user-comments');

    if (!usernameEl || !emailEl || !joinedEl || !postsCountEl || !commentsCountEl || !postsList || !commentsList) {
        console.error('Missing profile DOM elements');
        showToast('Profile page error: Missing elements', true);
        return;
    }

    usernameEl.textContent = data.user.username || 'Unknown';
    emailEl.textContent = data.user.email || 'Not provided';
    joinedEl.textContent = formatTime(data.user.createdAt) || 'Unknown';
    postsCountEl.textContent = data.posts?.length || 0;
    commentsCountEl.textContent = data.comments?.length || 0;

    postsList.innerHTML = data.posts?.length ? '' : '<li class="no-items">No posts found.</li>';
    data.posts?.forEach((post, index) => {
        const li = document.createElement('li');
        li.className = 'user-post-item';
        li.style.animationDelay = `${index * 0.1}s`;
        li.innerHTML = `
            <div class="post-content">
                <a href="${post.url}" class="title" aria-label="Visit ${post.title}">${post.title}</a>
                <div class="post-meta">
                    ${post.points} points | ${formatTime(post.createdAt)} | ${post.type}
                    ${currentUserId === post.author._id ? `<span class="edit-btn" onclick="editPost('${post._id}', '${post.title.replace(/'/g, "\\'")}', '${post.url.replace(/'/g, "\\'")}', '${post.type}')">edit</span>` : ''}
                </div>
            </div>
        `;
        postsList.appendChild(li);
    });

    commentsList.innerHTML = data.comments?.length ? '' : '<li class="no-items">No comments found.</li>';
    data.comments?.forEach((comment, index) => {
        const li = document.createElement('li');
        li.className = 'user-comment-item';
        li.style.animationDelay = `${index * 0.1}s`;
        li.innerHTML = `
            <div class="comment-meta">
                on <a href="#" onclick="showComments('${comment.post._id}')" aria-label="View comments on ${comment.post?.title || 'Deleted Post'}">${comment.post?.title || 'Deleted Post'}</a> | ${formatTime(comment.createdAt)}
            </div>
            <div class="comment-content">${comment.content}</div>
        `;
        commentsList.appendChild(li);
    });
}

// Initialize
function initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    currentSection = ['new', 'past', 'comments', 'ask', 'show', 'job'].includes(section) ? section : 'new';
    updateAuthLinks();
    updateSectionLinks();
    if (currentSection === 'comments') {
        fetchComments();
    } else if (document.getElementById('post-list')) {
        fetchPosts();
    } else if (document.getElementById('profile-username')) {
        fetchUserProfile();
    }
}

initialize();