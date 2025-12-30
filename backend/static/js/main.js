/**
 * main.js - Shared JavaScript utilities for High Prosper Services Admin Dashboard
 * Handles preloader, header scroll, navigation, Bootstrap features, form validation, and chat
 */
(function () {
    'use strict';

    // Utility: Debounce function to limit event handler frequency
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Skip browser-specific code in Node.js
    if (typeof window === 'undefined') {
        console.log('Running in Node.js, skipping browser-specific functionality');
        return;
    }

    // Preloader: Hide on page load
    window.addEventListener('load', () => {
        try {
            const preloader = document.querySelector('.js-preloader');
            if (!preloader) {
                console.warn('Preloader element (.js-preloader) not found');
                return;
            }
            preloader.classList.add('fade-out');
            console.log('Preloader: Added fade-out class');

            setTimeout(() => {
                preloader.style.display = 'none';
                console.log('Preloader: Hidden');
            }, 600);
        } catch (error) {
            console.error('Preloader error:', error);
        }
    });

    // Header background reveal on scroll
    function headerBg() {
        const header = document.querySelector('.js-header');
        if (!header) {
            console.warn('Header element (.js-header) not found');
            return;
        }

        const handleScroll = debounce(() => {
            try {
                if (window.scrollY > 0) {
                    header.classList.add('bg-reveal');
                    console.log('Header: bg-reveal added');
                } else {
                    header.classList.remove('bg-reveal');
                    console.log('Header: bg-reveal removed');
                }
            } catch (error) {
                console.error('Header scroll error:', error);
            }
        }, 100);

        window.addEventListener('scroll', handleScroll);
        console.log('Header: Scroll listener added');
    }

    // Navigation toggling
    function navigation() {
        const navToggler = document.querySelector('.js-nav-toggler');
        const nav = document.querySelector('.js-nav');
        if (!navToggler || !nav) {
            console.warn('Navigation elements not found', { navToggler, nav });
            return;
        }

        const navItems = nav.querySelectorAll('li');
        if (navItems.length === 0) {
            console.warn('No navigation items found in .js-nav');
        }

        function toggleNav() {
            try {
                nav.classList.toggle('open');
                navToggler.classList.toggle('active');
                console.log('Navigation: Toggled', { isOpen: nav.classList.contains('open') });
            } catch (error) {
                console.error('Navigation toggle error:', error);
            }
        }

        navToggler.addEventListener('click', toggleNav);
        console.log('Navigation: Toggler listener added');

        navItems.forEach((li, index) => {
            const link = li.querySelector('a');
            if (!link) {
                console.warn(`Navigation item ${index} has no anchor tag`);
                return;
            }
            link.addEventListener('click', () => {
                try {
                    if (window.innerWidth <= 767) {
                        toggleNav();
                        console.log(`Navigation: Item ${index} clicked, nav closed`);
                    }
                } catch (error) {
                    console.error(`Navigation item ${index} click error:`, error);
                }
            });
        });
    }

    // Sidebar toggle for admin dashboard
    function sidebarToggle() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const toggleButton = document.getElementById('sidebarToggle');
        if (!sidebar || !mainContent || !toggleButton) {
            console.warn('Sidebar elements not found', { sidebar, mainContent, toggleButton });
            return;
        }

        toggleButton.addEventListener('click', () => {
            try {
                sidebar.classList.toggle('show');
                mainContent.classList.toggle('sidebar-show');
                console.log('Sidebar: Toggled', { isOpen: sidebar.classList.contains('show') });
            } catch (error) {
                console.error('Sidebar toggle error:', error);
            }
        });
        console.log('Sidebar: Toggler listener added');
    }

    // Dark mode toggle
    function toggleDarkMode() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) {
            console.warn('Dark mode toggle button not found');
            return;
        }
        try {
            document.body.classList.toggle('dark-mode');
            const icon = darkModeToggle.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('theme', 'dark');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
                localStorage.setItem('theme', 'light');
            }
            console.log('Dark mode: Toggled', { isDark: document.body.classList.contains('dark-mode') });
        } catch (error) {
            console.error('Dark mode toggle error:', error);
        }
    }

    // Initialize Bootstrap tooltips
    function initializeTooltips() {
        if (typeof bootstrap === 'undefined') {
            console.warn('Bootstrap is not loaded. Tooltips will not be initialized.');
            return;
        }
        try {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
            console.log('Tooltips: Initialized', { count: tooltipTriggerList.length });
        } catch (error) {
            console.error('Tooltip initialization error:', error);
        }
    }

    // Initialize Bootstrap modals for confirmations
    function initializeModals() {
        if (typeof bootstrap === 'undefined') {
            console.warn('Bootstrap is not loaded. Modals will not be initialized.');
            return;
        }
        try {
            const modalTriggers = document.querySelectorAll('[data-confirm-modal]');
            modalTriggers.forEach(trigger => {
                trigger.addEventListener('click', () => {
                    const modalId = trigger.getAttribute('data-confirm-modal');
                    const modal = document.getElementById(modalId);
                    if (modal && bootstrap.Modal) {
                        new bootstrap.Modal(modal).show();
                        console.log(`Modal: Opened ${modalId}`);
                    } else {
                        console.warn(`Modal: ${modalId} not found or Bootstrap Modal not available`);
                    }
                });
            });
            console.log('Modals: Initialized', { count: modalTriggers.length });
        } catch (error) {
            console.error('Modal initialization error:', error);
        }
    }

    // Initialize Bootstrap alerts
    function initializeAlerts() {
        if (typeof bootstrap === 'undefined') {
            console.warn('Bootstrap is not loaded. Alerts will not be initialized.');
            return;
        }
        try {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => {
                const bsAlert = new bootstrap.Alert(alert);
                setTimeout(() => {
                    bsAlert.close();
                    console.log('Alert: Closed automatically');
                }, 5000);
            });
            console.log('Alerts: Initialized', { count: alerts.length });
        } catch (error) {
            console.error('Alert initialization error:', error);
        }
    }

    // Form validation utility
    function validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error(`Form with ID ${formId} not found`);
            return false;
        }
        try {
            if (typeof bootstrap === 'undefined') {
                console.error('Bootstrap is not loaded. Form validation may not work.');
                return form.checkValidity();
            }
            form.classList.add('was-validated');
            return form.checkValidity();
        } catch (error) {
            console.error('Form validation error:', error);
            return false;
        }
    }

    // Confirm deletion utility
    window.confirmDelete = function (type, id) {
        return confirm(`Are you sure you want to delete this ${type} #${id}? This action cannot be undone.`);
    };

    // Chat WebSocket functionality
    function initializeChat() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) {
            console.log('Chat: Not on dashboard page, skipping WebSocket initialization');
            return;
        }

        let chatSocket = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const reconnectInterval = 3000;
        let typingTimeout = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            chatSocket = new WebSocket(protocol + window.location.host + '/ws/chat/');

            chatSocket.onopen = function() {
                console.log('WebSocket connected');
                reconnectAttempts = 0;
                document.getElementById('chat-error').style.display = 'none';
            };

            chatSocket.onmessage = function(e) {
                try {
                    const data = JSON.parse(e.data);
                    console.log('WebSocket message received:', data);
                    const typingIndicator = document.getElementById('typing-indicator');

                    if (data.type === 'message') {
                        const message = data.message
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;');
                        const sender = data.sender;
                        const isSent = sender === '{{ user.role|escapejs }}' || sender === '{{ user.username|escapejs }}';
                        const avatarUrl = data.avatar_url || '{% static "images/default.jpg" %}';
                        const html = `
                            <div class="chat-message ${isSent ? 'sent' : 'received'}" role="article" aria-label="Message from ${sender}">
                                <img src="${avatarUrl}" class="avatar" alt="Avatar of ${sender}">
                                <div class="sender">${sender}</div>
                                <div>${message}</div>
                                <div class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</div>
                            </div>
                        `;
                        chatMessages.insertAdjacentHTML('beforeend', html);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        // Announce new message for screen readers
                        const status = document.createElement('div');
                        status.className = 'visually-hidden';
                        status.setAttribute('aria-live', 'polite');
                        status.textContent = `New message from ${sender}: ${data.message}`;
                        document.body.appendChild(status);
                        setTimeout(() => status.remove(), 1000);
                    } else if (data.type === 'typing') {
                        if (data.is_typing && data.sender !== '{{ user.role|escapejs }}' && data.sender !== '{{ user.username|escapejs }}') {
                            typingIndicator.textContent = `${data.sender} is typing...`;
                            typingIndicator.style.display = 'block';
                        } else {
                            typingIndicator.style.display = 'none';
                        }
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                    showChatError('Error processing message. Please try again.');
                }
            };

            chatSocket.onclose = function(e) {
                console.error('WebSocket closed:', e);
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                    setTimeout(connectWebSocket, reconnectInterval);
                    showChatError(`Chat disconnected. Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`);
                } else {
                    showChatError('Chat connection failed. Please refresh the page.');
                }
            };

            chatSocket.onerror = function(e) {
                console.error('WebSocket error:', e);
                showChatError('Chat connection error. Please try again later.');
            };
        }

        function showChatError(message) {
            const errorDiv = document.getElementById('chat-error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
        }

        window.sendMessage = function() {
            const messageInputDom = document.getElementById('chat-input');
            const message = messageInputDom.value.trim();
            if (message && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
                chatSocket.send(JSON.stringify({
                    'type': 'message',
                    'message': message,
                    'sender': '{{ user.role|escapejs }}' || '{{ user.username|escapejs }}',
                    'avatar_url': '{{ user.profile.profile_picture.url|default:"/static/images/default.jpg"|escapejs }}'
                }));
                messageInputDom.value = '';
                // Clear typing indicator
                clearTimeout(typingTimeout);
                chatSocket.send(JSON.stringify({
                    'type': 'typing',
                    'sender': '{{ user.role|escapejs }}' || '{{ user.username|escapejs }}',
                    'is_typing': false
                }));
            } else if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
                showChatError('Cannot send message: Chat is not connected.');
            }
        };

        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.onkeyup = function(e) {
                if (e.key === 'Enter') {
                    window.sendMessage();
                } else {
                    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
                        chatSocket.send(JSON.stringify({
                            'type': 'typing',
                            'sender': '{{ user.role|escapejs }}' || '{{ user.username|escapejs }}',
                            'is_typing': true
                        }));
                        clearTimeout(typingTimeout);
                        typingTimeout = setTimeout(() => {
                            chatSocket.send(JSON.stringify({
                                'type': 'typing',
                                'sender': '{{ user.role|escapejs }}' || '{{ user.username|escapejs }}',
                                'is_typing': false
                            }));
                        }, 2000);
                    }
                }
            };
            // Trap focus within chat input for accessibility
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    chatInput.focus();
                }
            });
        }

        connectWebSocket();
    }

    // Initialize all features on DOM load
    document.addEventListener('DOMContentLoaded', () => {
        try {
            headerBg();
            navigation();
            sidebarToggle();
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.addEventListener('click', toggleDarkMode);
                // Apply saved theme
                if (localStorage.getItem('theme') === 'dark') {
                    document.body.classList.add('dark-mode');
                    darkModeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
                }
                console.log('Dark mode: Listener added');
            }
            initializeTooltips();
            initializeModals();
            initializeAlerts();
            initializeChat();
            console.log('All features initialized');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    });
})();
