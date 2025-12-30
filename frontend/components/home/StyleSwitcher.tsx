// components/StyleSwitcher.tsx
'use client';

import { useEffect } from 'react';

export default function StyleSwitcher() {
    useEffect(() => {
        // Theme Color (Hue Slider)
        const hueSlider = document.querySelector('.js-hue-slider') as HTMLInputElement;
        const html = document.documentElement;

        const setHue = (value: string) => {
            html.style.setProperty('--hue', value);
            document.querySelector('.js-hue')!.innerHTML = value;
        };

        if (hueSlider) {
            const savedHue = localStorage.getItem('--hue');
            if (savedHue) {
                setHue(savedHue);
                hueSlider.value = savedHue;
            }

            hueSlider.addEventListener('input', () => {
                const value = hueSlider.value;
                setHue(value);
                localStorage.setItem('--hue', value);
            });
        }

        // Dark Mode Toggle
        const darkModeCheckbox = document.querySelector('.js-dark-mode') as HTMLInputElement;

        const applyDarkMode = () => {
            const isDark = localStorage.getItem('theme-dark') === 'true';
            if (isDark) {
                document.body.classList.add('t-dark');
                if (darkModeCheckbox) darkModeCheckbox.checked = true;
            } else {
                document.body.classList.remove('t-dark');
                if (darkModeCheckbox) darkModeCheckbox.checked = false;
            }
        };

        applyDarkMode();

        if (darkModeCheckbox) {
            darkModeCheckbox.addEventListener('change', () => {
                localStorage.setItem('theme-dark', darkModeCheckbox.checked.toString());
                applyDarkMode();
            });
        }

        // Style Switcher Toggle
        const switcher = document.querySelector('.js-style-switcher');
        const toggler = document.querySelector('.js-style-switcher-toggler');
        const icon = toggler?.querySelector('i');

        toggler?.addEventListener('click', () => {
            switcher?.classList.toggle('open');
            icon?.classList.toggle('fa-cog');
            icon?.classList.toggle('fa-times');
        });
    }, []);

    return (
        <div className="style-switcher js-style-switcher">
            <button type="button" className="style-switcher-toggler js-style-switcher-toggler">
                <i className="fas fa-cog"></i>
            </button>

            <div className="style-switcher-main">
                <h2>Style Switcher</h2>

                <div className="style-switcher-item">
                    <p>Theme Color</p>
                    <div className="theme-color">
                        <input type="range" min="0" max="360" className="hue-slider js-hue-slider" defaultValue="200" />
                        <div className="hue">Hue: <span className="js-hue">200</span></div>
                    </div>
                </div>

                <div className="style-switcher-item">
                    <label className="form-switcher">
                        <span>Dark Mode</span>
                        <input type="checkbox" className="js-dark-mode" />
                        <div className="box"></div>
                    </label>
                </div>
            </div>
        </div>
    );
}