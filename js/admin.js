import { supabase } from "./supabase.js";
import { requireUser, profile, nav, courseCard, esc } from "./common.js";
nav();
requireUser(async u=>{
 const p=await profile(u.id); if(!["admin","superadmin"].includes(p?.role)){location.href="dashboard.html";return;}
 logout.onclick=async()=>{await supabase.auth.signOut();location.href="index.html";};
 const {data:us}=await supabase.from("profiles").select("*");
 users.innerHTML=`<table><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Program</th></tr></thead><tbody>${(us||[]).map(d=>`<tr><td>${esc(d.username)}</td><td>${esc(d.email)}</td><td>${esc(d.role)}</td><td>${esc(d.program||"")}</td></tr>`).join("")}</tbody></table>`;
 const {data:cs}=await supabase.from("courses").select("*").order("created_at",{ascending:false});
 adminCourses.innerHTML=(cs||[]).map(d=>`<div>${courseCard(d.id,d)}<button class="danger small deleteCourse" data-id="${d.id}">Delete</button></div>`).join("")||"<p class='empty'>No courses.</p>";
 document.querySelectorAll(".deleteCourse").forEach(b=>b.onclick=async()=>{if(confirm("Delete this course?")){await supabase.from("courses").delete().eq("id",b.dataset.id);location.reload();}});
});
