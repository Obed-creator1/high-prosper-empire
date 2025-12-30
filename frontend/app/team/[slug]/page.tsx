// app/team/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Header from '@/components/home/Header';
import Footer from '@/components/home/Footer';
import StyleSwitcher from '@/components/home/StyleSwitcher';

// Mock data — replace with real fetch from API later
const teamMembers = [
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
            linkedin: '#',
            twitter: '#',
            facebook: '#',
        },
        image: '/assets/team/1.png',
    },
    {
        slug: 'obed-ibyishatse',
        name: 'Obed Ibyishatse',
        role: 'Data Manager',
        department: 'Management',
        bio: 'Managing data operations and ensuring seamless information flow across all cleaning projects.',
        achievements: [
            'Implemented digital tracking for 500+ cleaning contracts',
            'Reduced reporting time by 70%',
            'Trained team on modern data tools',
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
        bio: 'Overseeing operations in multiple districts, ensuring quality standards and client satisfaction.',
        achievements: [
            'Managed teams across 5 districts',
            'Achieved 98% client retention rate',
            'Expanded services to new commercial sectors',
        ],
        social: {
            linkedin: 'https://linkedin.com/in/david-nkotanyi',
            twitter: 'https://twitter.com/david-nkotanyi',
            facebook: 'https://facebook.com/highprosper',
        },
        image: '/assets/team/3.png',
    },
];

// Fixed: generateMetadata must await params
export async function generateMetadata({
                                           params,
                                       }: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const member = teamMembers.find((m) => m.slug === slug);

    return {
        title: member ? `${member.name} - ${member.role} | High Prosper Services` : 'Team Member',
        description: member?.bio || 'Meet one of our professional team members at High Prosper Services.',
    };
}

// Fixed: Page component must be async and await params
export default async function TeamMemberPage({
                                                 params,
                                             }: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params; // ← Critical fix for Next.js 15+

    const member = teamMembers.find((m) => m.slug === slug);

    if (!member) {
        notFound();
    }

    return (
        <>
            <Header />
            <StyleSwitcher />

            {/* Hero Profile */}
            <section className="profile-hero">
                <div className="container">
                    <div className="profile-grid">
                        <div className="profile-img">
                            <img src={member.image} alt={member.name} />
                        </div>
                        <div className="profile-info">
                            <h1>{member.name}</h1>
                            <p className="role">{member.role}</p>
                            <p className="department">{member.department}</p>

                            <div className="social-links">
                                {member.social.linkedin && member.social.linkedin !== '#' && (
                                    <a href={member.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                                        <i className="fab fa-linkedin-in"></i>
                                    </a>
                                )}
                                {member.social.twitter && member.social.twitter !== '#' && (
                                    <a href={member.social.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                                        <i className="fab fa-twitter"></i>
                                    </a>
                                )}
                                {member.social.facebook && member.social.facebook !== '#' && (
                                    <a href={member.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                        <i className="fab fa-facebook-f"></i>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bio & Achievements */}
            <section className="profile-details section-padding">
                <div className="container">
                    <h2>About Me</h2>
                    <p>{member.bio}</p>

                    <h2>Key Achievements</h2>
                    <ul className="achievements-list">
                        {member.achievements.map((ach, i) => (
                            <li key={i}>
                                <i className="fas fa-trophy"></i> {ach}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <Footer />
        </>
    );
}