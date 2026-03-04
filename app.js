/**
 * app.js - LMS Frontend Data Layer & Authentication Module
 * 
 * PURPOSE:
 *   Manages all Library Management System (LMS) operations using browser localStorage.
 *   Completely client-side implementation - no backend/database required.
 *   Perfect for static hosting (Vercel, GitHub Pages, etc.)
 * 
 * ARCHITECTURE:
 *   - IIFE (Immediately Invoked Function Expression) pattern for encapsulation
 *   - All data persisted in localStorage as JSON strings
 *   - Public API exposed via return object
 *   - Private helper functions for internal use only
 * 
 * STORAGE STRUCTURE:
 *   localStorage Keys:
 *   - lms_users           : Array<UserObject> - All registered members
 *   - lms_books           : Array<BookRecord> - All book issue/return records
 *   - lms_session         : String - Current logged-in user's ID
 *   - lms_admin           : Object - Currently logged-in admin data
 *   - lms_admin_accounts  : Array<AdminObject> - Admin credentials
 * 
 * DATA MODELS:
 *   UserObject = { id, name, email, password, mobile, address, createdAt }
 *   BookRecord = { id, memberId, memberName, bookName, bookAuthor, bookNo, issueDate, dueDate, status, returnDate }
 *   AdminObject = { id, name, email, password }
 */

