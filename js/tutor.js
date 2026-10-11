import { supabase } from "./supabase.js";
import { requireUser, profile, nav, courseCard } from "./common.js";
nav();
requireUser(async u=>{
 const p=await profile(u.id); if(!["tutor","admin","superadmin"].includes(p?.role)){location.href="dashboard.html";return;}
 logout.onclick=async()=>{await supabase.auth.signOut();location.href="index.html";};
 courseForm.onsubmit=async e=>{
   e.preventDefault();msg.textContent="Saving to cloud...";
   try{
     let url="";
     if(thumb.files[0]){
       const file=thumb.files[0];
       const path=`${u.id}/${Date.now()}-${file.name}`;
       const {error:upErr}=await supabase.storage.from("course-thumbnails").upload(path,file);
       if(upErr)throw upErr;
       const {data:pub}=supabase.storage.from("course-thumbnails").getPublicUrl(path);
       url=pub.publicUrl;
     }
     const {error}=await supabase.from("courses").insert({
       title:title.value,description:description.value,program:program.value,year:year.value,
       created_by:u.id,thumbnail_url:url,like_count:0
     });
     if(error)throw error;
     msg.textContent="Course saved in Supabase.";courseForm.reset();load();
   }catch(err){msg.textContent=err.message;}
 };
 async function load(){const {data}=await supabase.from("courses").select("*").eq("created_by",u.id);myCourses.innerHTML=(data||[]).map(c=>courseCard(c.id,c)).join("")||"<p class='empty'>No courses created yet.</p>";}
 load();
});
