// Style switcher toggling
function styleSwitcherToggle() {
    const styleSwitcher = document.querySelector(".js-style-switcher");
    const toggler = document.querySelector(".js-style-switcher-toggler");
    const togglerIcon = toggler?.querySelector("i");

    if (!styleSwitcher || !toggler || !togglerIcon) {
        console.warn("Style switcher elements not found", { styleSwitcher, toggler, togglerIcon });
        return;
    }

    toggler.addEventListener("click", () => {
        try {
            styleSwitcher.classList.toggle("open");
            togglerIcon.classList.toggle("fa-times");
            togglerIcon.classList.toggle("fa-cog");
            console.log("Style switcher: Toggled", { isOpen: styleSwitcher.classList.contains("open") });
        } catch (error) {
            console.error("Style switcher toggle error:", error);
        }
    });
    console.log("Style switcher: Toggler listener added");
}
styleSwitcherToggle();

// Theme color (hue slider)
function themeColor() {
    const hueSlider = document.querySelector(".js-hue-slider");
    const hueDisplay = document.querySelector(".js-hue");
    const html = document.documentElement;

    if (!hueSlider || !hueDisplay) {
        console.warn("Theme color elements not found", { hueSlider, hueDisplay });
        return;
    }

    function setHue(value) {
        try {
            const hue = Math.max(0, Math.min(360, parseInt(value, 10)));
            html.style.setProperty("--hue", hue);
            hueDisplay.textContent = hue;
            localStorage.setItem("--hue", hue);
            console.log("Theme color: Hue set to", hue);
        } catch (error) {
            console.error("Theme color set error:", error);
        }
    }

    hueSlider.addEventListener("input", () => {
        setHue(hueSlider.value);
    });

    // Load saved hue or default
    try {
        const savedHue = localStorage.getItem("--hue");
        const defaultHue = getComputedStyle(html).getPropertyValue("--hue").trim() || "200";
        const initialHue = savedHue && !isNaN(savedHue) ? savedHue : defaultHue;
        setHue(initialHue);
        hueSlider.value = initialHue;
        console.log("Theme color: Initialized with hue", initialHue);
    } catch (error) {
        console.error("Theme color initialization error:", error);
    }
}
themeColor();

// Dark mode toggling
function themeLightDark() {
    const darkModeCheckbox = document.querySelector(".js-dark-mode");
    if (!darkModeCheckbox) {
        console.warn("Dark mode checkbox (.js-dark-mode) not found");
        return;
    }

    function setTheme() {
        try {
            const isDark = localStorage.getItem("theme-dark") === "true";
            document.body.classList.toggle("t-dark", isDark);
            darkModeCheckbox.checked = isDark;
            console.log("Dark mode: Set to", isDark);
        } catch (error) {
            console.error("Dark mode set error:", error);
        }
    }

    darkModeCheckbox.addEventListener("change", () => {
        try {
            localStorage.setItem("theme-dark", darkModeCheckbox.checked);
            document.body.classList.toggle("t-dark", darkModeCheckbox.checked);
            console.log("Dark mode: Toggled to", darkModeCheckbox.checked);
        } catch (error) {
            console.error("Dark mode toggle error:", error);
        }
    });

    // Load saved theme or default
    try {
        if (localStorage.getItem("theme-dark") !== null) {
            setTheme();
        } else if (document.body.classList.contains("t-dark")) {
            darkModeCheckbox.checked = true;
            localStorage.setItem("theme-dark", "true");
            console.log("Dark mode: Initialized from body class");
        }
    } catch (error) {
        console.error("Dark mode initialization error:", error);
    }
}
themeLightDark();
