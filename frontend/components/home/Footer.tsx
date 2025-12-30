// components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <h3>Follow Us</h3>
                <div className="social-links">
                    <a href="https://facebook.com" target="_blank" rel="noreferrer" title="Facebook">
                        <i className="fab fa-facebook-f"></i>
                    </a>
                    <a href="https://twitter.com" target="_blank" rel="noreferrer" title="Twitter">
                        <i className="fab fa-twitter"></i>
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram">
                        <i className="fab fa-instagram"></i>
                    </a>
                    <a href="https://youtube.com" target="_blank" rel="noreferrer" title="YouTube">
                        <i className="fab fa-youtube"></i>
                    </a>
                </div>
                <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
                    © {new Date().getFullYear()} High Prosper Services Ltd. All rights reserved.
                </p>
            </div>
        </footer>
    );
}