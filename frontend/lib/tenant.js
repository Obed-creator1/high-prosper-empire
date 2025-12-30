// frontend/lib/tenant.js
useEffect(() => {
    const slug = window.location.hostname.split('.')[0];
    if (slug !== 'app' && slug !== 'localhost') {
        // Fetch tenant config from /api/tenants/config/?slug=clientname
        api.get(`/tenants/config/?slug=${slug}`).then(res => {
            document.title = `${res.data.name} ERP`;
            // Update logo, colors, etc.
        });
    }
}, []);