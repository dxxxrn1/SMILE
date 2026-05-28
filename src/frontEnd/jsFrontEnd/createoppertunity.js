document.addEventListener("DOMContentLoaded", function () {

    // Populate sidebar initials and organization name
    const orgName = localStorage.getItem("orgName") || localStorage.getItem("userName") || "SMILE Africa NGO";
    const initials = localStorage.getItem("orgInitials") || localStorage.getItem("initials") || orgName.slice(0, 2).toUpperCase();
    const avatarEl = document.getElementById("sidebarInitials");
    const nameEl = document.getElementById("sidebarOrgName");
    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = orgName;

    // Character counter
    window.updateCharCount = function (el, countId, max) {
        document.getElementById(countId).textContent = `${el.value.length} / ${max}`;
    };

    // Toast helper
    function showToast(msg, type = "") {
        const t = document.getElementById("toast");
        t.textContent = msg;
        t.className = "toast toast--show" + (type ? ` toast--${type}` : "");
        setTimeout(() => { t.className = "toast"; }, 3000);
    }

    // Show/hide form message
    function setFormMsg(msg, type) {
        const el = document.getElementById("formMsg");
        el.textContent = msg;
        el.className = `form-msg form-msg--${type}`;
    }

    // Validate a single field
    function validateField(id) {
        const el = document.getElementById(id);
        const grp = el.closest(".form__group");
        if (!el.value.trim()) {
            grp.classList.add("form__group--error");
            return false;
        }
        grp.classList.remove("form__group--error");
        return true;
    }

    // Remove error on input
    document.querySelectorAll(".form__input").forEach(el => {
        el.addEventListener("input", function () {
            this.closest(".form__group")?.classList.remove("form__group--error");
        });
    });

    document.querySelectorAll(".type-option").forEach(el => {
        el.addEventListener("change", function () {
            document.getElementById("typeGroup").classList.remove("form__group--error");
        });
    });

    // Submit — Publish
    document.getElementById("createOppForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        // Validate required fields
        let valid = true;
        ["newTitle", "newProvince", "newDeadline", "newDesc"].forEach(id => {
            if (!validateField(id)) valid = false;
        });

        const selectedType = document.querySelector('input[name="oppType"]:checked');
        if (!selectedType) {
            document.getElementById("typeGroup").classList.add("form__group--error");
            valid = false;
        }

        if (!valid) {
            setFormMsg("Please fill in all required fields before publishing.", "error");
            return;
        }
        const payload = {
            title:           document.getElementById("newTitle").value.trim(),
            type:            selectedType.value,
            address:         document.getElementById("newAddress").value.trim(), // <--- Added this
            province:        document.getElementById("newProvince").value,
            maxApplicants:   document.getElementById("newMax").value || null,
            description:     document.getElementById("newDesc").value.trim(),
            requirements:    document.getElementById("newReq").value.trim(),
            deadline:        document.getElementById("newDeadline").value,
            startDate:       document.getElementById("newStart").value || null,
            applicationLink: document.getElementById("newLink").value.trim()
        };

        // const payload = {
        //     title:           document.getElementById("newTitle").value.trim(),
        //     type:            selectedType.value,
        //     province:        document.getElementById("newProvince").value,
        //     maxApplicants:   document.getElementById("newMax").value || null,
        //     description:     document.getElementById("newDesc").value.trim(),
        //     requirements:    document.getElementById("newReq").value.trim(),
        //     deadline:        document.getElementById("newDeadline").value,
        //     startDate:       document.getElementById("newStart").value || null,
        //     applicationLink: document.getElementById("newLink").value.trim()
        // };

        const publishBtn = document.getElementById("publishBtn");
        publishBtn.disabled = true;
        publishBtn.textContent = "Publishing...";

        try {
            const res = await fetch("/api/opportunities/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                setFormMsg("Opportunity published successfully!", "success");
                showToast("Opportunity published!", "success");
                document.getElementById("createOppForm").reset();
                document.getElementById("descCount").textContent = "0 / 1000";
            } else {
                setFormMsg(data.message || "Something went wrong.", "error");
                showToast("Failed to publish.", "error");
            }

        } catch (err) {
            console.error(err);
            setFormMsg("Network error. Please try again.", "error");
            showToast("Network error.", "error");
        } finally {
            publishBtn.disabled = false;
            publishBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
                </svg>
                Publish Opportunity`;
        }
    });

    // Save as Draft
    document.getElementById("draftBtn").addEventListener("click", function () {
        document.getElementById("formMsg").className = "";
        document.getElementById("formMsg").textContent = "";
        showToast("Saved as draft.");
    });

    // Clear form
    document.getElementById("clearBtn").addEventListener("click", function () {
        document.getElementById("createOppForm").reset();
        document.getElementById("descCount").textContent = "0 / 1000";
        document.getElementById("formMsg").className = "";
        document.getElementById("formMsg").textContent = "";
        document.querySelectorAll(".form__group--error").forEach(g => g.classList.remove("form__group--error"));
        showToast("Form cleared.");
    });


    const logoutTag = document.getElementById("logout");
    logoutTag.addEventListener("click" , ()=>{
        localStorage.removeItem("token");
        localStorage.removeItem("accountType");
        localStorage.removeItem("userName");
        localStorage.removeItem("initials");
    })
});