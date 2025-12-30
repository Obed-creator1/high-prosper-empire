
window.addEventListener("load", () => {
    const preloader = document.querySelector(".js-preloader");
    preloader.classList.add("fade-out");

    setTimeout(() => {
        preloader.style.display = "none";
        /* animate on scroll */
        AOS.init();
    }, 600);


    
});

/* header bg reveal */

const headerBg = () => {
    const header = document.querySelector(".js-header");
    
    window.addEventListener("scroll", function() {
        if(this.scrollY > 0){
            header.classList.add("bg-reveal");
        }
        else{
            header.classList.remove("bg-reveal");
        }
    });
}
headerBg();

/* nav */

const navigation = () => {
    const navToggler = document.querySelector(".js-nav-toggler");
    const nav = document.querySelector(".js-nav"); 
    const navItems = nav.querySelectorAll("li");

    // function renamed
    const toggleNav = () => {
        nav.classList.toggle("open");
        navToggler.classList.toggle("active");
    }

    navToggler.addEventListener("click", toggleNav);

    navItems.forEach((li) => {
       li.querySelector("a").addEventListener("click", () => {
          if(window.innerWidth <= 767){
            toggleNav();
          }
       });
    });
}

navigation(); // don’t forget to call it!


