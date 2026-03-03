/**
 * app.js - LMS Frontend Data Layer
 * All data stored in localStorage for Vercel/static hosting compatibility.
 * No PHP or SQL needed - everything runs client-side.
 *
 * Storage keys:
 *   lms_users          - array of user objects
 *   lms_books          - array of issued-book records
 *   lms_session        - current logged-in user id
 *   lms_admin          - current logged-in admin object
 *   lms_admin_accounts - admin credentials
 */

var lms = (function () {

  // --- Helpers ---

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getUsers()   { return JSON.parse(localStorage.getItem('lms_users')  || '[]'); }
  function getBooks()   { return JSON.parse(localStorage.getItem('lms_books')  || '[]'); }
  function saveUsers(u) { localStorage.setItem('lms_users',  JSON.stringify(u)); }
  function saveBooks(b) { localStorage.setItem('lms_books',  JSON.stringify(b)); }

  // Seed default admin account on first load
  (function seedAdmin() {
    if (!localStorage.getItem('lms_admin_accounts')) {
      localStorage.setItem('lms_admin_accounts', JSON.stringify([
        { id: 'admin_1', name: 'Library Admin', email: 'admin@lms.com', password: 'admin123' }
      ]));
    }
  })();

  // --- User Auth ---

  function register(data) {
    var users = getUsers();
    var exists = users.filter(function(u) { return u.email === data.email; }).length > 0;
    if (exists) {
      return { success: false, message: 'An account with that email already exists.' };
    }
    var user = {
      id:        uid(),
      name:      data.name,
      email:     data.email,
      password:  data.password,
      mobile:    data.mobile,
      address:   data.address,
      createdAt: new Date().toISOString().split('T')[0]
    };
    users.push(user);
    saveUsers(users);
    return { success: true };
  }

  function login(email, password) {
    var users = getUsers();
    var found = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email) { found = users[i]; break; }
    }
    if (!found) return { success: false, message: 'No account found with that email.' };
    if (found.password !== password) return { success: false, message: 'Incorrect password.' };
    localStorage.setItem('lms_session', found.id);
    return { success: true };
  }

  function logout() { localStorage.removeItem('lms_session'); }

  function getCurrentUser() {
    var id = localStorage.getItem('lms_session');
    if (!id) return null;
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === id) return users[i];
    }
    return null;
  }

  function updateProfile(data) {
    var user = getCurrentUser();
    if (!user) return { success: false, message: 'Not logged in.' };
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === user.id) {
        users[i].name    = data.name;
        users[i].mobile  = data.mobile;
        users[i].address = data.address;
        break;
      }
    }
    saveUsers(users);
    return { success: true, message: 'Profile updated successfully.' };
  }

  function changePassword(oldPw, newPw) {
    var user = getCurrentUser();
    if (!user) return { success: false, message: 'Not logged in.' };
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === user.id) {
        if (users[i].password !== oldPw) return { success: false, message: 'Current password is incorrect.' };
        users[i].password = newPw;
        saveUsers(users);
        return { success: true, message: 'Password updated successfully.' };
      }
    }
    return { success: false, message: 'User not found.' };
  }

  function getAllUsers()    { return getUsers(); }
  function removeUser(id)  { saveUsers(getUsers().filter(function(u) { return u.id !== id; })); }

  // --- Admin Auth ---

  function adminLogin(email, password) {
    var admins = JSON.parse(localStorage.getItem('lms_admin_accounts') || '[]');
    var found  = null;
    for (var i = 0; i < admins.length; i++) {
      if (admins[i].email === email) { found = admins[i]; break; }
    }
    if (!found) return { success: false, message: 'No admin account with that email.' };
    if (found.password !== password) return { success: false, message: 'Incorrect password.' };
    localStorage.setItem('lms_admin', JSON.stringify({ id: found.id, name: found.name, email: found.email }));
    return { success: true };
  }

  function adminLogout()      { localStorage.removeItem('lms_admin'); }
  function getCurrentAdmin()  {
    var a = localStorage.getItem('lms_admin');
    return a ? JSON.parse(a) : null;
  }

  // --- Books ---

  function issueBook(data) {
    var users  = getUsers();
    var member = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === data.memberEmail) { member = users[i]; break; }
    }
    if (!member) return { success: false, message: 'No member found with that email address.' };

    var books = getBooks();
    var book  = {
      id:         uid(),
      memberId:   member.id,
      memberName: member.name,
      bookName:   data.bookName,
      bookAuthor: data.bookAuthor,
      bookNo:     data.bookNo,
      issueDate:  new Date().toISOString().split('T')[0],
      dueDate:    data.dueDate,
      status:     'issued',
      returnDate: null
    };
    books.push(book);
    saveBooks(books);
    return { success: true, message: 'Book issued to ' + member.name + ' successfully.' };
  }

  function returnBook(bookId) {
    var books = getBooks();
    for (var i = 0; i < books.length; i++) {
      if (books[i].id === bookId) {
        books[i].status     = 'returned';
        books[i].returnDate = new Date().toISOString().split('T')[0];
        saveBooks(books);
        return { success: true };
      }
    }
    return { success: false, message: 'Book record not found.' };
  }

  function getUserBooks(userId) {
    return getBooks().filter(function(b) { return b.memberId === userId; });
  }

  function getAllBooks() { return getBooks(); }

  // --- Public API ---
  return {
    register:       register,
    login:          login,
    logout:         logout,
    getCurrentUser: getCurrentUser,
    updateProfile:  updateProfile,
    changePassword: changePassword,
    getAllUsers:     getAllUsers,
    removeUser:     removeUser,
    adminLogin:     adminLogin,
    adminLogout:    adminLogout,
    getCurrentAdmin:getCurrentAdmin,
    issueBook:      issueBook,
    returnBook:     returnBook,
    getUserBooks:   getUserBooks,
    getAllBooks:     getAllBooks
  };

})();

// --- Page Guards ---

function requireLogin() {
  if (!lms.getCurrentUser()) { window.location.href = 'index.html'; }
}

function requireAdmin() {
  if (!lms.getCurrentAdmin()) { window.location.href = 'admin-login.html'; }
}

// --- UI Helpers ---

function showMsg(id, text, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className   = 'msg-box ' + (type === 'error' ? 'msg-error' : 'msg-success');
  el.style.display = 'block';
  if (type === 'success') {
    setTimeout(function() { el.style.display = 'none'; }, 4000);
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
