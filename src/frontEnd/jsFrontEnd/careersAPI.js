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


document.addEventListener("DOMContentLoaded", () => {

  const spanInitials = document.getElementById("initials");

  const initialStored = localStorage.getItem("initials");

  if(initialStored){
    spanInitials.textContent = initialStored;
  }else{
    spanInitials.textContent = "?";
  }


  console.log("The button was clicked somehow or the js was loaded!!!");

  const grid = document.getElementById("careersGrid");
  const buttons = document.querySelectorAll("[data-category='technology']");

  if (!grid) {
    console.error("Grid not found!");
    return;
  }

  buttons.forEach(button => {

    button.addEventListener("click", async (e) => {

        console.log(e);

      const category = button.dataset.category;

      console.log("Clicked category:", category);

      try {
        const res = await fetch(`/api/jobs?category=${category}`);
        const data = await res.json();

        console.log("API RESPONSE:", data);

        const jobs = data.jobs || [];

        grid.innerHTML = "";

        jobs.forEach(job => {

          const card = document.createElement("article");
          card.className = "career-card";

          card.innerHTML = `
            <h3>${job.title || "No title"}</h3>
            <p>${job.company || "Unknown"} • ${job.location || ""}</p>
            <p>${job.salary || ""}</p>
          `;

          grid.appendChild(card);
        });

      } catch (err) {
        console.error("Fetch failed:", err);
      }

    });

  });

});