var lms = (function () {

  // ========== PRIVATE HELPER FUNCTIONS ==========
  
  /**
   * Generates a unique ID using timestamp and random number
   * Format: {timestamp_base36}{random_base36} = unique short string
   * @returns {String} Unique identifier
   */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Retrieves all users from localStorage
   * Returns empty array if no users exist yet
   * @returns {Array<Object>} Array of user objects
   */
  function getUsers() { 
    return JSON.parse(localStorage.getItem('lms_users') || '[]'); 
  }

  /**
   * Retrieves all book records from localStorage
   * @returns {Array<Object>} Array of book records
   */
  function getBooks() { 
    return JSON.parse(localStorage.getItem('lms_books') || '[]'); 
  }

  /**
   * Saves users array to localStorage (overwrites existing)
   * @param {Array} u - Users array to persist
   */
  function saveUsers(u) { 
    localStorage.setItem('lms_users', JSON.stringify(u)); 
  }

  /**
   * Saves books array to localStorage (overwrites existing)
   * @param {Array} b - Books array to persist
   */
  function saveBooks(b) { 
    localStorage.setItem('lms_books', JSON.stringify(b)); 
  }

  /**
   * Initializes default admin account on first app load
   * Only runs once - checks if admin accounts already exist
   * Default credentials: admin@lms.com / admin123
   * SECURITY NOTE: In production, use secure auth backend!
   */
  (function seedAdmin() {
    if (!localStorage.getItem('lms_admin_accounts')) {
      localStorage.setItem('lms_admin_accounts', JSON.stringify([
        { 
          id: 'admin_1', 
          name: 'Library Admin', 
          email: 'admin@lms.com', 
          password: 'admin123' 
        }
      ]));
    }
  })();

  // ========== USER AUTHENTICATION & REGISTRATION ==========

  /**
   * Registers a new user (member) in the system
   * Validates email uniqueness before creating account
   * @param {Object} data - User registration data
   *   - data.name {String} - Full name
   *   - data.email {String} - Email (must be unique)
   *   - data.password {String} - Password
   *   - data.mobile {String} - Phone number
   *   - data.address {String} - Physical address
   * @returns {Object} {success: Boolean, message: String}
   */
  function register(data) {
    var users = getUsers();
    
    // Check if email already exists
    var exists = users.filter(function(u) { 
      return u.email === data.email; 
    }).length > 0;
    
    if (exists) {
      return { 
        success: false, 
        message: 'An account with that email already exists.' 
      };
    }
    
    // Create new user object with metadata
    var user = {
      id:        uid(),
      name:      data.name,
      email:     data.email,
      password:  data.password, // SECURITY: Should be hashed on production!
      mobile:    data.mobile,
      address:   data.address,
      createdAt: new Date().toISOString().split('T')[0] // Date in YYYY-MM-DD format
    };
    
    users.push(user);
    saveUsers(users);
    
    return { success: true };
  }

  /**
   * Authenticates user login credentials
   * Sets session ID in localStorage if credentials are valid
   * @param {String} email - User email
   * @param {String} password - User password (plain text in demo)
   * @returns {Object} {success: Boolean, message: String}
   */
  function login(email, password) {
    var users = getUsers();
    var found = null;
    
    // Search for user by email
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email) { 
        found = users[i]; 
        break; 
      }
    }
    
    // Email not found
    if (!found) return { 
      success: false, 
      message: 'No account found with that email.' 
    };
    
    // Password mismatch
    if (found.password !== password) return { 
      success: false, 
      message: 'Incorrect password.' 
    };
    
    // Valid credentials - create session
    localStorage.setItem('lms_session', found.id);
    return { success: true };
  }

  /**
   * Logs out current user by removing session ID
   */
  function logout() { 
    localStorage.removeItem('lms_session'); 
  }

  /**
   * Retrieves the currently logged-in user object
   * @returns {Object|null} User object if logged in, null if not
   */
  function getCurrentUser() {
    var id = localStorage.getItem('lms_session');
    
    // No session - not logged in
    if (!id) return null;
    
    var users = getUsers();
    
    // Find and return user by session ID
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === id) return users[i];
    }
    
    return null;
  }

  /**
   * Updates current user's profile information
   * Only updates name, mobile, address (not password - use changePassword instead)
   * @param {Object} data - Updated user data
   * @returns {Object} {success: Boolean, message: String}
   */
  function updateProfile(data) {
    var user = getCurrentUser();
    
    // User not logged in
    if (!user) return { 
      success: false, 
      message: 'Not logged in.' 
    };
    
    var users = getUsers();
    
    // Find and update user record
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === user.id) {
        users[i].name    = data.name;
        users[i].mobile  = data.mobile;
        users[i].address = data.address;
        break;
      }
    }
    
    saveUsers(users);
    return { 
      success: true, 
      message: 'Profile updated successfully.' 
    };
  }

  /**
   * Changes password for currently logged-in user
   * Validates old password before allowing update
   * @param {String} oldPw - Current password
   * @param {String} newPw - New password to set
   * @returns {Object} {success: Boolean, message: String}
   */
  function changePassword(oldPw, newPw) {
    var user = getCurrentUser();
    
    // User not logged in
    if (!user) return { 
      success: false, 
      message: 'Not logged in.' 
    };
    
    var users = getUsers();
    
    // Find user and verify old password
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === user.id) {
        if (users[i].password !== oldPw) return { 
          success: false, 
          message: 'Current password is incorrect.' 
        };
        
        // Update to new password
        users[i].password = newPw;
        saveUsers(users);
        
        return { 
          success: true, 
          message: 'Password updated successfully.' 
        };
      }
    }
    
    return { 
      success: false, 
      message: 'User not found.' 
    };
  }

  /**
   * Retrieves all registered users (admin only)
   * @returns {Array<Object>} All user objects
   */
  function getAllUsers() { 
    return getUsers(); 
  }

  /**
   * Removes a user from the system by ID (admin only)
   * @param {String} id - User ID to remove
   */
  function removeUser(id) { 
    saveUsers(getUsers().filter(function(u) { 
      return u.id !== id; 
    })); 
  }

  // ========== ADMIN AUTHENTICATION ==========

  /**
   * Authenticates admin login credentials
   * Sets admin session in localStorage if valid
   * @param {String} email - Admin email
   * @param {String} password - Admin password
   * @returns {Object} {success: Boolean, message: String}
   */
  function adminLogin(email, password) {
    var admins = JSON.parse(localStorage.getItem('lms_admin_accounts') || '[]');
    var found  = null;
    
    // Search for admin by email
    for (var i = 0; i < admins.length; i++) {
      if (admins[i].email === email) { 
        found = admins[i]; 
        break; 
      }
    }
    
    // Email not found
    if (!found) return { 
      success: false, 
      message: 'No admin account with that email.' 
    };
    
    // Password mismatch
    if (found.password !== password) return { 
      success: false, 
      message: 'Incorrect password.' 
    };
    
    // Valid credentials - create admin session (store only non-sensitive data)
    localStorage.setItem('lms_admin', JSON.stringify({ 
      id: found.id, 
      name: found.name, 
      email: found.email 
    }));
    
    return { success: true };
  }

  /**
   * Logs out current admin by removing admin session
   */
  function adminLogout() { 
    localStorage.removeItem('lms_admin'); 
  }

  /**
   * Retrieves currently logged-in admin object
   * @returns {Object|null} Admin object if logged in, null if not
   */
  function getCurrentAdmin() {
    var a = localStorage.getItem('lms_admin');
    return a ? JSON.parse(a) : null;
  }

  // ========== BOOK MANAGEMENT ==========

  /**
   * Issues a book to a member
   * Validates member exists and creates book record with issue/due dates
   * @param {Object} data - Book issue data
   *   - data.memberEmail {String} - Email of member receiving book
   *   - data.bookName {String} - Title of book
   *   - data.bookAuthor {String} - Author name
   *   - data.bookNo {String} - Library book number/code
   *   - data.dueDate {String} - When book should be returned (YYYY-MM-DD)
   * @returns {Object} {success: Boolean, message: String}
   */
  function issueBook(data) {
    var users  = getUsers();
    var member = null;
    
    // Find member by email
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === data.memberEmail) { 
        member = users[i]; 
        break; 
      }
    }
    
    // Member not found
    if (!member) return { 
      success: false, 
      message: 'No member found with that email address.' 
    };

    var books = getBooks();
    
    // Create book issue record
    var book  = {
      id:         uid(),
      memberId:   member.id,
      memberName: member.name,
      bookName:   data.bookName,
      bookAuthor: data.bookAuthor,
      bookNo:     data.bookNo,
      issueDate:  new Date().toISOString().split('T')[0], // Today's date
      dueDate:    data.dueDate,                            // Return due date
      status:     'issued',                                // Current status
      returnDate: null                                     // Will be set when returned
    };
    
    books.push(book);
    saveBooks(books);
    
    return { 
      success: true, 
      message: 'Book issued to ' + member.name + ' successfully.' 
    };
  }

  /**
   * Marks a book as returned and records return date
   * Updates book record status and sets actual return date
   * @param {String} bookId - ID of book record to mark as returned
   * @returns {Object} {success: Boolean, message: String}
   */
  function returnBook(bookId) {
    var books = getBooks();
    
    // Find book record by ID
    for (var i = 0; i < books.length; i++) {
      if (books[i].id === bookId) {
        books[i].status     = 'returned';                          // Update status
        books[i].returnDate = new Date().toISOString().split('T')[0]; // Today's date
        saveBooks(books);
        
        return { success: true };
      }
    }
    
    return { 
      success: false, 
      message: 'Book record not found.' 
    };
  }

  /**
   * Retrieves all books issued to a specific user
   * @param {String} userId - User ID to fetch books for
   * @returns {Array<Object>} Array of book records for that user
   */
  function getUserBooks(userId) {
    return getBooks().filter(function(b) { 
      return b.memberId === userId; 
    });
  }

  /**
   * Retrieves all book records in the system (admin only)
   * @returns {Array<Object>} All book issue/return records
   */
  function getAllBooks() { 
    return getBooks(); 
  }

  // ========== PUBLIC API - EXPOSED FUNCTIONS ==========
  return {
    // User functions
    register:       register,
    login:          login,
    logout:         logout,
    getCurrentUser: getCurrentUser,
    updateProfile:  updateProfile,
    changePassword: changePassword,
    getAllUsers:    getAllUsers,
    removeUser:     removeUser,
    
    // Admin functions
    adminLogin:     adminLogin,
    adminLogout:    adminLogout,
    getCurrentAdmin:getCurrentAdmin,
    
    // Book functions
    issueBook:      issueBook,
    returnBook:     returnBook,
    getUserBooks:   getUserBooks,
    getAllBooks:    getAllBooks
  };

})();

