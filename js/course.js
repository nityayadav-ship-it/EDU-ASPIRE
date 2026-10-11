import { supabase } from "./supabase.js";
import { requireUser, nav, esc } from "./common.js";
nav();
const id=new URLSearchParams(location.search).get("id");
requireUser(async u=>{
 const root=document.getElementById("course");
 if(!id){root.innerHTML="<p class='empty'>Course not specified.</p>";return;}
 const {data:c,error}=await supabase.from("courses").select("*").eq("id",id).single();
 if(error||!c){root.innerHTML="<p class='empty'>Course not found.</p>";return;}
 const {data:like}=await supabase.from("likes").select("user_id").eq("user_id",u.id).eq("course_id",id).maybeSingle();
 const {data:bm}=await supabase.from("bookmarks").select("user_id").eq("user_id",u.id).eq("course_id",id).maybeSingle();
 root.innerHTML=`<article class="course-detail"><div class="thumb large">${c.thumbnail_url?`<img src="${c.thumbnail_url}" alt="">`:"📚"}</div><span class="badge">${esc(c.program||"General")} • ${esc(c.year||"")}</span><h1>${esc(c.title)}</h1><p>${esc(c.description||"")}</p>
 <div class="actions"><button id="like" class="btn">${like?"♥ Liked":"♡ Like"}</button><button id="bookmark" class="btn secondary">${bm?"🔖 Bookmarked":"🔖 Bookmark"}</button></div>
 <div class="progress"><label>Course Progress <span id="pct">0%</span></label><input id="progress" type="range" min="0" max="100" value="0"></div>
 <h2>Chapters</h2><div id="chapters"></div><h2>Comments</h2><form id="commentForm"><textarea id="comment" required placeholder="Write a comment..."></textarea><button class="btn">Post Comment</button></form><div id="comments"></div></article>`;
 document.getElementById("like").onclick=async()=>{
   const {data:existing}=await supabase.from("likes").select("user_id").eq("user_id",u.id).eq("course_id",id).maybeSingle();
   if(existing){await supabase.from("likes").delete().eq("user_id",u.id).eq("course_id",id);await supabase.rpc("increment_like_count",{p_course_id:id,p_delta:-1});}
   else{await supabase.from("likes").insert({user_id:u.id,course_id:id});await supabase.rpc("increment_like_count",{p_course_id:id,p_delta:1});}
   location.reload();
 };
 document.getElementById("bookmark").onclick=async()=>{
   const {data:existing}=await supabase.from("bookmarks").select("user_id").eq("user_id",u.id).eq("course_id",id).maybeSingle();
   if(existing)await supabase.from("bookmarks").delete().eq("user_id",u.id).eq("course_id",id);
   else await supabase.from("bookmarks").insert({user_id:u.id,course_id:id});
   location.reload();
 };
 const {data:prog}=await supabase.from("progress").select("percent").eq("user_id",u.id).eq("course_id",id).maybeSingle();
 if(prog){progress.value=prog.percent||0;pct.textContent=`${progress.value}%`;}
 progress.oninput=()=>pct.textContent=`${progress.value}%`;
 progress.onchange=()=>supabase.from("progress").upsert({user_id:u.id,course_id:id,percent:Number(progress.value)});
 const {data:ch}=await supabase.from("chapters").select("*").eq("course_id",id).order("position",{ascending:true});
 chapters.innerHTML=(ch||[]).map((d,i)=>`<div class="chapter"><b>${i+1}. ${esc(d.title)}</b><p>${esc(d.content)}</p>${d.video_url?`<a href="${esc(d.video_url)}" target="_blank">Watch video</a>`:""}</div>`).join("")||"<p class='empty'>No chapters added yet.</p>";
 async function loadComments(){const {data:cs}=await supabase.from("comments").select("*").eq("course_id",id).order("created_at",{ascending:true});comments.innerHTML=(cs||[]).map(d=>`<div class="comment"><b>${esc(d.username||"Student")}</b><p>${esc(d.text)}</p></div>`).join("")||"<p class='empty'>No comments yet.</p>";}
 commentForm.onsubmit=async e=>{e.preventDefault();await supabase.from("comments").insert({course_id:id,user_id:u.id,username:u.email,text:comment.value});comment.value="";loadComments();};
 loadComments();
});
