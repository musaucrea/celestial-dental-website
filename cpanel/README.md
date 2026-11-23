# cPanel deployment files

Canonical copies of the .htaccess files for the live cPanel host.
`vite build` wipes `dist/`, so after every build run:

    cp cpanel/root.htaccess dist/.htaccess
    cp cpanel/admin.htaccess dist/admin/.htaccess

then zip dist/ and upload per DOMAIN_CUTOVER.md.
