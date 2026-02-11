// tenants-admin.js - Optional: live subdomain preview
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.querySelector('#id_name');
    const slugInput = document.querySelector('#id_slug');
    if (nameInput && slugInput) {
        nameInput.addEventListener('input', function() {
            let slug = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            slugInput.value = slug;
        });
    }
});