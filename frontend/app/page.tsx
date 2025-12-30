// frontend/app/page.tsx
import Header from '@/components/home/Header';
import Footer from '@/components/home/Footer';
import StyleSwitcher from '@/components/home/StyleSwitcher';
import './styles/home.css'; // All CSS imported here

export const metadata = {
    title: 'High Prosper Services Ltd - Professional Cleaning Services',
    description: 'Premium cleaning services in Rwanda since 2010',
};

export default async function HomePage() {
    // Fetch dynamic data from Django backend
    let services = [];
    let team = [];
    let stats = { satisfied_clients: 2500 };

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/`, {
            cache: 'no-store',
        });
        if (res.ok) services = await res.json();
    } catch (e) {
        console.error('Failed to load services');
    }

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/`, {
            cache: 'no-store',
        });
        if (res.ok) team = await res.json();
    } catch (e) {
        console.error('Failed to load team');
    }

    // Fallback static data if API fails
    const fallbackServices = [
        { title: 'Carpet Cleaning', image: '/assets/service/house.jpg' },
        { title: 'Window Cleaning', image: '/assets/service/window.jpg' },
        { title: 'Bathroom Cleaning', image: '/assets/service/bathroom.jpg' },
        { title: 'Furniture Cleaning', image: '/assets/service/furniture.jpg' },
    ];

    const fallbackTeam = [
        {
            slug: 'devotha-ntawigenera',
            name: 'Devotha Ntawigenera',
            role: 'Team Leader & Founder',
            department: 'Management',
            bio: 'Leading High Prosper Services since 2010 with a passion for excellence and eco-friendly cleaning solutions across Rwanda.',
            achievements: [
                'Served over 2,500 satisfied clients',
                'Built a team of 15+ professional cleaners',
                'Introduced green cleaning practices in Eastern Province',
            ],
            social: {
                linkedin: 'https://linkedin.com/in/devotha',
                twitter: 'https://twitter.com/devotha',
                facebook: 'https://facebook.com/highprosper',
            },
            image: '/assets/team/1.png',
        },
        {
            slug: 'obed-ibyishatse',
            name: 'Obed Ibyishatse',
            role: 'Data Manager',
            department: 'Management',
            bio: 'Leading High Prosper Services since 2010 with a passion for excellence and eco-friendly cleaning solutions across Rwanda.',
            achievements: [
                'Served over 2,500 satisfied clients',
                'Built a team of 15+ professional cleaners',
                'Introduced green cleaning practices in Eastern Province',
            ],
            social: {
                linkedin: 'https://linkedin.com/in/obed',
                twitter: 'https://twitter.com/obed-ibyishatse',
                facebook: 'https://facebook.com/highprosper',
            },
            image: '/assets/team/2.png',
        },
        {
            slug: 'david-nkotanyi',
            name: 'David Nkotanyi',
            role: 'Sector Manager',
            department: 'Management',
            bio: 'Leading High Prosper Services since 2010 with a passion for excellence and eco-friendly cleaning solutions across Rwanda.',
            achievements: [
                'Served over 2,500 satisfied clients',
                'Built a team of 15+ professional cleaners',
                'Introduced green cleaning practices in Eastern Province',
            ],
            social: {
                linkedin: 'https://linkedin.com/in/david-nkotanyi',
                twitter: 'https://twitter.com/david-nkotanyi',
                facebook: 'https://facebook.com/highprosper',
            },
            image: '/assets/team/3.png',
        },
    ];

    const finalServices = services.length > 0 ? services : fallbackServices;
    const finalTeam = team.length > 0 ? team : fallbackTeam;

    return (
        <>
            <Header />
            <StyleSwitcher />

            {/* Hero Section */}
            <section className="home" id="home">
                <div className="container">
                    <div className="grid">
                        <div className="home-text">
                            <h1>Need Professional Cleaning Services?</h1>
                            <p>
                                High Prosper Services Ltd has been delivering top-quality cleaning solutions across Rwanda since 2010.
                            </p>
                            <div className="btn-wrap">
                                <a href="#about" className="btn">Know More</a>
                            </div>
                        </div>
                        <div className="home-img">
                            <div className="circle-warp">
                                <div className="circle"></div>
                            </div>
                            <img src="/assets/home-img.png" alt="High Prosper Cleaning Team" />
                        </div>
                    </div>
                </div>
            </section>

            {/* About */}
            <section className="about section-padding" id="about">
                <div className="container">
                    <div className="grid">
                        <div className="about-img">
                            <div className="img-box">
                                <img src="/assets/about-img.jpg" alt="About High Prosper" />
                                <div className="box box-1">
                                    <span>{stats.satisfied_clients}+</span>
                                    <p>Satisfied Clients</p>
                                </div>
                            </div>
                        </div>
                        <div className="about-text">
                            <div className="section-title">
                                <span className="title">About Us</span>
                                <h2 className="sub-title">We're Cleaning Since 2010</h2>
                            </div>
                            <p>
                                High Prosper Services Ltd is a leading cleaning company based in Nyamata, Bugesera District. We pride ourselves on reliability, professionalism, and eco-friendly cleaning methods.
                            </p>
                            <p>
                                From residential homes to commercial spaces, our trained team ensures every corner shines.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="services section-padding" id="services">
                <div className="container">
                    <div className="section-title">
                        <span className="title">Services</span>
                        <h2 className="sub-title">What We Do</h2>
                    </div>
                    <div className="grid">
                        {finalServices.map((service: any, i: number) => (
                            <div key={i} className="services-item">
                                <div className="img-box">
                                    <img src={service.image || service.photo} alt={service.title} />
                                </div>
                                <h3>{service.title || service.name}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="pricing section-padding" id="pricing">
                <div className="container">
                    <div className="section-title">
                        <span className="title">Pricing</span>
                        <h2 className="sub-title">Our Pricing Plans</h2>
                    </div>
                    <div className="grid">
                        <div className="pricing-item">
                            <div className="pricing-header">
                                <h3>Basic</h3>
                                <div className="price"><span>299,000</span> RWF / month</div>
                            </div>
                            <div className="pricing-body">
                                <ul>
                                    <li><i className="fas fa-check"></i> Window Cleaning</li>
                                    <li><i className="fas fa-check"></i> Carpet Cleaning</li>
                                    <li><i className="fas fa-times"></i> Furniture Cleaning</li>
                                    <li><i className="fas fa-times"></i> Car Cleaning</li>
                                    <li><i className="fas fa-times"></i> Deep Bathroom Cleaning</li>
                                </ul>
                            </div>
                            <div className="pricing-footer">
                                <a href="/contact" className="btn">Get Started</a>
                            </div>
                        </div>

                        <div className="pricing-item">
                            <div className="pricing-header">
                                <h3>Standard</h3>
                                <div className="price"><span>499,000</span> RWF / month</div>
                            </div>
                            <div className="pricing-body">
                                <ul>
                                    <li><i className="fas fa-check"></i> All Basic Services</li>
                                    <li><i className="fas fa-check"></i> Furniture Cleaning</li>
                                    <li><i className="fas fa-check"></i> Car Interior Cleaning</li>
                                    <li><i className="fas fa-times"></i> Deep Bathroom Cleaning</li>
                                </ul>
                            </div>
                            <div className="pricing-footer">
                                <a href="/contact" className="btn">Get Started</a>
                            </div>
                        </div>

                        <div className="pricing-item">
                            <div className="pricing-header">
                                <h3>Premium</h3>
                                <div className="price"><span>899,000</span> RWF / month</div>
                            </div>
                            <div className="pricing-body">
                                <ul>
                                    <li><i className="fas fa-check"></i> All Standard Services</li>
                                    <li><i className="fas fa-check"></i> Deep Bathroom Cleaning</li>
                                    <li><i className="fas fa-check"></i> Post-Construction Cleaning</li>
                                    <li><i className="fas fa-check"></i> Weekly Visits</li>
                                </ul>
                            </div>
                            <div className="pricing-footer">
                                <a href="/contact" className="btn">Get Started</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="team section-padding" id="team">
                <div className="container">
                    <div className="section-title">
                        <span className="title">Our Team</span>
                        <h2 className="sub-title">Meet The Professionals</h2>
                    </div>

                    <div className="grid team-grid">
                        {finalTeam.map((member: any, i: number) => (
                            <a
                                key={i}
                                href={`/team/${member.slug || member.name.toLowerCase().replace(/\s+/g, '-')}`}
                                className="team-card-link"
                            >
                                <div className="team-card">
                                    <div className="team-card-img">
                                        <img
                                            src={member.image || member.photo || '/assets/team/placeholder.jpg'}
                                            alt={member.name}
                                        />
                                        <div className="team-card-overlay">
                                            <p className="team-card-view">View Profile →</p>
                                        </div>
                                    </div>

                                    <div className="team-card-info">
                                        <h3>{member.name}</h3>
                                        <p className="role">{member.role || member.position}</p>
                                        <p className="department">{member.department || 'Cleaning Specialist'}</p>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact */}
            <section className="contact section-padding" id="contact">
                <div className="container">
                    <div className="section-title">
                        <span className="title">Contact Us</span>
                        <h2 className="sub-title">Have Any Question?</h2>
                    </div>
                    <div className="grid contact-grid">
                        <div className="contact-info">
                            <div className="contact-info-item">
                                <i className="fas fa-map-marker-alt"></i>
                                <h3>Address</h3>
                                <p>Ville-Nyamata, Sec-Nyamata, Bugesera District, Eastern Rwanda</p>
                            </div>
                            <div className="contact-info-item">
                                <i className="fas fa-phone"></i>
                                <h3>Call Us</h3>
                                <p>+250 781 293 073</p>
                            </div>
                            <div className="contact-info-item">
                                <i className="fas fa-envelope"></i>
                                <h3>Email Us</h3>
                                <p>info@highprosper.rw</p>
                            </div>
                        </div>
                        <div className="contact-form">
                            <form action="/api/contact" method="POST">
                                <div className="input-box">
                                    <input type="text" placeholder="Name" className="input-control" required />
                                </div>
                                <div className="input-box">
                                    <input type="email" placeholder="Email" className="input-control" required />
                                </div>
                                <div className="input-box">
                                    <input type="tel" placeholder="Phone" className="input-control" required />
                                </div>
                                <div className="input-box">
                                    <textarea placeholder="Message" className="input-control" required></textarea>
                                </div>
                                <div className="btn-wrap">
                                    <button type="submit" className="btn">Send Message</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}