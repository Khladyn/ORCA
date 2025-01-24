/* Navigation */
document.querySelectorAll(".orca-main-nav .nav-link").forEach((link) => {
    if (link.href === window.location.href) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
    }
});

/* Back To Top */
let mybutton = document.getElementById("back-to-top");

window.onscroll = function () {
    scrollFunction();
};

mybutton.addEventListener("click", backToTop);

function backToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}