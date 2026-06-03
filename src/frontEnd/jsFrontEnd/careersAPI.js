// const grid = document.getElementById("careersGrid");
// const buttons = document.querySelectorAll(".career-category");

// console.log(grid);

// // buttons.forEach(btn => {
// //   btn.addEventListener("click", () => {

// //     const category = btn.dataset.category;

// //     fetch(`http://localhost:3000/api/jobs?category=${category}`)
// //       .then(res => res.json())
// //       .then(data => {

// //         if (!data.success) return;

// //         grid.innerHTML = "";

// //         data.jobs.forEach(job => {

// //           const card = document.createElement("article");
// //           card.className = "career-card";

// //           card.innerHTML = `
// //             <div class="career-card__content">
// //               <h3>${job.title}</h3>
// //               <p>${job.company}</p>
// //               <p>${job.location}</p>
// //               <p>${job.salary}</p>
// //               <a href="${job.url}" target="_blank" class="btn btn--primary">Apply</a>
// //             </div>
// //           `;

// //           grid.appendChild(card);
// //         });

// //       });

// //   });
// // });
// buttons.forEach(btn => {
//   btn.addEventListener("click", () => {

//     console.log(grid);

//     const category = btn.dataset.category;

//     fetch(`http://localhost:3000/api/jobs?category=${category}`)
//       .then(res => res.json())
//       .then(data => {

//         console.log(data);

//         grid.innerHTML = "";

//         if (!data.jobs.length) {
//           grid.innerHTML = "<p>No jobs found</p>";
//           return;
//         }

//         data.jobs.forEach(job => {

//           const card = document.createElement("article");
//           card.className = "career-card";

//           card.innerHTML = `
//             <div class="career-card__image">
//               <img src="https://via.placeholder.com/400x220">
//             </div>
//             <div class="career-card__content">
//               <h3 class="career-card__title">${job.title}</h3>
//               <p>${job.company} • ${job.location}</p>
//               <p>${job.salary}</p>
//               <div class="career-card__footer">
//                 <a href="${job.url}" target="_blank" class="btn btn--primary btn--sm">Apply</a>
//               </div>
//             </div>
//           `;

//           grid.appendChild(card);
//         });

//       });

//   });
// });
// document.querySelectorAll(".view-jobs").forEach(btn => {
//   btn.addEventListener("click", () => {
//     const category = btn.dataset.category;

//     fetch(`http://localhost:3000/api/jobs?category=${category}`)
//       .then(res => res.json())
//       .then(data => {
//         console.log(data);
//       });
//   });
// });

// document.addEventListener("DOMContentLoaded", () => {

//     console.log("The button was clicked somehow or the js was loaded!!!");

//   const grid = document.getElementById("careersGrid");
//   const buttons = document.querySelectorAll("[data-category='technology']");

//   if (!grid) {
//     console.error("Grid not found!");
//     return;
//   }

//   buttons.forEach(button => {

//     button.addEventListener("click", async (e) => {

//         console.log(e);

//       const category = button.dataset.category;

//       console.log("Clicked category:", category);

//       try {
//         const res = await fetch(`/api/jobs?category=${category}`);
//         const data = await res.json();

//         console.log("API RESPONSE:", data);

//         const jobs = data.jobs || [];

//         grid.innerHTML = "";

//         jobs.forEach(job => {

//           const card = document.createElement("article");
//           card.className = "career-card";

//           card.innerHTML = `
//             <h3>${job.title || "No title"}</h3>
//             <p>${job.company || "Unknown"} • ${job.location || ""}</p>
//             <p>${job.salary || ""}</p>
//           `;

//           grid.appendChild(card);
//         });

//       } catch (err) {
//         console.error("Fetch failed:", err);
//       }

//     });

//   });

// });
document.addEventListener("DOMContentLoaded", async () => {
  // Check if the user has already taken the quiz when the page loads
  try {
    const token = getToken();
    const res = await fetch("/api/get-my-interests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.exists) {
      // User HAS taken the quiz -> Show Chat, Hide Quiz Prompt
      document.getElementById("quizStatusCard").style.display = "none";
      document.getElementById("chatSection").style.display = "flex";
    } else {
      // User has NOT taken the quiz -> Show Quiz Prompt, Hide Chat
      document.getElementById("quizStatusCard").style.display = "flex";
      document.getElementById("chatSection").style.display = "none";
    }
  } catch (err) {
    console.error("Error checking quiz status:", err);
  }
});

