import { supabase } from "./supabase.js";

const msg = document.getElementById("msg");
const login = document.getElementById("loginForm");
const register = document.getElementById("registerForm");

login?.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "Signing in...";

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value
  });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  location.href = "dashboard.html";
});

register?.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "Creating account...";

  const { data, error } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value,
    options: {
  data: {
    username: document.getElementById("username").value.trim(),
    program: document.getElementById("program").value.trim(),
    year: document.getElementById("year").value.trim(),
    role: document.getElementById("role").value
  }
}
  });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  if (!data.session) {
    msg.textContent = "Account created. Check your email to confirm it, then log in.";
    register.reset();
    return;
  }

  location.href = "dashboard.html";
});
