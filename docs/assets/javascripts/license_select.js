// Simplified query selector and event handler
const tabs = document.querySelectorAll(".md-typeset .tabbed-labels>label>[href]:first-child:hover a");
tabs.forEach((tab) => {
  tab.addEventListener("mouseover", handleMouseOver);
});
tabs.forEach((tab) => {
    tab.addEventListener("mouseout", handleMouseOut);
});

function handleMouseOut(event) {
  const url = new URL(event.target.getAttribute("href"));
  const iconId = "icon-" + url.hash.slice(1);
  const icon = document.getElementById(iconId);
  if (icon) {
    icon.querySelector("svg path").style.fill = "var(--md-accent-bg-color)";
  }
}

function handleMouseOver(event) {
  const url = new URL(event.target.getAttribute("href"));
  const iconId = "icon-" + url.hash.slice(1);
  const icon = document.getElementById(iconId);
  if (icon) {
    icon.querySelector("svg path").style.fill = "var(--emerald)";
  }
}

function toggleSection(header) {
  const content = header.nextElementSibling;
  const triangle = header.querySelector(".triangle");

  const isExpanded = content.style.maxHeight;
  content.style.maxHeight = isExpanded ? null : content.scrollHeight + "px";
  triangle.style.transform = isExpanded ? "rotate(0deg)" : "rotate(90deg)";
}
