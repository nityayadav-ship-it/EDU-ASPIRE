import { supabase } from "./supabase.js";

document.getElementById("year").textContent = new Date().getFullYear();
const nav = document.getElementById("nav");

async function updateNav(){
  const {data:{session}}=await supabase.auth.getSession();
  nav.innerHTML = session ? `<a href="dashboard.html">Dashboard</a><button id="navLogout" class="link-btn">Logout</button>` : `<a href="login.html">Login</a><a href="register.html">Register</a>`;
  document.getElementById("navLogout")?.addEventListener("click", async()=>{await supabase.auth.signOut(); location.href="index.html";});
}
updateNav();

async function loadCourses(){
  const box=document.getElementById("latestCourses");
  const {data,error}=await supabase.from("courses").select("*").order("created_at",{ascending:false}).limit(6);
  if(error||!data||data.length===0){box.innerHTML="<p class='empty'>No courses yet.</p>";return;}
  box.innerHTML=data.map(c=>card(c.id,c)).join("");
}
function card(id,c){return `<article class="card course-card"><div class="thumb">${c.thumbnail_url?`<img src="${c.thumbnail_url}" alt="">`:"📚"}</div><span class="badge">${c.program||"General"} • ${c.year||"All years"}</span><h3>${esc(c.title)}</h3><p>${esc(c.description||"")}</p><a class="btn small" href="course.html?id=${id}">View Course</a></article>`}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
loadCourses();
