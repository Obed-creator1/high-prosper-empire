// components/Header.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
    const [scrolled, setScrolled] = useState(false);
    const [navOpen, setNavOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 0);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`header js-header ${scrolled ? 'bg-reveal' : ''}`}>
            <div className="container">
                <div className="logo">
                    <Link href="/">High Prosper <span>Services Ltd</span></Link>
                </div>
                <button className="nav-toggler js-nav-toggler" onClick={() => setNavOpen(!navOpen)}>
                    <span></span>
                </button>
                <nav className={`nav js-nav ${navOpen ? 'open' : ''}`}>
                    <ul>
                        <li><a href="#home" onClick={() => setNavOpen(false)}>Home</a></li>
                        <li><a href="#about" onClick={() => setNavOpen(false)}>About</a></li>
                        <li><a href="#services" onClick={() => setNavOpen(false)}>Services</a></li>
                        <li><a href="#pricing" onClick={() => setNavOpen(false)}>Pricing</a></li>
                        <li><a href="#team" onClick={() => setNavOpen(false)}>Team</a></li>
                        <li><a href="#contact" onClick={() => setNavOpen(false)}>Contact</a></li>
                        <li><Link href="/login">Login</Link></li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}