import { supabase } from "./supabase.js";

export function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

export async function nav(){
  const n=document.getElementById("nav"); if(!n)return;
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){n.innerHTML='<a href="login.html">Login</a><a href="register.html">Register</a>';return;}
  const {data:p}=await supabase.from("profiles").select("role").eq("id",session.user.id).single();
  const role=p?.role||"student";
  n.innerHTML=`<a href="dashboard.html">Dashboard</a>${role==="tutor"?'<a href="tutor.html">Tutor</a>':""}${role==="admin"||role==="superadmin"?'<a href="admin.html">Admin</a>':""}<button id="logoutNav" class="link-btn">Logout</button>`;
  document.getElementById("logoutNav").onclick=async()=>{await supabase.auth.signOut();location.href="index.html";};
}

export function requireUser(callback){
  supabase.auth.getSession().then(({data:{session}})=>{
    if(!session){location.href="login.html";return;}
    callback(session.user);
  });
}

export async function profile(uid){
  const {data}=await supabase.from("profiles").select("*").eq("id",uid).single();
  return data||null;
}

export function courseCard(id,c){return `<article class="card course-card"><div class="thumb">${c.thumbnail_url?`<img src="${c.thumbnail_url}" alt="">`:"📚"}</div><span class="badge">${esc(c.program||"General")} • ${esc(c.year||"All years")}</span><h3>${esc(c.title)}</h3><p>${esc(c.description||"")}</p><a class="btn small" href="course.html?id=${id}">Open</a></article>`;}