// ========== PAGE GUARDS (ACCESS CONTROL) ==========

/**
 * Checks if user is logged in before allowing page access
 * Redirects to home if not authenticated
 * Usage: Call at top of member-only pages
 */
function requireLogin() {
  if (!lms.getCurrentUser()) { 
    window.location.href = 'index.html'; 
  }
}

/**
 * Checks if admin is logged in before allowing page access
 * Redirects to admin login if not authenticated
 * Usage: Call at top of admin-only pages
 */
function requireAdmin() {
  if (!lms.getCurrentAdmin()) { 
    window.location.href = 'admin-login.html'; 
  }
}

// ========== UI HELPER FUNCTIONS ==========

/**
 * Displays a message notification to user (success or error)
 * Auto-hides success messages after 4 seconds
 * @param {String} id - HTML element ID to display message in
 * @param {String} text - Message text to display
 * @param {String} type - Type of message: 'success' or 'error'
 */
function showMsg(id, text, type) {
  var el = document.getElementById(id);
  
  if (!el) return; // Element doesn't exist
  
  el.textContent = text;
  el.className   = 'msg-box ' + (type === 'error' ? 'msg-error' : 'msg-success');
  el.style.display = 'block';
  
  // Auto-hide success messages after 4 seconds
  if (type === 'success') {
    setTimeout(function() { 
      el.style.display = 'none'; 
    }, 4000);
  }
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Converts special characters to HTML entities
 * @param {String} str - String to escape
 * @returns {String} Escaped HTML string
 */
function escHtml(str) {
  if (!str) return '';
  
  return String(str)
    .replace(/&/g, '&amp;')   // & -> &amp;
    .replace(/</g, '&lt;')    // < -> &lt;
    .replace(/>/g, '&gt;')    // > -> &gt;
    .replace(/"/g, '&quot;'); // " -> &quot;
}