// 1. Open the Modal and generate the questions
window.showQuiz = function () {
  const overlay = document.getElementById("quizOverlay");
  const form = document.getElementById("riasecForm");

  // Only inject questions if the form is empty
  if (form.innerHTML.trim() === "") {
    const questions = [
      {
        id: "Realistic",
        text: "I like working with tools, machines, or animals.",
      },
      {
        id: "Investigative",
        text: "I enjoy solving math or science problems.",
      },
      {
        id: "Artistic",
        text: "I like expressing myself through art, music, or writing.",
      },
      { id: "Social", text: "I like teaching, helping, or nursing others." },
      {
        id: "Enterprising",
        text: "I enjoy starting projects and leading people.",
      },
      {
        id: "Conventional",
        text: "I like organizing files, records, or data.",
      },
    ];

    let html = "";
    questions.forEach((q, index) => {
      html += `
            <div style="margin-bottom: 16px;">
                <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #374151;">
                    ${index + 1}. ${q.text}
                </label>
                <select name="${q.id}" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; outline: none; background: #fff; color: #000;" required>
                    <option value="" disabled selected>Rate 1-5...</option>
                    <option value="1">1 - Strongly Dislike</option>
                    <option value="2">2 - Dislike</option>
                    <option value="3">3 - Neutral</option>
                    <option value="4">4 - Like</option>
                    <option value="5">5 - Strongly Like</option>
                </select>
            </div>`;
    });
    form.innerHTML = html;
  }

  // BULLETPROOF WAY TO SHOW MODAL
  overlay.style.display = "flex";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.zIndex = "9999";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";


  overlay.classList.add("modal-overlay--active");
};

// 2. (update the X button in HTML)
window.closeQuiz = function () {
  const overlay = document.getElementById("quizOverlay");
  overlay.style.display = "none";
  overlay.classList.remove("modal-overlay--active");
};

// 3. Save the Quiz Results to the Database
window.saveQuizResults = async function () {
  const form = document.getElementById("riasecForm");

  // Check if all questions are answered
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Gather the scores
  const formData = new FormData(form);
  const scores = {};
  formData.forEach((value, key) => {
    scores[key] = parseInt(value);
  });

  try {
    const token = getToken();
    const res = await fetch("/api/save-interests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(scores),
    });

    if (res.ok) {
      // Close the modal
      closeQuiz();

      // Switch the UI to show the chat
      document.getElementById("quizStatusCard").style.display = "none";
      document.getElementById("chatSection").style.display = "flex";

      alert(
        "Quiz saved successfully! You can now chat with your AI Career Guide.",
      );
    } else {
      alert("Failed to save quiz results. Please try again.");
    }
  } catch (err) {
    console.error("Error saving quiz:", err);
  }


};

// Safe globally exposed helpers
const isTokenExpired = window.isTokenExpired || function(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
};

const getToken = window.getToken || function() {
  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) {
    logout();
    return null;
  }
  return token;
};

const logout = window.logout || function() {
  const token = localStorage.getItem('token');
  localStorage.removeItem('token');
  localStorage.removeItem('accountType');
  localStorage.removeItem('userName');
  localStorage.removeItem('initials');
  localStorage.removeItem('profilePicUrl');
  localStorage.removeItem('profileComplete');
  localStorage.removeItem("latestScannedMarks");
  localStorage.removeItem("latestScannedSchool");
  localStorage.removeItem("orgName");
  localStorage.removeItem("orgInitials");
  localStorage.removeItem("orgProfilePic");
  window.__currentUser = null;
  
  fetch('/logout', { 
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .catch(() => {})
    .finally(() => {
      window.location.href = '/login-page';
    });
};

if (!window.isTokenExpired) window.isTokenExpired = isTokenExpired;
if (!window.getToken) window.getToken = getToken;
if (!window.logout) window.logout = logout;
