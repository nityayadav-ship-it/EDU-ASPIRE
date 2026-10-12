
import { supabase } from "./supabase.js";
import { requireUser, profile, nav, courseCard, esc } from "./common.js";

const el = (id) => document.getElementById(id);

nav();

requireUser(async (user) => {
  const usersBox = el("users");
  const coursesBox = el("adminCourses");

  el("logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "index.html";
  });

  try {
    const currentProfile = await profile(user.id);

    if (!["admin", "superadmin"].includes(currentProfile?.role)) {
      location.href = "dashboard.html";
      return;
    }

    async function loadUsers() {
      usersBox.textContent = "Loading users...";

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, email, role, program, year")
        .order("created_at", { ascending: false });

      if (error) throw error;

      usersBox.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Program</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${(data || []).map((person) => {
              const nextRole = person.role === "tutor" ? "student" : "tutor";
              const canChange =
                person.id !== user.id &&
                ["student", "tutor"].includes(person.role);

              return `
                <tr>
                  <td>${esc(person.username)}</td>
                  <td>${esc(person.email)}</td>
                  <td>${esc(person.role)}</td>
                  <td>${esc(person.program || "")}</td>
                  <td>
                    ${canChange
                      ? `<button class="btn small role-btn"
                           data-id="${esc(person.id)}"
                           data-role="${nextRole}">
                           ${nextRole === "tutor" ? "Approve Tutor" : "Revoke Tutor"}
                         </button>`
                      : "—"}
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>`;

      usersBox.querySelectorAll(".role-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          const id = button.dataset.id;
          const role = button.dataset.role;

          if (!confirm(`Change this user's role to ${role}?`)) return;

          button.disabled = true;

          try {
            const { error } = await supabase
              .from("profiles")
              .update({ role })
              .eq("id", id);

            if (error) throw error;

            await loadUsers();
          } catch (error) {
            alert(`Role update failed: ${error.message}`);
            button.disabled = false;
          }
        });
      });
    }

    async function loadCourses() {
      coursesBox.textContent = "Loading courses...";

      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      coursesBox.innerHTML = (data || []).map((course) => `
        <div>
          ${courseCard(course.id, course)}
          <button class="danger small deleteCourse"
            data-id="${esc(course.id)}">Delete</button>
        </div>
      `).join("") || "<p class='empty'>No courses yet.</p>";

      coursesBox.querySelectorAll(".deleteCourse").forEach((button) => {
        button.addEventListener("click", async () => {
          if (!confirm("Delete this course and its associated content?")) return;

          button.disabled = true;

          try {
            const { error } = await supabase
              .from("courses")
              .delete()
              .eq("id", button.dataset.id);

            if (error) throw error;

            await loadCourses();
          } catch (error) {
            alert(`Course deletion failed: ${error.message}`);
            button.disabled = false;
          }
        });
      });
    }

    await Promise.all([loadUsers(), loadCourses()]);
  } catch (error) {
    console.error("Admin dashboard error:", error);

    usersBox.innerHTML =
      `<p class="message">Could not load admin data: ${esc(error.message)}</p>`;
  }
});
