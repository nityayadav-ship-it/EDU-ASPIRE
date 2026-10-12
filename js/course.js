
import { supabase } from "./supabase.js";
import { nav, esc } from "./common.js";

await nav();

const root = document.getElementById("course");
const id = new URLSearchParams(location.search).get("id");

async function start() {
  if (!id) {
    root.innerHTML = "<p class='empty'>Course not specified.</p>";
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !course) {
    root.innerHTML = "<p class='empty'>Course not found. Check the database and course permissions.</p>";
    return;
  }

  root.innerHTML = `
    <article class="course-detail">
      <div class="thumb large">
        ${course.thumbnail_url
          ? `<img src="${esc(course.thumbnail_url)}" alt="">`
          : "📚"}
      </div>
      <span class="badge">${esc(course.program || "General")} • ${esc(course.year || "")}</span>
      <h1>${esc(course.title)}</h1>
      <p>${esc(course.description || "")}</p>

      <div id="courseActions"></div>
      <h2>Lessons / Chapters</h2>
      <div id="chapters"><p>Loading lessons...</p></div>
      <div id="studentFeatures"></div>
    </article>`;

  const { data: chapters, error: chapterError } = await supabase
    .from("chapters")
    .select("*")
    .eq("course_id", id)
    .order("position", { ascending: true });

  const chapterBox = document.getElementById("chapters");

  if (chapterError) {
    chapterBox.textContent = "Could not load lessons: " + chapterError.message;
  } else {
    chapterBox.innerHTML = (chapters || []).map((chapter, index) => `
      <div class="chapter">
        <b>${index + 1}. ${esc(chapter.title)}</b>
        <p>${esc(chapter.content || "")}</p>
        ${chapter.video_url
          ? `<p><a href="${esc(chapter.video_url)}" target="_blank" rel="noopener">Watch lesson video</a></p>`
          : ""}
      </div>`).join("") || "<p class='empty'>Lessons will be added soon.</p>";
  }

  const actions = document.getElementById("courseActions");
  const features = document.getElementById("studentFeatures");

  if (!session) {
    actions.innerHTML = `
      <p>Want to save this course and track your learning?</p>
      <div class="actions">
        <a class="btn" href="login.html">Login to Learn</a>
        <a class="btn secondary" href="register.html">Create Student Account</a>
      </div>`;
    return;
  }

  const user = session.user;

  actions.innerHTML = `
    <div class="actions">
      <button id="like" class="btn">♡ Like</button>
      <button id="bookmark" class="btn secondary">🔖 Bookmark</button>
    </div>
    <div class="progress">
      <label>Course Progress: <span id="pct">0%</span></label>
      <input id="progress" type="range" min="0" max="100" value="0">
      <button id="saveProgress" class="btn small">Save Progress</button>
      <p id="progressMsg" class="message"></p>
    </div>`;

  features.innerHTML = `
    <h2>Comments</h2>
    <form id="commentForm">
      <textarea id="comment" required placeholder="Write a comment..."></textarea>
      <button class="btn" type="submit">Post Comment</button>
    </form>
    <p id="commentMsg" class="message"></p>
    <div id="comments"></div>`;

  const likeButton = document.getElementById("like");
  const bookmarkButton = document.getElementById("bookmark");
  const progress = document.getElementById("progress");
  const pct = document.getElementById("pct");

  async function updateButtons() {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      supabase.from("likes").select("user_id")
        .eq("user_id", user.id).eq("course_id", id).maybeSingle(),
      supabase.from("bookmarks").select("user_id")
        .eq("user_id", user.id).eq("course_id", id).maybeSingle()
    ]);

    likeButton.textContent = like ? "♥ Liked" : "♡ Like";
    bookmarkButton.textContent = bookmark ? "🔖 Bookmarked" : "🔖 Bookmark";
  }

  likeButton.onclick = async () => {
    const { data: existing, error } = await supabase
      .from("likes").select("user_id")
      .eq("user_id", user.id).eq("course_id", id).maybeSingle();

    if (error) return alert(error.message);

    if (existing) {
      const result = await supabase.from("likes").delete()
        .eq("user_id", user.id).eq("course_id", id);
      if (result.error) return alert(result.error.message);
      await supabase.rpc("increment_like_count", {
        p_course_id: id, p_delta: -1
      });
    } else {
      const result = await supabase.from("likes")
        .insert({ user_id: user.id, course_id: id });
      if (result.error) return alert(result.error.message);
      await supabase.rpc("increment_like_count", {
        p_course_id: id, p_delta: 1
      });
    }
    await updateButtons();
  };

  bookmarkButton.onclick = async () => {
    const { data: existing, error } = await supabase
      .from("bookmarks").select("user_id")
      .eq("user_id", user.id).eq("course_id", id).maybeSingle();

    if (error) return alert(error.message);

    const result = existing
      ? await supabase.from("bookmarks").delete()
          .eq("user_id", user.id).eq("course_id", id)
      : await supabase.from("bookmarks")
          .insert({ user_id: user.id, course_id: id });

    if (result.error) return alert(result.error.message);
    await updateButtons();
  };

  const { data: savedProgress } = await supabase
    .from("progress").select("percent")
    .eq("user_id", user.id).eq("course_id", id).maybeSingle();

  progress.value = savedProgress?.percent ?? 0;
  pct.textContent = `${progress.value}%`;

  progress.oninput = () => {
    pct.textContent = `${progress.value}%`;
  };

  document.getElementById("saveProgress").onclick = async () => {
    const { error } = await supabase.from("progress").upsert({
      user_id: user.id,
      course_id: id,
      percent: Number(progress.value),
      updated_at: new Date().toISOString()
    });

    document.getElementById("progressMsg").textContent =
      error ? "Could not save: " + error.message : "Progress saved!";
  };

  async function loadComments() {
    const { data, error } = await supabase.from("comments")
      .select("*").eq("course_id", id).order("created_at");

    const box = document.getElementById("comments");
    if (error) {
      box.textContent = "Could not load comments: " + error.message;
      return;
    }

    box.innerHTML = (data || []).map(item => `
      <div class="comment">
        <b>${esc(item.username || "Student")}</b>
        <p>${esc(item.text)}</p>
      </div>`).join("") || "<p class='empty'>No comments yet.</p>";
  }

  document.getElementById("commentForm").onsubmit = async event => {
    event.preventDefault();
    const input = document.getElementById("comment");
    const message = document.getElementById("commentMsg");

    const { data: profile } = await supabase.from("profiles")
      .select("username").eq("id", user.id).maybeSingle();

    const { error } = await supabase.from("comments").insert({
      course_id: id,
      user_id: user.id,
      username: profile?.username || user.email,
      text: input.value.trim()
    });

    message.textContent = error ? error.message : "Comment posted!";
    if (!error) {
      input.value = "";
      await loadComments();
    }
  };

  await updateButtons();
  await loadComments();
}

start().catch(error => {
  console.error(error);
  root.innerHTML = `<p class="message">Something went wrong: ${esc(error.message)}</p>`;
});
