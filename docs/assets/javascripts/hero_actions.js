
    document.addEventListener("DOMContentLoaded", () => {
      /**    const el = document.querySelector("[data-mdx-component=hero]");
    if (el) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.nextElementSibling.classList.add("md-typeset");
                    observer.disconnect();
                }
            });
        });
        observer.observe(el);
        document.querySelectorAll("li[hidden]").forEach((item) => {
            if (item.getAttribute("hidden") && !item.classList.contains("about_hero")) {
                item.removeAttribute("hidden");
            }
            item.removeAttribute("hidden");
        });

    }
    document
        .getElementById("yoshimi_question")
        .addEventListener("click", showAbout);
*/
      function showAbout() {
        var about_parent = document.getElementsByClassName("about_hero");
        var about_p = about_parent[0].getElementsByTagName("p");
        var about = about_p[0];
        if (
          about &&
          (about.style.opacity === "0" || about.style.display === "none")
        ) {
          about.style.display = "block";
          setTimeout(() => {
            about.style.opacity = "1";
            about.style.zIndex = "20";
          }, 0); // Delay to trigger CSS transition
        } else if (about && about.style.opacity === "1") {
          about.style.opacity = "0";
          about.style.zIndex = "-1";
          setTimeout(() => {
            about.style.display = "none";
          }, 500); // Match this to the CSS transition duration
        }
      }
    });
