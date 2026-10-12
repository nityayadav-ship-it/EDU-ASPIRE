
import { supabase } from "./supabase.js";
import { requireUser, profile, nav, courseCard, esc } from "./common.js";

const el = id => document.getElementById(id);

nav();

requireUser(async user => {
  const coursesBox = el("courses");
  const bookmarksBox = el("bookmarks");
  const learningBox = el("myLearning");

  el("logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "index.html";
  });

  try {
    const p = await profile(user.id);

    el("welcome").textContent =
      `Welcome, ${p?.username || user.email}`;

    el("roleText").textContent =
      `Role: ${p?.role || "student"} • ${p?.program || ""} ${p?.year || ""}`;

    // Load every available course.
    const { data: courses, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (courseError) throw courseError;

    const allCourses = courses || [];

    coursesBox.innerHTML = allCourses.map(c =>
      courseCard(c.id, c)
    ).join("") || "<p class='empty'>No courses available yet.</p>";

    el("availableCount").textContent = allCourses.length;

    // Load the student's bookmarks.
    const { data: bookmarks, error: bookmarkError } = await supabase
      .from("bookmarks")
      .select("course_id")
      .eq("user_id", user.id);

    if (bookmarkError) throw bookmarkError;

    const bookmarkIds = (bookmarks || []).map(b => b.course_id);
    el("bookmarkCount").textContent = bookmarkIds.length;

    const savedCourses = allCourses.filter(c =>
      bookmarkIds.includes(c.id)
    );

    bookmarksBox.innerHTML = savedCourses.map(c =>
      courseCard(c.id, c)
    ).join("") || "<p class='empty'>No bookmarks yet. Open a course and click Bookmark.</p>";

    // Load saved learning progress.
    const { data: progressRows, error: progressError } = await supabase
      .from("progress")
      .select("course_id, percent")
      .eq("user_id", user.id);

    if (progressError) throw progressError;

    const progress = progressRows || [];
    el("progressCount").textContent = progress.filter(p =>
      Number(p.percent) > 0 && Number(p.percent) < 100
    ).length;

    learningBox.innerHTML = progress.map(row => {
      const course = allCourses.find(c => c.id === row.course_id);
      if (!course) return "";

      const percent = Math.max(0, Math.min(100, Number(row.percent) || 0));

      return `
        <article class="card">
          <h3>${esc(course.title)}</h3>
          <p>${percent}% complete</p>
          <div class="progress">
            <progress value="${percent}" max="100" style="width:100%"></progress>
          </div>
          <a class="btn small" href="course.html?id=${encodeURIComponent(course.id)}">
            ${percent === 100 ? "Review Course" : "Continue Learning"}
          </a>
        </article>`;
    }).join("") || "<p class='empty'>Your learning progress will appear here after you save progress inside a course.</p>";

  } catch (error) {
    console.error("Dashboard error:", error);

    if (coursesBox) {
      coursesBox.textContent = "Could not load courses: " + error.message;
    }

    if (bookmarksBox) {
      bookmarksBox.textContent = "Could not load bookmarks.";
    }

    if (learningBox) {
      learningBox.textContent = "Could not load learning progress.";
    }
  }
});
