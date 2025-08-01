import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgRJlAMQVnY5Zu7nkMPmdvS7lc5xMcJz4",
  authDomain: "pathpharmm.firebaseapp.com",
  projectId: "pathpharmm",
  storageBucket: "pathpharmm.appspot.com", // ✅ Corrected
  messagingSenderId: "836525944124",
  appId: "1:836525944124:web:9ab28aa79e9f12aeea8239"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(id, message) {
  document.getElementById(id).textContent = message;
}

window.submitForm = async function(event) {
  event.preventDefault(); // ✅ Prevent page refresh
  
  document.getElementById('errorName').textContent = '';
  document.getElementById('errorEmail').textContent = '';
  document.getElementById('errorPassword').textContent = '';
  
  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  let valid = true;
  
  if (!name) {
    showError('errorName', 'Please enter your name.');
    valid = false;
  }
  if (!validateEmail(email)) {
    showError('errorEmail', 'Invalid email format.');
    valid = false;
  }
  if (password.length < 6) {
    showError('errorPassword', 'At least 6 characters.');
    valid = false;
  }
  
  if (!valid) return;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    alert("🎉 Registration successful!");
    console.log("User:", userCredential.user);
    // ✅ Redirect to pharmacology.html
    window.location.href = "pharmacology.html";
  } catch (error) {
    alert("❌ Registration failed: " + error.message);
    console.error(error);
  }
};

window.togglePassword = function() {
  const pw = document.getElementById('password');
  const icon = document.querySelector('.toggle');
  if (pw.type === 'password') {
    pw.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    pw.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
};

window.handleGoogleRegister = function() {
  google.accounts.id.initialize({
    client_id: "YOUR_GOOGLE_CLIENT_ID_HERE", // Replace with your real client ID from Firebase Console
    callback: response => {
      console.log("Google token:", response.credential);
      alert("Google Sign-up successful!");
      // Optional: Redirect here if needed
      // window.location.href = "pharmacology.html";
    }
  });
  google.accounts.id.prompt();
};