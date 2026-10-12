
import { supabase } from "./supabase.js";
import { requireUser, profile, nav, courseCard } from "./common.js";

const el = (id) => document.getElementById(id);
nav();

requireUser(async (user) => {
  const message = el("msg");
  const lessonMessage = el("chapterMsg");
  const form = el("courseForm");
  const lessonForm = el("chapterForm");
  const coursesBox = el("myCourses");
  const courseSelect = el("chapterCourse");

  try {
    const p = await profile(user.id);

    if (!["tutor", "admin", "superadmin"].includes(p?.role)) {
      message.textContent = "Tutor access is not enabled.";
      return;
    }

    el("logout")?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      location.href = "index.html";
    });

    async function loadCourses() {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const courses = data || [];

      coursesBox.innerHTML = courses
        .map(c => courseCard(c.id, c)).join("")
        || "<p class='empty'>No courses created by this tutor yet.</p>";

      const previous = courseSelect.value;
      courseSelect.innerHTML =
        '<option value="">Choose a course...</option>' +
        courses.map(c =>
          `<option value="${c.id}">${escapeHtml(c.title)}</option>`
        ).join("");

      if (courses.some(c => c.id === previous)) {
        courseSelect.value = previous;
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      message.textContent = "Saving course...";

      try {
        const { data, error } = await supabase
          .from("courses")
          .insert({
            title: el("title").value.trim(),
            program: el("program").value.trim(),
            year: el("year").value.trim(),
            description: el("description").value.trim(),
            created_by: user.id
          })
          .select("id")
          .single();

        if (error) throw error;

        message.textContent = "Course created successfully.";
        form.reset();
        await loadCourses();
        courseSelect.value = data.id;
      } catch (error) {
        message.textContent = "Could not create course: " + error.message;
      } finally {
        button.disabled = false;
      }
    });

    lessonForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = lessonForm.querySelector('[type="submit"]');
      button.disabled = true;
      lessonMessage.textContent = "Saving lesson...";

      try {
        const courseId = courseSelect.value;
        if (!courseId) throw new Error("Choose a course first.");

        const { data: previous, error: readError } = await supabase
          .from("chapters")
          .select("position")
          .eq("course_id", courseId)
          .order("position", { ascending: false })
          .limit(1);

        if (readError) throw readError;

        const position = previous?.length
          ? Number(previous[0].position) + 1
          : 1;

        const { error } = await supabase.from("chapters").insert({
          course_id: courseId,
          title: el("chapterTitle").value.trim(),
          content: el("chapterContent").value.trim(),
          video_url: el("chapterVideo").value.trim() || null,
          position
        });

        if (error) throw error;

        lessonMessage.textContent = "Lesson saved! Open the course as a student to verify it.";
        lessonForm.reset();
        courseSelect.value = courseId;
      } catch (error) {
        lessonMessage.textContent = "Could not save lesson: " + error.message;
      } finally {
        button.disabled = false;
      }
    });

    await loadCourses();
  } catch (error) {
    message.textContent = "Error: " + error.message;
    console.error(error);
  }
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[ch]);
}
