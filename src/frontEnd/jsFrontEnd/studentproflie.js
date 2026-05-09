// // document.getElementById('pfpUpload').addEventListener('change', function(event) {
// //   const file = event.target.files[0];
// //   if (file) {
// //     const reader = new FileReader();
// //     reader.onload = function(e) {
// //       document.getElementById('pfpPreview').innerHTML = `<img src="${e.target.result}" alt="Profile Picture">`;
// //     }
// //     reader.readAsDataURL(file);
// //   }
// // });

// // function saveProfile() {
// //   // Here is where your developer will add the fetch() call to PUT /api/student/profile
// //   alert("Profile Saved! You are now ready to apply for opportunities.");
// //   window.location.href = "/near/me"; // Redirect them back to the map
// // }
// // 1. Load data when the page opens
// document.addEventListener("DOMContentLoaded", async () => {
//   try {
//     const response = await fetch("/api/student/profile", {
//       // If you use cookies, you don't need headers. If using localStorage, add Authorization here.
//     });
//     const data = await response.json();

//     if (data.success) {
//       const p = data.profile;
//       document.getElementById("firstName").value = p.StuName || "";
//       document.getElementById("lastName").value = p.StuLastName || "";
//       document.getElementById("educationLevel").value =
//         p.StuEducationLevel || "";
//       document.getElementById("bio").value = p.StuBio || "";

//       // Update the Avatar =
//       if (p.StuName && p.StuLastName) {
//         document.getElementById("pfpPreview").textContent =
//           p.StuName[0] + p.StuLastName[0];
//       }
//     }
//   } catch (err) {
//     console.error("Could not load profile", err);
//   }
// });

// // 2. Save data when they click the button
// async function saveProfile() {
//   const payload = {
//     firstName: document.getElementById("firstName").value.trim(),
//     lastName: document.getElementById("lastName").value.trim(),
//     educationLevel: document.getElementById("educationLevel").value,
//     bio: document.getElementById("bio").value.trim(),
//   };

//   if (!payload.bio) {
//     alert("Please write a short bio so organizations know who you are!");
//     return;
//   }

//   try {
//     const response = await fetch("/api/student/profile", {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const data = await response.json();

//     if (data.success) {
//       // Tell the browser this user is now fully "complete"
//       localStorage.setItem("profileComplete", "true");
//       alert("Profile Saved! You are now ready to apply for opportunities.");
//       window.location.href = "/near/me";
//     } else {
//       alert(data.message);
//     }
//   } catch (err) {
//     alert("Server error. Please try again.");
//   }
// }
