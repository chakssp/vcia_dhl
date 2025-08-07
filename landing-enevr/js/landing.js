// Funções para hover dos 3 pilares
function showPillarDetails(element, pillar) {
    const hoverExpand = element.querySelector('.hover-expand');
    if (hoverExpand) {
        hoverExpand.style.display = 'block';
        setTimeout(() => {
            hoverExpand.style.opacity = '1';
        }, 10);
    }
    element.style.transform = 'translateY(-5px)';
}

function hidePillarDetails(element) {
    const hoverExpand = element.querySelector('.hover-expand');
    if (hoverExpand) {
        hoverExpand.style.opacity = '0';
        setTimeout(() => {
            hoverExpand.style.display = 'none';
        }, 300);
    }
    element.style.transform = 'translateY(0)';
}

// Tornar funções globais
window.showPillarDetails = showPillarDetails;
window.hidePillarDetails = hidePillarDetails;

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Form submission handler
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);
        
        // Show loading state
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Enviando...';
        submitButton.disabled = true;
        
        // Simulate form submission
        setTimeout(() => {
            // Reset button
            submitButton.textContent = 'Mensagem Enviada com Sucesso!';
            submitButton.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            
            // Reset form
            contactForm.reset();
            
            // Show success message
            setTimeout(() => {
                submitButton.textContent = originalText;
                submitButton.style.background = '';
                submitButton.disabled = false;
            }, 3000);
            
            // Log form data (in production, send to backend)
            console.log('Form submitted:', data);
            
            // WhatsApp redirect option
            if (confirm('Mensagem enviada! Deseja também conversar pelo WhatsApp?')) {
                const message = `Olá! Meu nome é ${data.name} da empresa ${data.company}. ${data.message || 'Gostaria de saber mais sobre as soluções da enevr.'}`;
                const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }
        }, 1000);
    });
}

// Animate numbers on scroll
const animateNumbers = () => {
    const numbers = document.querySelectorAll('.result-number, .metric-value');
    
    numbers.forEach(number => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.animated) {
                    entry.target.animated = true;
                    const text = entry.target.textContent;
                    const hasPercentage = text.includes('%');
                    const hasTime = text.includes('h') || text.includes('min');
                    const hasArrow = text.includes('→');
                    const hasX = text.includes('x');
                    
                    if (hasArrow) {
                        // Handle time comparison like "3h → 15min"
                        entry.target.style.opacity = '0';
                        setTimeout(() => {
                            entry.target.style.opacity = '1';
                            entry.target.style.transition = 'opacity 0.5s ease';
                        }, 300);
                    } else if (hasPercentage || hasTime || hasX) {
                        // Extract number for animation
                        let finalValue = parseInt(text.match(/\d+/)[0]);
                        let currentValue = 0;
                        const increment = finalValue / 50;
                        const timer = setInterval(() => {
                            currentValue += increment;
                            if (currentValue >= finalValue) {
                                currentValue = finalValue;
                                clearInterval(timer);
                                entry.target.textContent = text; // Restore original text
                            } else {
                                if (hasPercentage) {
                                    entry.target.textContent = Math.floor(currentValue) + '%';
                                } else if (hasX) {
                                    entry.target.textContent = Math.floor(currentValue) + 'x';
                                } else if (text.includes('h')) {
                                    entry.target.textContent = Math.floor(currentValue) + 'h';
                                } else {
                                    entry.target.textContent = Math.floor(currentValue);
                                }
                            }
                        }, 30);
                    }
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(number);
    });
};

// Initialize number animations
animateNumbers();

// Ecosystem diagram animation
const animateEcosystem = () => {
    const svg = document.querySelector('.ecosystem-svg');
    if (!svg) return;
    
    const circles = svg.querySelectorAll('circle');
    const lines = svg.querySelectorAll('line');
    const texts = svg.querySelectorAll('text');
    
    // Initially hide elements
    circles.forEach(circle => {
        circle.style.opacity = '0';
        circle.style.transform = 'scale(0)';
        circle.style.transformOrigin = 'center';
        circle.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    lines.forEach(line => {
        line.style.strokeDasharray = '100';
        line.style.strokeDashoffset = '100';
        line.style.transition = 'stroke-dashoffset 0.8s ease';
    });
    
    texts.forEach(text => {
        text.style.opacity = '0';
        text.style.transition = 'opacity 0.5s ease';
    });
    
    // Animate on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.animated) {
                entry.target.animated = true;
                
                // Animate circles
                circles.forEach((circle, index) => {
                    setTimeout(() => {
                        circle.style.opacity = '1';
                        circle.style.transform = 'scale(1)';
                    }, index * 100);
                });
                
                // Animate lines
                setTimeout(() => {
                    lines.forEach((line, index) => {
                        setTimeout(() => {
                            line.style.strokeDashoffset = '0';
                        }, index * 150);
                    });
                }, 300);
                
                // Animate text
                setTimeout(() => {
                    texts.forEach((text, index) => {
                        setTimeout(() => {
                            text.style.opacity = '1';
                        }, index * 50);
                    });
                }, 600);
            }
        });
    }, { threshold: 0.3 });
    
    observer.observe(svg);
};

// Initialize ecosystem animation
animateEcosystem();

// Mobile menu toggle (if needed)
const createMobileMenu = () => {
    const navbar = document.querySelector('.navbar');
    const navMenu = document.querySelector('.nav-menu');
    
    // Create mobile menu button
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-toggle';
    menuButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    `;
    menuButton.style.cssText = `
        display: none;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
        color: var(--color-dark);
    `;
    
    // Add styles for mobile
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .mobile-menu-toggle {
                display: block !important;
            }
            .nav-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                flex-direction: column;
                padding: 1rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .nav-menu.active {
                display: flex;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Insert menu button
    navbar.querySelector('.container').insertBefore(menuButton, navMenu);
    
    // Toggle menu
    menuButton.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
    
    // Close menu on link click
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });
};

// Initialize mobile menu
createMobileMenu();

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    
    if (hero && scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// Set initial body opacity
document.body.style.opacity = '0';
document.body.style.transition = 'opacity 0.5s ease';

// Console message
console.log('%c🚀 enevr - Transformando conhecimento em inteligência', 'color: #3B82F6; font-size: 16px; font-weight: bold;');
console.log('%c💡 Interessado em nossas soluções? Entre em contato!', 'color: #FB923C; font-size: 14px;');