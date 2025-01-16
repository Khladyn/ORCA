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

/* Conversation */
const convos_content = document.querySelector('.orca-convos-content'); 
convos_content.scrollTop = convos_content.scrollHeight; 

function scrollFunction() {
    if (
        document.body.scrollTop > 20 ||
        document.documentElement.scrollTop > 20
    ) {
        mybutton.style.display = "block";
    } else {
        mybutton.style.display = "none";
    }
}

mybutton.addEventListener("click", backToTop);

function backToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

const qna_tags_create = UseBootstrapTag(document.getElementById('qna_tags_create'));
const qna_tags_edit = UseBootstrapTag(document.getElementById('qna_tags_edit'));