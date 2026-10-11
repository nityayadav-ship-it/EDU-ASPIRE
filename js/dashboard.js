import { supabase } from "./supabase.js";
import { requireUser, profile, nav, courseCard } from "./common.js";
nav();
requireUser(async u=>{
  document.getElementById("logout").onclick=async()=>{await supabase.auth.signOut();location.href="index.html";};
  const p=await profile(u.id);
  document.getElementById("welcome").textContent=`Welcome, ${p?.username||u.email}`;
  document.getElementById("roleText").textContent=`Role: ${p?.role||"student"} • ${p?.program||""} ${p?.year||""}`;
  const cbox=document.getElementById("courses");
  const {data:courses}=await supabase.from("courses").select("*").order("created_at",{ascending:false});
  const arr=(courses||[]).filter(c=>!p?.program||!c.program||c.program===p.program).map(c=>courseCard(c.id,c));
  cbox.innerHTML=arr.join("")||"<p class='empty'>No matching courses.</p>";
  const {data:bms}=await supabase.from("bookmarks").select("course_id").eq("user_id",u.id);
  const bb=document.getElementById("bookmarks");
  if(!bms||bms.length===0){bb.innerHTML="<p class='empty'>No bookmarks yet.</p>";return;}
  const cards=[];
  for(const b of bms){const {data:c}=await supabase.from("courses").select("*").eq("id",b.course_id).single();if(c)cards.push(courseCard(c.id,c));}
  bb.innerHTML=cards.join("")||"<p class='empty'>No bookmarks yet.</p>";
});
